import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { CheckerConfig } from "./checker";
import { runChecker } from "./checker";
import type { ComposedModel } from "./compose";
import { computeModelHash, writeReport, type StateForgeReport } from "./report";

type ArgValue = string | boolean;
type ParsedArgs = Record<string, ArgValue>;

interface CliArgs {
  maxDepth?: number;
  maxStates?: number;
  out?: string;
  model?: string;
  shortest: boolean;
  unknownKeys: string[];
}

function parsePositiveInt(raw: string, name: string): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, got '${raw}'`);
  }
  return parsed;
}

function parseArgs(argv: string[]): ParsedArgs {
  const result: ParsedArgs = {};
  const tokens = argv.filter((entry) => entry !== "--");

  for (let i = 0; i < tokens.length; i += 1) {
    const arg = tokens[i];
    if (!arg.startsWith("--")) {
      continue;
    }

    const withoutPrefix = arg.slice(2);
    if (!withoutPrefix) {
      continue;
    }

    if (withoutPrefix.includes("=")) {
      const [key, value] = withoutPrefix.split("=", 2);
      result[key] = value;
      continue;
    }

    const next = tokens[i + 1];
    if (next && !next.startsWith("--")) {
      result[withoutPrefix] = next;
      i += 1;
      continue;
    }

    result[withoutPrefix] = true;
  }

  return result;
}

function stringArg(args: ParsedArgs, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function parseBooleanFlag(raw: ArgValue | undefined, key: string): boolean {
  if (raw === undefined) {
    return false;
  }

  if (raw === true) {
    return true;
  }

  if (typeof raw === "string") {
    if (raw === "1" || raw === "true") {
      return true;
    }
    if (raw === "0" || raw === "false") {
      return false;
    }
  }

  throw new Error(`${key} must be a boolean flag`);
}

function buildCliArgs(rawArgs: ParsedArgs): CliArgs {
  const knownKeys = new Set(["maxDepth", "maxStates", "out", "model", "shortest"]);
  const unknownKeys = Object.keys(rawArgs)
    .filter((key) => !knownKeys.has(key))
    .sort();

  const out = stringArg(rawArgs, "out");
  if (out !== undefined && !out.trim()) {
    throw new Error("out path must not be empty");
  }

  const model = stringArg(rawArgs, "model");
  if (model !== undefined && !model.trim()) {
    throw new Error("model path must not be empty");
  }

  const maxDepthRaw = stringArg(rawArgs, "maxDepth");
  const maxStatesRaw = stringArg(rawArgs, "maxStates");

  return {
    maxDepth:
      maxDepthRaw === undefined ? undefined : parsePositiveInt(maxDepthRaw, "maxDepth"),
    maxStates:
      maxStatesRaw === undefined ? undefined : parsePositiveInt(maxStatesRaw, "maxStates"),
    out,
    model,
    shortest: parseBooleanFlag(rawArgs.shortest, "shortest"),
    unknownKeys,
  };
}

function toModel(raw: unknown): ComposedModel {
  return raw as ComposedModel;
}

export async function loadModel(path: string): Promise<ComposedModel> {
  const payload = await readFile(path, "utf8");
  return toModel(JSON.parse(payload));
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export function resolveModelPath(toolRoot: string, modelArg?: string): {
  generatedPath: string;
  defaultPath: string;
  selectedPath: string;
} {
  const generatedPath = join(toolRoot, "fixtures", "model.generated.json");
  const defaultPath = join(toolRoot, "fixtures", "model.default.json");

  if (modelArg) {
    const selectedPath = isAbsolute(modelArg)
      ? modelArg
      : resolve(process.cwd(), modelArg);
    return { generatedPath, defaultPath, selectedPath };
  }

  return {
    generatedPath,
    defaultPath,
    selectedPath: generatedPath,
  };
}

export async function selectModelPath(
  toolRoot: string,
  modelArg?: string,
): Promise<string> {
  const modelPaths = resolveModelPath(toolRoot, modelArg);
  if (modelArg) {
    return modelPaths.selectedPath;
  }

  if (await pathExists(modelPaths.generatedPath)) {
    return modelPaths.generatedPath;
  }

  return modelPaths.defaultPath;
}

function buildReport(
  model: ComposedModel,
  checkerConfig: CheckerConfig,
  result: ReturnType<typeof runChecker>,
): StateForgeReport {
  return {
    ok: result.ok,
    tool: "stateforge",
    version: "0.2.1",
    model_hash: computeModelHash(model),
    config: {
      maxDepth: checkerConfig.maxDepth,
      maxStates: checkerConfig.maxStates,
    },
    stats: {
      statesExplored: result.statesExplored,
      maxDepthReached: result.maxDepthReached,
      elapsedMs: 0,
    },
    violations: result.violations.map((violation) => ({
      invariant: violation.invariant,
      message: violation.message,
      counterexample_depth: violation.counterexample_depth,
      counterexample: {
        trace: violation.counterexample.trace.map((entry) => ({
          step: entry.step,
          action: entry.action,
          actor: entry.actor,
          ring: entry.ring,
          state: {
            pipeline: entry.state.pipeline,
            approvedSeen: entry.state.approvedSeen,
            dependency: entry.state.dependency,
            authority: {
              ring: entry.state.authority.ring,
              lastEscalation: entry.state.authority.lastEscalation,
            },
            evidence_chain: {
              headHash: entry.state.evidence_chain.headHash,
              sealed: entry.state.evidence_chain.sealed,
              length: entry.state.evidence_chain.length,
              forked: entry.state.evidence_chain.forked,
              sealedHeadHash: entry.state.evidence_chain.sealedHeadHash,
              expectedPrev: entry.state.evidence_chain.expectedPrev,
              lastAppendType: entry.state.evidence_chain.lastAppendType,
              lastAppendAccepted: entry.state.evidence_chain.lastAppendAccepted,
              lastAppendPrevMatchesExpected:
                entry.state.evidence_chain.lastAppendPrevMatchesExpected,
              nextNonce: entry.state.evidence_chain.nextNonce,
              seenNonces: [...entry.state.evidence_chain.seenNonces].sort((a, b) => a - b),
              lastAppend: entry.state.evidence_chain.lastAppend
                ? {
                    nonce: entry.state.evidence_chain.lastAppend.nonce,
                    kind: entry.state.evidence_chain.lastAppend.kind,
                  }
                : null,
            },
            cost: {
              cap: entry.state.cost.cap,
              total: entry.state.cost.total,
              maxTotal: entry.state.cost.maxTotal,
              lastCharge: entry.state.cost.lastCharge
                ? {
                    op: entry.state.cost.lastCharge.op,
                    amount: entry.state.cost.lastCharge.amount,
                  }
                : null,
            },
          },
        })),
      },
    })),
  };
}

async function main(): Promise<number> {
  const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const repoRoot = resolve(toolRoot, "..", "..");

  const rawArgs = parseArgs(process.argv.slice(2));
  const cli = buildCliArgs(rawArgs);
  if (cli.unknownKeys.length > 0) {
    console.warn(`StateForge: ignoring unknown arguments: ${cli.unknownKeys.join(", ")}`);
  }

  if ("model" in rawArgs && cli.model === undefined) {
    console.error("StateForge: model file not found: --model");
    return 1;
  }

  const fixturePath = await selectModelPath(toolRoot, cli.model);
  if (cli.model && !(await pathExists(fixturePath))) {
    console.error(`StateForge: model file not found: ${fixturePath}`);
    return 1;
  }

  const model = await loadModel(fixturePath);

  const checkerConfig: CheckerConfig = {
    maxDepth: cli.maxDepth ?? model.defaults.maxDepth,
    maxStates: cli.maxStates ?? model.defaults.maxStates,
    seed: model.seed,
    verifyShortest: cli.shortest,
  };

  const outPath =
    cli.out ?? join(repoRoot, "tools", "stateforge", "out", "stateforge.report.json");

  const result = runChecker(model, checkerConfig);
  const report = buildReport(model, checkerConfig, result);
  await writeReport(outPath, report);

  if (cli.shortest && !result.shortestValidation.ok) {
    console.error("StateForge: shortest-trace validation failed");
    return 1;
  }

  const summary = result.ok ? "PASS" : "FAIL";
  console.log(
    `stateforge ${summary} states=${result.statesExplored} depth=${result.maxDepthReached} violations=${result.violations.length} report=${outPath}`,
  );

  return result.ok ? 0 : 1;
}

if (import.meta.main) {
  main()
    .then((code) => process.exit(code))
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`stateforge ERROR: ${message}`);
      process.exit(1);
    });
}

export { buildCliArgs, main, parseArgs };
