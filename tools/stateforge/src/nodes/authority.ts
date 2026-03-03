export type Actor = "Human" | "SMITH" | "Service";
export type Ring = "R0" | "R1" | "R2";

const RING_RANK: Record<Ring, number> = {
  R2: 0,
  R1: 1,
  R0: 2,
};

const ESCALATION_TRACKED_ACTIONS = new Set(["start_execution", "finalize_release"]);

export interface AuthorityRequirement {
  actor: Actor;
  ring: Ring;
}

export interface AuthorityModel {
  actors: Actor[];
  rings: Ring[];
  requirements: Record<string, AuthorityRequirement>;
}

export interface AuthorityState {
  ring: Ring;
  lastEscalation: boolean;
}

export interface AuthorityDecision {
  accepted: boolean;
  reason: string;
}

export function requiredAuthority(
  action: string,
  model: AuthorityModel,
): AuthorityRequirement | null {
  return model.requirements[action] ?? null;
}

export function authorizeAction(
  action: string,
  actor: Actor,
  ring: Ring,
  model: AuthorityModel,
): AuthorityDecision {
  const requirement = requiredAuthority(action, model);
  if (!requirement) {
    return { accepted: true, reason: "no_authority_requirement" };
  }

  if (requirement.actor !== actor || requirement.ring !== ring) {
    return { accepted: false, reason: "authority_requirement_failed" };
  }

  return { accepted: true, reason: "authority_requirement_satisfied" };
}

export function initialAuthorityState(): AuthorityState {
  return {
    ring: "R2",
    lastEscalation: false,
  };
}

export function isEscalation(
  prevState: AuthorityState,
  nextState: AuthorityState,
): boolean {
  return RING_RANK[nextState.ring] > RING_RANK[prevState.ring];
}

export function isEscalationTrackedAction(action: string): boolean {
  return ESCALATION_TRACKED_ACTIONS.has(action);
}
