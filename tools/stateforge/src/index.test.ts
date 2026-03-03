import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "bun:test";

import { runChecker } from "./checker";
import { buildCliArgs, loadModel, parseArgs, selectModelPath } from "./index";

async function withTempToolRoot(run: (toolRoot: string) => Promise<void>): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "stateforge-model-test-"));
  try {
    await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeFixture(toolRoot: string, name: string): Promise<string> {
  const fixturesDir = join(toolRoot, "fixtures");
  await mkdir(fixturesDir, { recursive: true });
  const path = join(fixturesDir, name);
  await writeFile(path, "{}\n", "utf8");
  return path;
}

describe("stateforge model selection", () => {
  test("parses --model=foo.json", () => {
    expect(parseArgs(["--model=foo.json"])).toEqual({ model: "foo.json" });
  });

  test("parses --model foo.json", () => {
    expect(parseArgs(["--model", "foo.json"])).toEqual({ model: "foo.json" });
  });

  test("parses -- --model foo.json", () => {
    expect(parseArgs(["--", "--model", "foo.json"])).toEqual({ model: "foo.json" });
  });

  test("parses generic key value", () => {
    expect(parseArgs(["--mode=fast"])).toEqual({ mode: "fast" });
  });

  test("parses flag-only switch", () => {
    expect(parseArgs(["--flagOnly"])).toEqual({ flagOnly: true });
  });

  test("parses --shortest as boolean flag", () => {
    expect(parseArgs(["--shortest"])).toEqual({ shortest: true });
  });

  test("buildCliArgs accepts shortest boolean flag", () => {
    expect(
      buildCliArgs({
        shortest: true,
      }),
    ).toMatchObject({
      shortest: true,
    });
  });

  test("prefers generated model when present", async () => {
    await withTempToolRoot(async (toolRoot) => {
      const generated = await writeFixture(toolRoot, "model.generated.json");
      await writeFixture(toolRoot, "model.default.json");

      const selected = await selectModelPath(toolRoot);
      expect(selected).toBe(generated);
    });
  });

  test("falls back to default model when generated is absent", async () => {
    await withTempToolRoot(async (toolRoot) => {
      const fallback = await writeFixture(toolRoot, "model.default.json");

      const selected = await selectModelPath(toolRoot);
      expect(selected).toBe(fallback);
    });
  });

  test("accepts explicit --model override", async () => {
    await withTempToolRoot(async (toolRoot) => {
      await writeFixture(toolRoot, "model.generated.json");
      const explicit = await writeFixture(toolRoot, "model.default.json");

      const cli = parseArgs([`--model=${explicit}`]);
      const modelArg = typeof cli.model === "string" ? cli.model : undefined;
      const selected = await selectModelPath(toolRoot, modelArg);
      expect(selected).toBe(explicit);
    });
  });

  test("loads generated model fixture and runs checker", async () => {
    const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
    const selected = await selectModelPath(toolRoot, "fixtures/model.generated.json");
    const model = await loadModel(selected);
    const result = runChecker(model, {
      maxDepth: model.defaults.maxDepth,
      maxStates: model.defaults.maxStates,
      seed: model.seed,
    });

    expect(result.ok).toBe(true);
    expect(result.violations.length).toBe(0);
  });
});
