import {
  ACTION_ORDER,
  ACTOR_ORDER,
  RING_ORDER,
  applyComposedAction,
  initialState,
  orderedState,
  stateKey,
  type Action,
  type ActionAttempt,
  type ComposedModel,
  type ComposedState,
} from "./compose";
import { REQUIRED_INVARIANTS, type InvariantViolation } from "./invariants";

interface VisitedNode {
  state: ComposedState;
  depth: number;
  parentKey: string | null;
  via: ActionAttempt | null;
}

interface TraceEdge {
  action: Action;
  actor: ActionAttempt["actor"];
  ring: ActionAttempt["ring"];
  state: ComposedState;
}

interface SuccessorAttempt extends ActionAttempt {
  id: string;
}

interface StoredViolation {
  violation: CheckerViolation;
  traceSignature: string;
}

interface DepthCheckResult {
  found: boolean;
  exhausted: boolean;
}

export interface TraceStep {
  step: number;
  action: Action;
  actor: ActionAttempt["actor"];
  ring: ActionAttempt["ring"];
  state: ComposedState;
}

export interface CheckerViolation extends InvariantViolation {
  counterexample_depth: number;
  counterexample: {
    trace: TraceStep[];
  };
}

export interface CheckerConfig {
  maxDepth: number;
  maxStates: number;
  seed: string;
  verifyShortest?: boolean;
}

export interface CheckerResult {
  ok: boolean;
  statesExplored: number;
  maxDepthReached: number;
  violations: CheckerViolation[];
  shortestValidation: {
    enabled: boolean;
    ok: boolean;
    reason: string | null;
  };
}

