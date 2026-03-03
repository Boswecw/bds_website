export const DEFAULT_COST_SCHEDULE: Readonly<Record<string, number>> = Object.freeze({
  embed: 1,
  llm_call: 3,
  retrieve: 1,
  tool_call: 2,
});

export interface CostModel {
  cap: number;
  total: number;
  maxTotal?: number;
  allowOverCap?: boolean;
  schedule?: Record<string, number>;
}

export interface LastCharge {
  op: string;
  amount: number;
}

export interface CostState {
  cap: number;
  total: number;
  maxTotal: number;
  lastCharge: LastCharge | null;
}

export interface CostStepResult {
  ok: boolean;
  state: CostState;
  note?: string;
}

function normalizeInt(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(value));
}

function normalizeSchedule(raw?: Record<string, number>): Record<string, number> {
  const merged: Record<string, number> = {
    ...DEFAULT_COST_SCHEDULE,
  };

  if (!raw) {
    return merged;
  }

  for (const [key, value] of Object.entries(raw)) {
    merged[key] = normalizeInt(value, 0);
  }
  return merged;
}

function scheduleMaxCharge(schedule: Record<string, number>): number {
  const values = Object.values(schedule);
  return values.length > 0 ? Math.max(...values) : 0;
}

export function isCostAction(action: string): boolean {
  return action.startsWith("cost_charge_");
}

export function costOpFromAction(action: string): string | null {
  const prefix = "cost_charge_";
  if (!action.startsWith(prefix)) {
    return null;
  }

  const op = action.slice(prefix.length);
  return op ? op : null;
}

export function initialCostState(model?: CostModel): CostState {
  const cap = normalizeInt(model?.cap ?? 0, 0);
  const total = normalizeInt(model?.total ?? 0, 0);
  const schedule = normalizeSchedule(model?.schedule);
  const maxTotalFallback = cap + scheduleMaxCharge(schedule);
  const maxTotal = normalizeInt(model?.maxTotal ?? maxTotalFallback, maxTotalFallback);

  return {
    cap,
    total: Math.min(total, maxTotal),
    maxTotal,
    lastCharge: null,
  };
}

export function stepCost(
  state: CostState,
  action: string,
  model?: CostModel,
): CostStepResult {
  if (!isCostAction(action)) {
    return { ok: true, state, note: "non_cost_action" };
  }

  const op = costOpFromAction(action);
  if (!op) {
    return { ok: false, state, note: "invalid_cost_action" };
  }

  const schedule = normalizeSchedule(model?.schedule);
  const amount = schedule[op] ?? 0;
  const candidateTotal = state.total + amount;

  if (candidateTotal > state.maxTotal) {
    return { ok: false, state, note: "cost_total_bound_exceeded" };
  }

  if (!model?.allowOverCap && candidateTotal > state.cap) {
    return { ok: false, state, note: "cost_cap_blocked" };
  }

  return {
    ok: true,
    state: {
      ...state,
      total: candidateTotal,
      lastCharge: {
        op,
        amount,
      },
    },
    note: "cost_charged",
  };
}
