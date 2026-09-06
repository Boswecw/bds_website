# Known Issues

Repository-level concerns and investigation history. Existing component records and plan decisions remain authoritative for their own scope; link them here rather than duplicating them. No comprehensive defect audit is implied by this file.

## Model findings pilot intake

Pilot: `BDS-MODEL-FINDINGS-TOP10-v0.1`. See [the review checklist and evidence rules](MODEL_FINDINGS_PILOT.md) and [session log](model-findings/sessions.yaml).

Initial phase: **`baseline_after_merge`**. During the comparison baseline, continue normal issue handling. During structured intake, record each distinct model-raised concern here or link it to an existing record before closing the review. Untested claims are **unverified**. Keep verification separate from open/deferred/closed disposition, preserve disproven claims, and require relevant evidence for fix closure. Existing entries retain their historical provenance and are not reverified by this addition.

### Pilot findings

New observations go below this heading or into existing linked entries. Setup observations are marked separately and do not count as pilot effectiveness results.

#### MF-BDS-20260906-001 — Documentation build skips the snapshot validator in a clean checkout

- Origin: Codex setup inspection, 2026-09-06; model version unavailable.
- Baseline: `842b63aee2f7b3f31cf88d88e98052f4b334e239`; category: documentation validation; setup observation, excluded from effectiveness metrics.
- Evidence: `doc/system/BUILD.sh` invokes the snapshot validator only when `[ -x "$VALIDATOR" ]` is true. The pinned Git tree records `doc/system/validate_snapshots.sh` with mode `100644`, so that condition is false in a clean checkout. The native build exits successfully without running that check.
- Expected: the documented snapshot validation runs during a normal documentation build, or an unavailable validator is reported explicitly.
- Verification: **confirmed conditional validation gap**. An explicit `bash doc/system/validate_snapshots.sh doc/BDSSYSTEM.md` passed for the pilot candidate; this does not repair the build condition.
- Severity: provisional medium; build success alone can omit the snapshot check.
- Disposition: **open**. Owner: Charles Boswell.
- Next action: make validator invocation reliable for the tracked file mode, then verify a clean-checkout build executes it and rejects an invalid snapshot. Review trigger: before relying on the native build alone as the documentation validation gate.