function compareLex(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function orderedActions(model: ComposedModel): readonly Action[] {
  if (model.actions.length === 0) {
    return ACTION_ORDER;
  }

  const wanted = new Set(model.actions);
  return ACTION_ORDER.filter((action) => wanted.has(action));
}

function orderedSuccessorAttempts(actions: readonly Action[]): readonly SuccessorAttempt[] {
  const attempts: SuccessorAttempt[] = [];

  for (const action of actions) {
    for (const actor of ACTOR_ORDER) {
      for (const ring of RING_ORDER) {
        attempts.push({
          id: `${action}|${actor}|${ring}`,
          action,
          actor,
          ring,
        });
      }
    }
  }

  attempts.sort((a, b) => compareLex(a.id, b.id));
  return attempts;
}

function buildAcceptedPath(
  visited: Map<string, VisitedNode>,
  key: string,
): TraceEdge[] {
  const reversed: TraceEdge[] = [];
  let cursorKey: string | null = key;

  while (cursorKey !== null) {
    const node = visited.get(cursorKey);
    if (!node || !node.parentKey || !node.via) {
      break;
    }

    reversed.push({
      action: node.via.action,
      actor: node.via.actor,
      ring: node.via.ring,
      state: orderedState(node.state),
    });
    cursorKey = node.parentKey;
  }

  return reversed.reverse();
}

function buildTrace(
  visited: Map<string, VisitedNode>,
  fromKey: string,
  transition: TraceEdge,
): TraceStep[] {
  const path = buildAcceptedPath(visited, fromKey);
  path.push(transition);

  return path.map((edge, index) => ({
    step: index,
    action: edge.action,
    actor: edge.actor,
    ring: edge.ring,
    state: orderedState(edge.state),
  }));
}

function traceSignature(trace: TraceStep[]): string {
  return trace
    .map(
      (entry) =>
        `${entry.step}|${entry.action}|${entry.actor}|${entry.ring}|${stateKey(entry.state)}`,
    )
    .join(">");
}

function sortViolations(violations: CheckerViolation[]): CheckerViolation[] {
  return [...violations].sort((a, b) => {
    const invariantCmp = compareLex(a.invariant, b.invariant);
    if (invariantCmp !== 0) {
      return invariantCmp;
    }

    const messageCmp = compareLex(a.message, b.message);
    if (messageCmp !== 0) {
      return messageCmp;
    }

    if (a.counterexample_depth !== b.counterexample_depth) {
      return a.counterexample_depth - b.counterexample_depth;
    }

    return compareLex(
      traceSignature(a.counterexample.trace),
      traceSignature(b.counterexample.trace),
    );
  });
}

function searchViolationBeforeDepth(
  model: ComposedModel,
  config: CheckerConfig,
  attempts: readonly SuccessorAttempt[],
  targetKey: string,
  maxViolationDepth: number,
): DepthCheckResult {
  if (maxViolationDepth <= 0) {
    return { found: false, exhausted: true };
  }

  const start = initialState(model);
  const startKey = stateKey(start);
  const queue: string[] = [startKey];
  const visited = new Map<string, VisitedNode>();
  visited.set(startKey, {
    state: start,
    depth: 0,
    parentKey: null,
    via: null,
  });

  while (queue.length > 0) {
    const currentKey = queue.shift();
    if (!currentKey) {
      break;
    }

    const current = visited.get(currentKey);
    if (!current) {
      continue;
    }

    if (current.depth >= maxViolationDepth) {
      continue;
    }

    for (const attempt of attempts) {
      const outcome = applyComposedAction(current.state, attempt, model);
      const nextState = orderedState(outcome.nextState);

      for (const invariant of REQUIRED_INVARIANTS) {
        const finding = invariant.evaluate({
          from: current.state,
          to: nextState,
          attempt,
          outcome,
        });

        if (!finding) {
          continue;
        }

        const key = `${finding.invariant}|${finding.message}`;
        if (key === targetKey) {
          return { found: true, exhausted: true };
        }
      }

      if (!outcome.accepted) {
        continue;
      }

      const nextKey = stateKey(nextState);
      if (visited.has(nextKey)) {
        continue;
      }

      if (visited.size >= config.maxStates) {
        return { found: false, exhausted: false };
      }

      visited.set(nextKey, {
        state: nextState,
        depth: current.depth + 1,
        parentKey: currentKey,
        via: attempt,
      });
      queue.push(nextKey);
    }
  }

  return { found: false, exhausted: true };
}

function validateShortestCounterexample(
  model: ComposedModel,
  config: CheckerConfig,
  attempts: readonly SuccessorAttempt[],
  violation: CheckerViolation,
): { ok: boolean; reason: string | null } {
  const targetKey = `${violation.invariant}|${violation.message}`;
  const depthResult = searchViolationBeforeDepth(
    model,
    config,
    attempts,
    targetKey,
    violation.counterexample_depth - 1,
  );

  if (depthResult.found) {
    return {
      ok: false,
      reason: `shorter_counterexample_exists:${violation.invariant}`,
    };
  }

  if (!depthResult.exhausted) {
    return {
      ok: false,
      reason: `shortest_check_inconclusive_state_bound:${violation.invariant}`,
    };
  }

  return { ok: true, reason: null };
}

export function runChecker(
  model: ComposedModel,
  config: CheckerConfig,
): CheckerResult {
  const start = initialState(model);
  const startKey = stateKey(start);

  const queue: string[] = [startKey];
  const visited = new Map<string, VisitedNode>();
  visited.set(startKey, {
    state: start,
    depth: 0,
    parentKey: null,
    via: null,
  });

  const actions = orderedActions(model);
  const attempts = orderedSuccessorAttempts(actions);
  const violations = new Map<string, StoredViolation>();

  let statesExplored = 0;
  let maxDepthReached = 0;
  let exceededBounds = false;
  let lastDequeuedDepth = -1;
  let earliestViolationDepth: number | null = null;

  exploration: while (queue.length > 0) {
    const currentKey = queue.shift();
    if (!currentKey) {
      break;
    }

    const current = visited.get(currentKey);
    if (!current) {
      continue;
    }

    if (current.depth < lastDequeuedDepth) {
      const message = `BFS layering violated at depth ${current.depth} after ${lastDequeuedDepth}`;
      const trace = buildTrace(visited, currentKey, {
        action: "noop",
        actor: "Human",
        ring: "R0",
        state: orderedState(current.state),
      });
      const key = `internal_bfs_layering|${message}`;
      violations.set(key, {
        violation: {
          invariant: "internal_bfs_layering",
          message,
          counterexample_depth: trace.length,
          counterexample: { trace },
        },
        traceSignature: traceSignature(trace),
      });
      break;
    }
    lastDequeuedDepth = current.depth;

    if (
      earliestViolationDepth !== null &&
      current.depth < Math.max(earliestViolationDepth - 1, 0)
    ) {
      const message = `Violation depth ordering broken at depth ${current.depth}, earliest violation depth ${earliestViolationDepth}`;
      const trace = buildTrace(visited, currentKey, {
        action: "noop",
        actor: "Human",
        ring: "R0",
        state: orderedState(current.state),
      });
      const key = `internal_violation_layering|${message}`;
      violations.set(key, {
        violation: {
          invariant: "internal_violation_layering",
          message,
          counterexample_depth: trace.length,
          counterexample: { trace },
        },
        traceSignature: traceSignature(trace),
      });
      break;
    }

    statesExplored += 1;
    maxDepthReached = Math.max(maxDepthReached, current.depth);
    if (current.depth >= config.maxDepth) {
      continue;
    }

    for (const attempt of attempts) {
      const outcome = applyComposedAction(current.state, attempt, model);
      const nextState = orderedState(outcome.nextState);

      for (const invariant of REQUIRED_INVARIANTS) {
        const finding = invariant.evaluate({
          from: current.state,
          to: nextState,
          attempt,
          outcome,
        });
        if (!finding) {
          continue;
        }

        const violationDepth = current.depth + 1;
        if (earliestViolationDepth === null || violationDepth < earliestViolationDepth) {
          earliestViolationDepth = violationDepth;
        }

        const trace = buildTrace(visited, currentKey, {
          action: attempt.action,
          actor: attempt.actor,
          ring: attempt.ring,
          state: nextState,
        });
        const signature = traceSignature(trace);
        const key = `${finding.invariant}|${finding.message}`;
        const existing = violations.get(key);

        if (!existing) {
          violations.set(key, {
            violation: {
              invariant: finding.invariant,
              message: finding.message,
              counterexample_depth: violationDepth,
              counterexample: { trace },
            },
            traceSignature: signature,
          });
          continue;
        }

        const existingDepth = existing.violation.counterexample_depth;
        if (
          violationDepth < existingDepth ||
          (violationDepth === existingDepth && compareLex(signature, existing.traceSignature) < 0)
        ) {
          violations.set(key, {
            violation: {
              invariant: finding.invariant,
              message: finding.message,
              counterexample_depth: violationDepth,
              counterexample: { trace },
            },
            traceSignature: signature,
          });
        }
      }

      if (!outcome.accepted) {
        continue;
      }

      const nextKey = stateKey(nextState);
      if (visited.has(nextKey)) {
        continue;
      }

      if (visited.size >= config.maxStates) {
        exceededBounds = true;
        break exploration;
      }

      visited.set(nextKey, {
        state: nextState,
        depth: current.depth + 1,
        parentKey: currentKey,
        via: attempt,
      });
      queue.push(nextKey);
    }
  }

  if (exceededBounds) {
    const message = `State bound exceeded at maxStates=${config.maxStates}`;
    const finalState = queue.length > 0 ? visited.get(queue[0])?.state ?? start : start;
    const trace = buildTrace(visited, startKey, {
      action: "noop",
      actor: "Human",
      ring: "R0",
      state: orderedState(finalState),
    });
    const key = `exploration_bounds|${message}`;
    const signature = traceSignature(trace);
    const existing = violations.get(key);
    if (
      !existing ||
      trace.length < existing.violation.counterexample_depth ||
      (trace.length === existing.violation.counterexample_depth &&
        compareLex(signature, existing.traceSignature) < 0)
    ) {
      violations.set(key, {
        violation: {
          invariant: "exploration_bounds",
          message,
          counterexample_depth: trace.length,
          counterexample: { trace },
        },
        traceSignature: signature,
      });
    }
  }

  const sortedViolations = sortViolations([...violations.values()].map((entry) => entry.violation));
  const shortestValidationEnabled = Boolean(config.verifyShortest);
  let shortestValidationOk = true;
  let shortestValidationReason: string | null = null;

  if (shortestValidationEnabled) {
    for (const violation of sortedViolations) {
      const shortestCheck = validateShortestCounterexample(model, config, attempts, violation);
      if (!shortestCheck.ok) {
        shortestValidationOk = false;
        shortestValidationReason = shortestCheck.reason;
        break;
      }
    }
  }

  return {
    ok: sortedViolations.length === 0,
    statesExplored,
    maxDepthReached,
    violations: sortedViolations,
    shortestValidation: {
      enabled: shortestValidationEnabled,
      ok: shortestValidationOk,
      reason: shortestValidationReason,
    },
  };
}
