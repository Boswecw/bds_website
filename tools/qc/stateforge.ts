import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { accessSync, constants } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

type StepResult = {
  ok: boolean;
  reason?: string;
};

type ExecResult = {
  code: number;
  stdout: string;
  stderr: string;
  errorMessage?: string;
};

type DriftMode = "always" | "auto" | "never";

const PREFIX = "QC:StateForge:";
const DEBUG_ENABLED = process.env.DEBUG === "1" || process.env.DEBUG === "true";
const SHORTEST_CHECK_ENABLED =
  process.env.STATEFORGE_QC_SHORTEST === undefined ||
  process.env.STATEFORGE_QC_SHORTEST === "1" ||
  process.env.STATEFORGE_QC_SHORTEST === "true";

const EXPORTER_RELEVANT_PATH_PREFIXES = [
  "src-tauri/src/governance_model/",
  "src-tauri/src/bin/export_stateforge_model.rs",
  "src-tauri/Cargo.toml",
  "src-tauri/Cargo.lock",
  "tools/stateforge/fixtures/model.generated.json",
];

function line(message: string): void {
  console.log(`${PREFIX} ${message}`);
}

function debugBlock(name: string, value: string): void {
  if (!DEBUG_ENABLED) {
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  console.log(`${PREFIX} DEBUG ${name}`);
  console.log(trimmed);
}

function hasPath(path: string): boolean {
  try {
    accessSync(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function runCommand(command: string, args: string[], cwd: string): ExecResult {
  const completed = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (completed.error) {
    return {
      code: 1,
      stdout: completed.stdout ?? "",
      stderr: completed.stderr ?? "",
      errorMessage: completed.error.message,
    };
  }

  return {
    code: completed.status ?? 1,
    stdout: completed.stdout ?? "",
    stderr: completed.stderr ?? "",
  };
}

function parseDriftMode(raw: string | undefined): DriftMode {
  if (raw === undefined || raw.trim() === "") {
    return "always";
  }

  if (raw === "always" || raw === "auto" || raw === "never") {
    return raw;
  }

  throw new Error("STATEFORGE_QC_DRIFT_MODE must be one of: always, auto, never");
}

function parseGitStatusPath(lineValue: string): string | null {
  if (lineValue.length < 4) {
    return null;
  }

  let rawPath = lineValue.slice(3).trim();
  const renameArrow = rawPath.lastIndexOf(" -> ");
  if (renameArrow >= 0) {
    rawPath = rawPath.slice(renameArrow + 4);
  }

  if (rawPath.startsWith("\"") && rawPath.endsWith("\"")) {
    rawPath = rawPath.slice(1, -1).replaceAll('\\"', '"');
  }

  if (!rawPath) {
    return null;
  }

  return rawPath;
}

function listChangedFiles(repoRoot: string): string[] | null {
  const status = runCommand("git", ["status", "--porcelain=1"], repoRoot);
  debugBlock("git status stdout", status.stdout);
  debugBlock("git status stderr", status.stderr);

  if (status.code !== 0) {
    return null;
  }

  return status.stdout
    .split("\n")
    .map((lineValue) => lineValue.trimEnd())
    .filter((lineValue) => lineValue.length > 0)
    .map(parseGitStatusPath)
    .filter((value): value is string => value !== null);
}

function hasExporterRelevantChanges(repoRoot: string): boolean {
  const changedFiles = listChangedFiles(repoRoot);
  if (changedFiles === null) {
    // Fail closed: if git status cannot be read, run the strict drift check.
    return true;
  }

  return changedFiles.some((file) =>
    EXPORTER_RELEVANT_PATH_PREFIXES.some(
      (prefix) => file === prefix || file.startsWith(prefix),
    ),
  );
}

async function discoverFixtures(fixturesDir: string): Promise<{
  positives: string[];
  negatives: string[];
}> {
  const entries = await readdir(fixturesDir, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const positives = names.filter((name) => /^model\.positive\..+\.json$/.test(name));
  const negatives = names.filter((name) => /^model\.negative\..+\.json$/.test(name));

  return { positives, negatives };
}

function runInStateforge(stateforgeDir: string, args: string[]): ExecResult {
  return runCommand("bun", args, stateforgeDir);
}

function summaryReason(label: string, details: string): string {
  return `${label} (${details})`;
}

async function runDriftCheck(repoRoot: string, fixturesDir: string): Promise<StepResult> {
  const driftMode = parseDriftMode(process.env.STATEFORGE_QC_DRIFT_MODE);
  const srcTauriDir = join(repoRoot, "src-tauri");
  const manifestPath = join(srcTauriDir, "Cargo.toml");
  const expectedPath = join(fixturesDir, "model.generated.json");

  if (!hasPath(srcTauriDir) || !hasPath(manifestPath)) {
    line("export drift ... SKIP");
    return { ok: true };
  }

  if (!hasPath(expectedPath)) {
    return {
      ok: false,
      reason: "export drift: missing fixtures/model.generated.json",
    };
  }

  if (driftMode === "never") {
    line("export drift ... SKIP");
    return { ok: true };
  }

  if (driftMode === "auto" && !hasExporterRelevantChanges(repoRoot)) {
    line("export drift ... SKIP");
    return { ok: true };
  }

  const expected = await readFile(expectedPath, "utf8");
  const tempRoot = await mkdtemp(join(tmpdir(), "stateforge-qc-"));
  const tempOut = join(tempRoot, "model.generated.json");

  try {
    const exportRun = runCommand(
      "cargo",
      [
        "run",
        "--manifest-path",
        "src-tauri/Cargo.toml",
        "--bin",
        "export_stateforge_model",
        "--",
        "--out",
        tempOut,
      ],
      repoRoot,
    );

    debugBlock("cargo stdout", exportRun.stdout);
    debugBlock("cargo stderr", exportRun.stderr);

    if (exportRun.code !== 0) {
      const suffix = exportRun.errorMessage
        ? `spawn-error=${exportRun.errorMessage}`
        : `exit=${exportRun.code}`;
      return {
        ok: false,
        reason: summaryReason("export drift", suffix),
      };
    }

    const actual = await readFile(tempOut, "utf8");
    if (actual !== expected) {
      return {
        ok: false,
        reason: "export drift: StateForge model drift detected. Run export_stateforge_model and commit the updated generated model.",
      };
    }

    line("export drift ... OK");
    return { ok: true };
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

export async function runStateforgeQc(repoRoot: string = process.cwd()): Promise<number> {
  const stateforgeDir = join(repoRoot, "tools", "stateforge");
  const fixturesDir = join(stateforgeDir, "fixtures");

  line("start");

  if (!hasPath(stateforgeDir)) {
    line("FAIL: missing tools/stateforge");
    return 1;
  }

  if (!hasPath(fixturesDir)) {
    line("FAIL: missing tools/stateforge/fixtures");
    return 1;
  }

  const fixtureGroups = await discoverFixtures(fixturesDir);
  if (fixtureGroups.positives.length === 0) {
    line("FAIL: no positive fixtures found");
    return 1;
  }
  if (fixtureGroups.negatives.length === 0) {
    line("FAIL: no negative fixtures found");
    return 1;
  }

  const testRun = runInStateforge(stateforgeDir, ["test"]);
  debugBlock("bun test stdout", testRun.stdout);
  debugBlock("bun test stderr", testRun.stderr);
  if (testRun.code !== 0) {
    line(`FAIL: ${summaryReason("bun test", `exit=${testRun.code}`)}`);
    return 1;
  }
  line("bun test ... OK");

  const shortestArgs = SHORTEST_CHECK_ENABLED ? ["--shortest"] : [];

  const defaultCheck = runInStateforge(stateforgeDir, [
    "run",
    "stateforge:check",
    ...shortestArgs,
  ]);
  debugBlock("default check stdout", defaultCheck.stdout);
  debugBlock("default check stderr", defaultCheck.stderr);
  if (defaultCheck.code !== 0) {
    line(`FAIL: ${summaryReason("default model check", `exit=${defaultCheck.code}`)}`);
    return 1;
  }
  line("default model check ... OK");

  for (const fixture of fixtureGroups.positives) {
    const run = runInStateforge(stateforgeDir, [
      "run",
      "stateforge:check",
      "--model",
      `fixtures/${fixture}`,
      "--out",
      `out/${fixture}.report.json`,
      ...shortestArgs,
    ]);
    debugBlock(`positive ${fixture} stdout`, run.stdout);
    debugBlock(`positive ${fixture} stderr`, run.stderr);
    if (run.code !== 0) {
      line(`FAIL: ${summaryReason("positive fixture failed", fixture)}`);
      return 1;
    }
  }
  line(`positives (${fixtureGroups.positives.length}) ... OK`);

  for (const fixture of fixtureGroups.negatives) {
    const run = runInStateforge(stateforgeDir, [
      "run",
      "stateforge:check",
      "--model",
      `fixtures/${fixture}`,
      "--out",
      `out/${fixture}.report.json`,
      ...shortestArgs,
    ]);
    debugBlock(`negative ${fixture} stdout`, run.stdout);
    debugBlock(`negative ${fixture} stderr`, run.stderr);
    if (run.code !== 1) {
      line(`FAIL: ${summaryReason("negative fixture expectation mismatch", `${fixture}, exit=${run.code}`)}`);
      return 1;
    }
  }
  line(`negatives (${fixtureGroups.negatives.length}) ... OK`);

  const drift = await runDriftCheck(repoRoot, fixturesDir);
  if (!drift.ok) {
    line(`FAIL: ${drift.reason ?? "export drift check failed"}`);
    return 1;
  }

  line("PASS");
  return 0;
}

async function main(): Promise<void> {
  try {
    const code = await runStateforgeQc();
    process.exit(code);
  } catch (error: unknown) {
    if (DEBUG_ENABLED) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    line(`FAIL: ${message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
