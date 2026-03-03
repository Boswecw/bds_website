import type { Actor, AuthorityModel, AuthorityState, Ring } from "./nodes/authority";
import {
  authorizeAction,
  initialAuthorityState,
  isEscalation,
  isEscalationTrackedAction,
} from "./nodes/authority";
import type { CircuitBreakerModel, DependencyStatus } from "./nodes/circuit_breaker";
import { applyDependencyAction, isCriticalAction } from "./nodes/circuit_breaker";
import type { CostModel, CostState } from "./nodes/cost";
import { initialCostState, isCostAction, stepCost } from "./nodes/cost";
import type { EvidenceChainModel, EvidenceChainState } from "./nodes/evidence_chain";
import {
  initialEvidenceChainState,
  isEvidenceAction,
  isSealedEvidenceChainValidForRelease,
  releaseRequiresSealedEvidence,
  stepEvidenceChain,
} from "./nodes/evidence_chain";
import type { PipelineModel, PipelineState } from "./nodes/pipeline";
import { applyPipelineAction, isApprovedPipelineState } from "./nodes/pipeline";

export type Action =
  | "noop"
  | "plan"
  | "submit_for_review"
  | "approve_plan"
  | "start_execution"
  | "enter_verifying"
  | "enter_evidence_review"
  | "begin_release"
  | "finalize_release"
  | "fail"
  | "dep_ok"
  | "dep_degraded"
  | "dep_down"
  | "cost_charge_embed"
  | "cost_charge_llm_call"
  | "cost_charge_retrieve"
  | "cost_charge_tool_call"
  | "ev_append_valid"
  | "ev_append_evidence_a"
  | "ev_append_evidence_b"
  | "ev_append_evidence_c"
  | "ev_append_with_nonce_0"
  | "ev_append_with_nonce_1"
  | "ev_append_with_nonce_2"
  | "ev_append_with_nonce_3"
  | "ev_append_invalid_prev"
  | "ev_seal"
  | "ev_mutate_after_seal"
  | "ev_fork";

export const ACTION_ORDER: readonly Action[] = [
  "noop",
  "plan",
  "submit_for_review",
  "approve_plan",
  "start_execution",
  "enter_verifying",
  "enter_evidence_review",
  "begin_release",
  "finalize_release",
  "fail",
  "dep_ok",
  "dep_degraded",
  "dep_down",
  "cost_charge_embed",
  "cost_charge_llm_call",
  "cost_charge_retrieve",
  "cost_charge_tool_call",
  "ev_append_valid",
  "ev_append_evidence_a",
  "ev_append_evidence_b",
  "ev_append_evidence_c",
  "ev_append_with_nonce_0",
  "ev_append_with_nonce_1",
  "ev_append_with_nonce_2",
  "ev_append_with_nonce_3",
  "ev_append_invalid_prev",
  "ev_seal",
  "ev_mutate_after_seal",
  "ev_fork",
];

export const ACTOR_ORDER: readonly Actor[] = ["Human", "SMITH", "Service"];
export const RING_ORDER: readonly Ring[] = ["R0", "R1", "R2"];

export interface ComposedModel {
  version: string;
  seed: string;
  defaults: {
    maxDepth: number;
    maxStates: number;
  };
  actions: Action[];
  nodes: {
    pipeline: PipelineModel;
    authority: AuthorityModel;
    circuit_breaker: CircuitBreakerModel;
  };
  evidence_chain: EvidenceChainModel;
  cost?: CostModel;
}

export interface ComposedState {
  pipeline: PipelineState;
  approvedSeen: boolean;
  dependency: DependencyStatus;
  authority: AuthorityState;
  evidence_chain: EvidenceChainState;
  cost: CostState;
}

export interface ActionAttempt {
  action: Action;
  actor: Actor;
  ring: Ring;
}

export interface TransitionOutcome {
  accepted: boolean;
  reason: string;
  nextState: ComposedState;
}

export function initialState(model: ComposedModel): ComposedState {
  const pipeline = model.nodes.pipeline.initial;
  return {
    pipeline,
    approvedSeen: isApprovedPipelineState(pipeline, model.nodes.pipeline),
    dependency: model.nodes.circuit_breaker.initial,
    authority: initialAuthorityState(),
    evidence_chain: initialEvidenceChainState(model.evidence_chain),
    cost: initialCostState(model.cost),
  };
}

export function stateKey(state: ComposedState): string {
  const ev = state.evidence_chain;
  return [
    state.pipeline,
    state.approvedSeen ? "1" : "0",
    state.dependency,
    state.authority.ring,
    state.authority.lastEscalation ? "1" : "0",
    ev.headHash ?? "_",
    ev.sealed ? "1" : "0",
    String(ev.length),
    ev.forked ? "1" : "0",
    ev.sealedHeadHash ?? "_",
    ev.expectedPrev ?? "_",
    ev.lastAppendType,
    ev.lastAppendAccepted ? "1" : "0",
    ev.lastAppendPrevMatchesExpected ? "1" : "0",
    String(ev.nextNonce),
    ev.seenNonces.length > 0 ? ev.seenNonces.join(",") : "_",
    ev.lastAppend ? `${ev.lastAppend.nonce}:${ev.lastAppend.kind}` : "_",
    String(state.cost.cap),
    String(state.cost.total),
    String(state.cost.maxTotal),
    state.cost.lastCharge ? `${state.cost.lastCharge.op}:${state.cost.lastCharge.amount}` : "_",
  ].join("|");
}

