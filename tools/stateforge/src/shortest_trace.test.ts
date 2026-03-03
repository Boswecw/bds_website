import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

import { runChecker } from "./checker";
import { loadModel } from "./index";

function fixturePath(name: string): string {
  const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  return join(toolRoot, "fixtures", name);
}

describe("shortest counterexample traces", () => {
  test("release_without_seal returns minimal release violation trace", async () => {
    const model = await loadModel(fixturePath("model.negative.release_without_seal.json"));

    const result = runChecker(model, {
      maxDepth: model.defaults.maxDepth,
      maxStates: model.defaults.maxStates,
      seed: model.seed,
      verifyShortest: true,
    });

    expect(result.ok).toBe(false);
    expect(result.shortestValidation.enabled).toBe(true);
    expect(result.shortestValidation.ok).toBe(true);

    const releaseViolation = result.violations.find(
      (violation) => violation.invariant === "release_requires_sealed_evidence",
    );

    expect(releaseViolation).toBeDefined();
    expect(releaseViolation?.counterexample_depth).toBe(8);
    expect(releaseViolation?.counterexample.trace.length).toBe(8);
  });

  test("synthetic fixture prefers depth-1 violation over depth-2 path", async () => {
    const model = await loadModel(fixturePath("model.negative.shortest_depth.json"));

    const result = runChecker(model, {
      maxDepth: model.defaults.maxDepth,
      maxStates: model.defaults.maxStates,
      seed: model.seed,
      verifyShortest: true,
    });

    expect(result.ok).toBe(false);
    expect(result.shortestValidation.enabled).toBe(true);
    expect(result.shortestValidation.ok).toBe(true);

    const costViolation = result.violations.find(
      (violation) => violation.invariant === "cost_cap_not_exceeded",
    );

    expect(costViolation).toBeDefined();
    expect(costViolation?.counterexample_depth).toBe(1);
    expect(costViolation?.counterexample.trace.length).toBe(1);
  });
});
