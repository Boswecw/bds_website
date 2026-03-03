import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

import { runChecker } from "./checker";
import { loadModel } from "./index";

describe("negative fixtures", () => {
  test("release_without_seal fixture fails with deterministic counterexample", async () => {
    const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const fixturePath = join(
      toolRoot,
      "fixtures",
      "model.negative.release_without_seal.json",
    );

    const model = await loadModel(fixturePath);
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
      (violation) => violation.invariant === "release_requires_sealed_evidence",
    );
    const secondViolation = second.violations.find(
      (violation) => violation.invariant === "release_requires_sealed_evidence",
    );

    expect(firstViolation).toBeDefined();
    expect(secondViolation).toBeDefined();
    expect(firstViolation?.message).toBe("Release finalized without sealed evidence chain");
    expect(firstViolation?.counterexample.trace.length ?? 0).toBeGreaterThan(0);
    expect(JSON.stringify(firstViolation?.counterexample.trace)).toBe(
      JSON.stringify(secondViolation?.counterexample.trace),
    );
  });
});
