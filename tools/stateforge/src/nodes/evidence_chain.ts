import { createHash } from "node:crypto";

export const MAX_NONCES = 8;

export interface EvidenceChainModel {
  maxLen: number;
  hashAlg: string;
  allowSealEmpty: boolean;
  actions: string[];
  releaseRequiresSealed?: boolean;
  nextNonce?: number;
  seenNonces?: number[];
}

export type EvidenceAppendType = "none" | "valid" | "invalid_prev";

export interface EvidenceLastAppend {
  nonce: number;
  kind: string;
}

export type EvidenceChainState = {
  headHash: string | null;
  sealed: boolean;
  length: number;
  forked: boolean;
  sealedHeadHash: string | null;
  expectedPrev: string | null;
  lastAppendType: EvidenceAppendType;
  lastAppendAccepted: boolean;
  lastAppendPrevMatchesExpected: boolean;
  nextNonce: number;
  seenNonces: number[];
  lastAppend: EvidenceLastAppend | null;
};

export interface EvidenceStepResult {
  ok: boolean;
  state: EvidenceChainState;
  note?: string;
}

interface AppendAttempt {
  nonce: number;
  kind: string;
  appendType: Exclude<EvidenceAppendType, "none">;
  prev: string | null;
  prevMatchesExpected: boolean;
  headTag: string;
  advanceNonce: boolean;
}

function normalizeNonce(value: number): number | null {
  if (!Number.isFinite(value)) {
    return null;
  }
  const nonce = Math.trunc(value);
  if (nonce < 0 || nonce >= MAX_NONCES) {
    return null;
  }
  return nonce;
}

function normalizeSeenNonces(raw: readonly number[] | undefined): number[] {
  if (!raw) {
    return [];
  }

  const seen = new Set<number>();
  for (const value of raw) {
    const nonce = normalizeNonce(value);
    if (nonce !== null) {
      seen.add(nonce);
    }
  }

  return [...seen].sort((a, b) => a - b);
}

function addSeenNonce(seenNonces: readonly number[], nonce: number): number[] {
  if (seenNonces.includes(nonce)) {
    return [...seenNonces];
  }

  const next = [...seenNonces, nonce];
  next.sort((a, b) => a - b);
  return next;
}

export function isSealedEvidenceChainValidForRelease(state: EvidenceChainState): boolean {
  return (
    state.sealed &&
    state.length > 0 &&
    !state.forked &&
    state.headHash !== null &&
    state.sealedHeadHash === state.headHash
  );
}

export function releaseRequiresSealedEvidence(model: EvidenceChainModel): boolean {
  return model.releaseRequiresSealed ?? true;
}

function resetAppendTracking(state: EvidenceChainState): EvidenceChainState {
  return {
    ...state,
    lastAppendType: "none",
    lastAppendAccepted: false,
    lastAppendPrevMatchesExpected: true,
    lastAppend: null,
  };
}

function reject(state: EvidenceChainState, note: string): EvidenceStepResult {
  return {
    ok: false,
    state,
    note,
  };
}

function applyAppend(
  state: EvidenceChainState,
  attempt: AppendAttempt,
  model: EvidenceChainModel,
): EvidenceStepResult {
  if (state.sealed) {
    return reject(state, "cannot_append_after_seal");
  }
  if (state.length >= model.maxLen) {
    return reject(state, "evidence_max_len_reached");
  }

  const nonce = normalizeNonce(attempt.nonce);
  if (nonce === null) {
    return reject(state, "evidence_nonce_bound_reached");
  }

  const seenAlready = state.seenNonces.includes(nonce);
  const nextSeenNonces = addSeenNonce(state.seenNonces, nonce);
  const nextHead = hashNext(attempt.prev, `${attempt.headTag}:nonce:${nonce}`, state.length);

  const rawNextNonce = attempt.advanceNonce ? nonce + 1 : state.nextNonce;
  const nextNonce = Math.min(Math.max(rawNextNonce, 0), MAX_NONCES);

  return {
    ok: true,
    state: {
      ...state,
      headHash: nextHead,
      length: state.length + 1,
      expectedPrev: nextHead,
      lastAppendType: attempt.appendType,
      lastAppendAccepted: true,
      lastAppendPrevMatchesExpected: attempt.prevMatchesExpected,
      nextNonce,
      seenNonces: nextSeenNonces,
      lastAppend: {
        nonce,
        kind: seenAlready ? `${attempt.kind}_replay` : attempt.kind,
      },
    },
    note: "evidence_append_accepted",
  };
}

function parseReplayNonceAction(action: string): number | null {
  const prefix = "ev_append_with_nonce_";
  if (!action.startsWith(prefix)) {
    return null;
  }

  const nonceRaw = action.slice(prefix.length);
  if (!/^\d+$/.test(nonceRaw)) {
    return null;
  }

  return Number.parseInt(nonceRaw, 10);
}

