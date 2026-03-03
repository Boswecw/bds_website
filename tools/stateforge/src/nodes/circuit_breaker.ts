export type DependencyStatus = "OK" | "DEGRADED" | "DOWN";

export interface CircuitBreakerModel {
  initial: DependencyStatus;
  statuses: DependencyStatus[];
  criticalActions: string[];
}

export interface DependencyDecision {
  accepted: boolean;
  nextStatus: DependencyStatus;
  reason: string;
}

export function isCriticalAction(
  action: string,
  model: CircuitBreakerModel,
): boolean {
  return model.criticalActions.includes(action);
}

export function applyDependencyAction(
  status: DependencyStatus,
  action: string,
): DependencyDecision {
  switch (action) {
    case "dep_ok":
      return { accepted: true, nextStatus: "OK", reason: "dependency_set_ok" };
    case "dep_degraded":
      return {
        accepted: true,
        nextStatus: "DEGRADED",
        reason: "dependency_set_degraded",
      };
    case "dep_down":
      return { accepted: true, nextStatus: "DOWN", reason: "dependency_set_down" };
    default:
      return { accepted: true, nextStatus: status, reason: "dependency_unchanged" };
  }
}
