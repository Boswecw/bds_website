export type PipelineState =
  | "IDLE"
  | "PLANNING"
  | "PLAN_REVIEW"
  | "APPROVED"
  | "EXECUTING"
  | "VERIFYING"
  | "EVIDENCE_REVIEW"
  | "RELEASING"
  | "RELEASED"
  | "FAILED";

export interface PipelineModel {
  initial: PipelineState;
  approvalState?: PipelineState;
  terminal: PipelineState[];
  failureTransitions: PipelineState[];
  transitions: Record<string, PipelineState>;
}

export interface PipelineDecision {
  accepted: boolean;
  nextState: PipelineState;
  reason: string;
}

export function isTerminalPipelineState(
  state: PipelineState,
  model: PipelineModel,
): boolean {
  return model.terminal.includes(state);
}

export function approvalState(model: PipelineModel): PipelineState {
  return model.approvalState ?? "APPROVED";
}

export function isApprovedPipelineState(
  state: PipelineState,
  model?: PipelineModel,
): boolean {
  const approved = model ? approvalState(model) : "APPROVED";
  return state === approved;
}

export function applyPipelineAction(
  state: PipelineState,
  action: string,
  model: PipelineModel,
): PipelineDecision {
  if (action === "noop" || action.startsWith("dep_")) {
    return { accepted: true, nextState: state, reason: "non_pipeline_action" };
  }

  if (isTerminalPipelineState(state, model)) {
    return {
      accepted: false,
      nextState: state,
      reason: "terminal_state_no_outgoing",
    };
  }

  if (action === "fail") {
    if (model.failureTransitions.includes(state)) {
      return { accepted: true, nextState: "FAILED", reason: "failure_transition" };
    }

    return {
      accepted: false,
      nextState: state,
      reason: "failure_transition_not_allowed",
    };
  }

  const key = `${state}:${action}`;
  const nextState = model.transitions[key];
  if (!nextState) {
    return {
      accepted: false,
      nextState: state,
      reason: "invalid_pipeline_transition",
    };
  }

  return { accepted: true, nextState, reason: "pipeline_transition_allowed" };
}
