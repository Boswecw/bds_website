import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

import { runChecker } from "./checker";
import { loadModel } from "./index";

function fixturePath(name: string): string {
  const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  return join(toolRoot, "fixtures", name);
}

describe("cost cap invariant", () => {
  test("positive fixture passes when total stays within cap", async () => {
    const model = await loadModel(fixturePath("model.positive.cost_within_cap.json"));

    const result = runChecker(model, {
      maxDepth: model.defaults.maxDepth,
      maxStates: model.defaults.maxStates,
      seed: model.seed,
    });

    expect(result.ok).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  test("negative fixture fails when total exceeds cap with deterministic shortest trace", async () => {
    const model = await loadModel(fixturePath("model.negative.cost_exceeds_cap.json"));

    const config = {
      maxDepth: model.defaults.maxDepth,
      maxStates: model.defaults.maxStates,
      seed: model.seed,
    };

    const first = runChecker(model, config);
    const second = runChecker(model, config);

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);

    const firstViolation = first.violations.find(
      (violation) => violation.invariant === "cost_cap_not_exceeded",
    );
    const secondViolation = second.violations.find(
      (violation) => violation.invariant === "cost_cap_not_exceeded",
    );

    expect(firstViolation).toBeDefined();
    expect(secondViolation).toBeDefined();
    expect(firstViolation?.counterexample.trace.length).toBe(1);
    expect(JSON.stringify(firstViolation?.counterexample.trace)).toBe(
      JSON.stringify(secondViolation?.counterexample.trace),
    );
  });
});
