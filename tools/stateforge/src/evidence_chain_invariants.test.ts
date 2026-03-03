import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

import { runChecker } from "./checker";
import type { ComposedModel } from "./compose";
import { loadModel } from "./index";

function checkerConfig(model: ComposedModel) {
  return {
    maxDepth: model.defaults.maxDepth,
    maxStates: model.defaults.maxStates,
    seed: model.seed,
  };
}

describe("evidence chain invariants", () => {
  test("generated model passes", async () => {
    const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const model = await loadModel(join(toolRoot, "fixtures", "model.generated.json"));
    const result = runChecker(model, checkerConfig(model));

    expect(result.ok).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  test("invalid previous hash append is detected deterministically", async () => {
    const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const baseModel = await loadModel(join(toolRoot, "fixtures", "model.generated.json"));

    const violationModel: ComposedModel = {
      ...baseModel,
      actions: ["ev_append_invalid_prev"],
      evidence_chain: {
        ...baseModel.evidence_chain,
        maxLen: 1,
      },
    };

    const first = runChecker(violationModel, checkerConfig(violationModel));
    const second = runChecker(violationModel, checkerConfig(violationModel));

    expect(first.ok).toBe(false);
    expect(second.ok).toBe(false);

    const firstViolation = first.violations.find(
      (violation) => violation.invariant === "evidence_append_only",
    );
    const secondViolation = second.violations.find(
      (violation) => violation.invariant === "evidence_append_only",
    );

    expect(firstViolation).toBeDefined();
    expect(secondViolation).toBeDefined();
    expect(firstViolation?.message).toBe("Invalid previous-hash append accepted");
    expect(JSON.stringify(firstViolation?.counterexample.trace)).toBe(
      JSON.stringify(secondViolation?.counterexample.trace),
    );
  });
});
