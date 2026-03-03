import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { ComposedModel } from "./compose";
import { REQUIRED_INVARIANTS } from "./invariants";

export interface StateForgeReport {
  ok: boolean;
  tool: "stateforge";
  version: "0.2.1";
  model_hash: string;
  config: {
    maxDepth: number;
    maxStates: number;
  };
  stats: {
    statesExplored: number;
    maxDepthReached: number;
    elapsedMs: number;
  };
  violations: Array<{
    invariant: string;
    message: string;
    counterexample_depth: number;
    counterexample: {
      trace: Array<{
        step: number;
        action: string;
        actor: string;
        ring: string;
        state: {
          pipeline: string;
          approvedSeen: boolean;
          dependency: string;
          authority: {
            ring: string;
            lastEscalation: boolean;
          };
          evidence_chain: {
            headHash: string | null;
            sealed: boolean;
            length: number;
            forked: boolean;
            sealedHeadHash: string | null;
            expectedPrev: string | null;
            lastAppendType: string;
            lastAppendAccepted: boolean;
            lastAppendPrevMatchesExpected: boolean;
            nextNonce: number;
            seenNonces: number[];
            lastAppend: {
              nonce: number;
              kind: string;
            } | null;
          };
          cost: {
            cap: number;
            total: number;
            maxTotal: number;
            lastCharge: {
              op: string;
              amount: number;
            } | null;
          };
        };
      }>;
    };
  }>;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }

  if (value && typeof value === "object") {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const out: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      out[key] = canonicalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }

  return value;
}

function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function computeModelHash(model: ComposedModel): string {
  const invariantNames = REQUIRED_INVARIANTS.map((entry) => entry.name);
  const normalized = canonicalize({
    model_config: {
      seed: model.seed,
      defaults: model.defaults,
      actions: model.actions,
    },
    node_definitions: model.nodes,
    evidence_chain: model.evidence_chain,
    cost: model.cost ?? null,
    invariants: invariantNames,
  });

  return `sha256:${sha256Hex(JSON.stringify(normalized))}`;
}

export async function writeReport(
  reportPath: string,
  report: StateForgeReport,
): Promise<void> {
  await mkdir(dirname(reportPath), { recursive: true });
  const payload = `${JSON.stringify(report, null, 2)}\n`;
  await writeFile(reportPath, payload, "utf8");
}