export function orderedState(state: ComposedState): ComposedState {
  return {
    pipeline: state.pipeline,
    approvedSeen: state.approvedSeen,
    dependency: state.dependency,
    authority: {
      ring: state.authority.ring,
      lastEscalation: state.authority.lastEscalation,
    },
    evidence_chain: {
      headHash: state.evidence_chain.headHash,
      sealed: state.evidence_chain.sealed,
      length: state.evidence_chain.length,
      forked: state.evidence_chain.forked,
      sealedHeadHash: state.evidence_chain.sealedHeadHash,
      expectedPrev: state.evidence_chain.expectedPrev,
      lastAppendType: state.evidence_chain.lastAppendType,
      lastAppendAccepted: state.evidence_chain.lastAppendAccepted,
      lastAppendPrevMatchesExpected: state.evidence_chain.lastAppendPrevMatchesExpected,
      nextNonce: state.evidence_chain.nextNonce,
      seenNonces: [...state.evidence_chain.seenNonces].sort((a, b) => a - b),
      lastAppend: state.evidence_chain.lastAppend
        ? {
            nonce: state.evidence_chain.lastAppend.nonce,
            kind: state.evidence_chain.lastAppend.kind,
          }
        : null,
    },
    cost: {
      cap: state.cost.cap,
      total: state.cost.total,
      maxTotal: state.cost.maxTotal,
      lastCharge: state.cost.lastCharge
        ? {
            op: state.cost.lastCharge.op,
            amount: state.cost.lastCharge.amount,
          }
        : null,
    },
  };
}

export function applyComposedAction(
  state: ComposedState,
  attempt: ActionAttempt,
  model: ComposedModel,
): TransitionOutcome {
  const dependencyDecision = applyDependencyAction(state.dependency, attempt.action);

  if (attempt.action.startsWith("dep_")) {
    return {
      accepted: dependencyDecision.accepted,
      reason: dependencyDecision.reason,
      nextState: orderedState({
        pipeline: state.pipeline,
        approvedSeen: state.approvedSeen,
        dependency: dependencyDecision.nextStatus,
        authority: {
          ring: state.authority.ring,
          lastEscalation: false,
        },
        evidence_chain: state.evidence_chain,
        cost: state.cost,
      }),
    };
  }

  if (isCostAction(attempt.action)) {
    const costDecision = stepCost(state.cost, attempt.action, model.cost);
    return {
      accepted: costDecision.ok,
      reason: costDecision.note ?? "cost_action",
      nextState: orderedState({
        pipeline: state.pipeline,
        approvedSeen: state.approvedSeen,
        dependency: state.dependency,
        authority: {
          ring: state.authority.ring,
          lastEscalation: false,
        },
        evidence_chain: state.evidence_chain,
        cost: costDecision.state,
      }),
    };
  }

  if (isEvidenceAction(attempt.action)) {
    const evidenceDecision = stepEvidenceChain(
      state.evidence_chain,
      attempt.action,
      model.evidence_chain,
    );
    return {
      accepted: evidenceDecision.ok,
      reason: evidenceDecision.note ?? "evidence_action",
      nextState: orderedState({
        pipeline: state.pipeline,
        approvedSeen: state.approvedSeen,
        dependency: state.dependency,
        authority: {
          ring: state.authority.ring,
          lastEscalation: false,
        },
        evidence_chain: evidenceDecision.state,
        cost: state.cost,
      }),
    };
  }

  const authorityDecision = authorizeAction(
    attempt.action,
    attempt.actor,
    attempt.ring,
    model.nodes.authority,
  );
  if (!authorityDecision.accepted) {
    return {
      accepted: false,
      reason: authorityDecision.reason,
      nextState: orderedState(state),
    };
  }

  if (
    state.dependency === "DOWN" &&
    isCriticalAction(attempt.action, model.nodes.circuit_breaker)
  ) {
    return {
      accepted: false,
      reason: "dependency_down_fail_closed",
      nextState: orderedState(state),
    };
  }

  if (
    attempt.action === "finalize_release" &&
    releaseRequiresSealedEvidence(model.evidence_chain) &&
    !isSealedEvidenceChainValidForRelease(state.evidence_chain)
  ) {
    return {
      accepted: false,
      reason: "finalize_requires_sealed_evidence_chain",
      nextState: orderedState(state),
    };
  }

  const pipelineDecision = applyPipelineAction(
    state.pipeline,
    attempt.action,
    model.nodes.pipeline,
  );
  if (!pipelineDecision.accepted) {
    return {
      accepted: false,
      reason: pipelineDecision.reason,
      nextState: orderedState(state),
    };
  }

  const nextState: ComposedState = {
    pipeline: pipelineDecision.nextState,
    approvedSeen:
      state.approvedSeen ||
      isApprovedPipelineState(state.pipeline, model.nodes.pipeline) ||
      isApprovedPipelineState(pipelineDecision.nextState, model.nodes.pipeline),
    dependency: state.dependency,
    authority: (() => {
      if (!isEscalationTrackedAction(attempt.action)) {
        return {
          ring: state.authority.ring,
          lastEscalation: false,
        };
      }

      const candidate: AuthorityState = {
        ring: attempt.ring,
        lastEscalation: false,
      };
      return {
        ring: candidate.ring,
        lastEscalation: isEscalation(state.authority, candidate),
      };
    })(),
    evidence_chain: state.evidence_chain,
    cost: state.cost,
  };

  return {
    accepted: true,
    reason: pipelineDecision.reason,
    nextState: orderedState(nextState),
  };
}
