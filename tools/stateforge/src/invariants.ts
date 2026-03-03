import type { ActionAttempt, ComposedState, TransitionOutcome } from "./compose";
import { isSealedEvidenceChainValidForRelease } from "./nodes/evidence_chain";
import { isApprovedPipelineState } from "./nodes/pipeline";

export interface InvariantContext {
  from: ComposedState;
  to: ComposedState;
  attempt: ActionAttempt;
  outcome: TransitionOutcome;
}

export interface InvariantViolation {
  invariant: string;
  message: string;
}

export interface InvariantDefinition {
  name: string;
  evaluate: (context: InvariantContext) => InvariantViolation | null;
}

const CRITICAL_DOWN_ACTIONS = new Set([
  "start_execution",
  "begin_release",
  "finalize_release",
]);

export const REQUIRED_INVARIANTS: readonly InvariantDefinition[] = [
  {
    name: "no_bypass",
    evaluate: ({ to, outcome }) => {
      if (outcome.accepted && to.pipeline === "EXECUTING" && !to.approvedSeen) {
        return {
          invariant: "no_bypass",
          message: "Reached EXECUTING without APPROVED",
        };
      }
      return null;
    },
  },
  {
    name: "terminal_means_terminal",
    evaluate: ({ from, to, outcome }) => {
      const fromTerminal = from.pipeline === "FAILED" || from.pipeline === "RELEASED";
      if (fromTerminal && outcome.accepted && to.pipeline !== from.pipeline) {
        return {
          invariant: "terminal_means_terminal",
          message: `Terminal state ${from.pipeline} transitioned to ${to.pipeline}`,
        };
      }
      return null;
    },
  },
  {
    name: "human_approval",
    evaluate: ({ attempt, outcome }) => {
      if (
        attempt.action === "approve_plan" &&
        outcome.accepted &&
        (attempt.actor !== "Human" || attempt.ring !== "R0")
      ) {
        return {
          invariant: "human_approval",
          message: "approve_plan accepted without Human R0 authority",
        };
      }
      return null;
    },
  },
  {
    name: "release_gated",
    evaluate: ({ from, attempt, outcome }) => {
      if (attempt.action !== "finalize_release" || !outcome.accepted) {
        return null;
      }

      if (
        from.pipeline !== "RELEASING" ||
        attempt.actor !== "SMITH" ||
        attempt.ring !== "R1"
      ) {
        return {
          invariant: "release_gated",
          message: "finalize_release accepted outside RELEASING with SMITH R1",
        };
      }

      return null;
    },
  },
  {
    name: "fail_closed_dependency",
    evaluate: ({ from, attempt, outcome }) => {
      if (
        from.dependency === "DOWN" &&
        CRITICAL_DOWN_ACTIONS.has(attempt.action) &&
        outcome.accepted
      ) {
        return {
          invariant: "fail_closed_dependency",
          message: `Critical action '${attempt.action}' accepted while dependency DOWN`,
        };
      }
      return null;
    },
  },
  {
    name: "evidence_no_forks",
    evaluate: ({ from, to, outcome }) => {
      if (outcome.accepted && !from.evidence_chain.forked && to.evidence_chain.forked) {
        return {
          invariant: "evidence_no_forks",
          message: "Evidence chain fork detected",
        };
      }
      return null;
    },
  },
  {
    name: "evidence_sealed_immutable",
    evaluate: ({ from, to, outcome }) => {
      const wasStableOrUnsealed =
        !from.evidence_chain.sealed ||
        from.evidence_chain.sealedHeadHash === from.evidence_chain.headHash;
      const nowMutated =
        to.evidence_chain.sealed &&
        to.evidence_chain.sealedHeadHash !== to.evidence_chain.headHash;

      if (outcome.accepted && wasStableOrUnsealed && nowMutated) {
        return {
          invariant: "evidence_sealed_immutable",
          message: "Sealed evidence head mutated",
        };
      }
      return null;
    },
  },
  {
    name: "evidence_append_only",
    evaluate: ({ attempt, to, outcome }) => {
      if (
        attempt.action === "ev_append_invalid_prev" &&
        outcome.accepted &&
        to.evidence_chain.lastAppendType === "invalid_prev" &&
        to.evidence_chain.lastAppendAccepted &&
        !to.evidence_chain.lastAppendPrevMatchesExpected
      ) {
        return {
          invariant: "evidence_append_only",
          message: "Invalid previous-hash append accepted",
        };
      }
      return null;
    },
  },
  {
    name: "evidence_nonce_no_replay",
    evaluate: ({ to, outcome }) => {
      if (!outcome.accepted || !to.evidence_chain.lastAppend) {
        return null;
      }

      if (to.evidence_chain.lastAppend.kind.endsWith("_replay")) {
        return {
          invariant: "evidence_nonce_no_replay",
          message: `Evidence nonce replay detected for nonce ${to.evidence_chain.lastAppend.nonce}`,
        };
      }

      return null;
    },
  },
  {
    name: "release_requires_sealed_evidence",
    evaluate: ({ to }) => {
      if (to.pipeline !== "RELEASED") {
        return null;
      }

      if (!isSealedEvidenceChainValidForRelease(to.evidence_chain)) {
        return {
          invariant: "release_requires_sealed_evidence",
          message: "Release finalized without sealed evidence chain",
        };
      }
      return null;
    },
  },
  {
    name: "escalation_requires_prior_approval",
    evaluate: ({ from, to, outcome }) => {
      if (!outcome.accepted || !to.authority.lastEscalation) {
        return null;
      }

      if (!isApprovedPipelineState(from.pipeline)) {
        return {
          invariant: "escalation_requires_prior_approval",
          message: "Authority escalation occurred before pipeline approval",
        };
      }
      return null;
    },
  },
  {
    name: "cost_cap_not_exceeded",
    evaluate: ({ to, outcome }) => {
      if (!outcome.accepted) {
        return null;
      }

      if (to.cost.total > to.cost.cap) {
        return {
          invariant: "cost_cap_not_exceeded",
          message: `Cost cap exceeded: total ${to.cost.total} > cap ${to.cost.cap}`,
        };
      }

      return null;
    },
  },
];