function appendKind(action: string): string {
  switch (action) {
    case "ev_append_valid":
      return "append_valid";
    case "ev_append_evidence_a":
      return "append_evidence_a";
    case "ev_append_evidence_b":
      return "append_evidence_b";
    case "ev_append_evidence_c":
      return "append_evidence_c";
    default:
      return "append_with_nonce";
  }
}

export function initialEvidenceChainState(model?: EvidenceChainModel): EvidenceChainState {
  const nextNonceRaw = model?.nextNonce ?? 0;
  const normalizedNextNonce =
    typeof nextNonceRaw === "number" && Number.isFinite(nextNonceRaw)
      ? Math.min(Math.max(Math.trunc(nextNonceRaw), 0), MAX_NONCES)
      : 0;

  return {
    headHash: null,
    sealed: false,
    length: 0,
    forked: false,
    sealedHeadHash: null,
    expectedPrev: null,
    lastAppendType: "none",
    lastAppendAccepted: false,
    lastAppendPrevMatchesExpected: true,
    nextNonce: normalizedNextNonce,
    seenNonces: normalizeSeenNonces(model?.seenNonces),
    lastAppend: null,
  };
}

export function hashNext(prev: string | null, tag: string, idx: number): string {
  const payload = `${prev ?? "GENESIS"}:${tag}:${idx}`;
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

export function isEvidenceAction(action: string): boolean {
  return action.startsWith("ev_");
}

export function stepEvidenceChain(
  state: EvidenceChainState,
  action: string,
  model: EvidenceChainModel,
): EvidenceStepResult {
  if (!isEvidenceAction(action)) {
    return { ok: true, state: resetAppendTracking(state), note: "non_evidence_action" };
  }

  if (!model.actions.includes(action)) {
    return reject(state, "evidence_action_not_allowed_by_model");
  }

  if (model.hashAlg !== "sha256") {
    return reject(state, "unsupported_evidence_hash_algorithm");
  }

  switch (action) {
    case "ev_append_valid":
    case "ev_append_evidence_a":
    case "ev_append_evidence_b":
    case "ev_append_evidence_c": {
      return applyAppend(
        state,
        {
          nonce: state.nextNonce,
          kind: appendKind(action),
          appendType: "valid",
          prev: state.headHash,
          prevMatchesExpected: state.headHash === state.expectedPrev,
          headTag: appendKind(action),
          advanceNonce: true,
        },
        model,
      );
    }

    case "ev_append_invalid_prev": {
      const wrongPrev =
        state.headHash === null ? "WRONG_PREV_GENESIS" : `${state.headHash}:WRONG_PREV`;
      return applyAppend(
        state,
        {
          nonce: state.nextNonce,
          kind: "append_invalid_prev",
          appendType: "invalid_prev",
          prev: wrongPrev,
          prevMatchesExpected: wrongPrev === state.expectedPrev,
          headTag: "append_invalid_prev",
          advanceNonce: true,
        },
        model,
      );
    }

    case "ev_seal": {
      if (state.sealed) {
        return reject(state, "already_sealed");
      }
      if (!model.allowSealEmpty && state.length === 0) {
        return reject(state, "cannot_seal_empty_chain");
      }

      return {
        ok: true,
        state: {
          ...resetAppendTracking(state),
          sealed: true,
          sealedHeadHash: state.headHash,
        },
        note: "evidence_chain_sealed",
      };
    }

    case "ev_mutate_after_seal": {
      if (!state.sealed) {
        return reject(state, "must_be_sealed_before_mutation_attempt");
      }

      const mutatedHead = hashNext(state.headHash, "mutate", state.length);
      return {
        ok: true,
        state: {
          ...resetAppendTracking(state),
          headHash: mutatedHead,
          expectedPrev: mutatedHead,
        },
        note: "post_seal_mutation_attempted",
      };
    }

    case "ev_fork": {
      if (state.length === 0) {
        return reject(state, "cannot_fork_empty_chain");
      }

      const forkHead = state.sealed
        ? state.headHash
        : hashNext(state.headHash, "fork", state.length);
      return {
        ok: true,
        state: {
          ...resetAppendTracking(state),
          forked: true,
          headHash: forkHead,
          expectedPrev: forkHead,
        },
        note: "evidence_fork_created",
      };
    }

    default: {
      const explicitNonce = parseReplayNonceAction(action);
      if (explicitNonce === null) {
        return reject(state, "unknown_evidence_action");
      }

      return applyAppend(
        state,
        {
          nonce: explicitNonce,
          kind: "append_with_nonce",
          appendType: "valid",
          prev: state.headHash,
          prevMatchesExpected: state.headHash === state.expectedPrev,
          headTag: `append_with_nonce_${explicitNonce}`,
          advanceNonce: false,
        },
        model,
      );
    }
  }
}
