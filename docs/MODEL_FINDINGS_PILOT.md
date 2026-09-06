# Model findings debugging pilot

Pilot: `BDS-MODEL-FINDINGS-TOP10-v0.1`
Repository: `Boswell-Digital-Solutions/bds_website`
Baseline commit: `842b63aee2f7b3f31cf88d88e98052f4b334e239`
Owner: Charles Boswell
Cohort: later structured intake; initial comparison baseline
Activation: after this documentation change is merged; no observation clock has started in this packet.

## Purpose and boundary

Test whether preserving model-raised concerns and consulting their investigation history improves debugging enough to justify the effort. This is a manual repository-documentation pilot. It introduces no runtime persistence, model calls, release verdicts, or automated gates. Existing authority, CI, and human-review requirements continue to apply.

The repo-level record is [KNOWN_ISSUES.md](KNOWN_ISSUES.md). Reuse existing issue IDs and component records; link them rather than copying their content. Findings are engineering notes, not an automatic promotion into DataForge or a canonical ecosystem classification.

## Four-week operation

The cohort clock is recorded in the [Forge_Command pilot log](https://github.com/Boswell-Digital-Solutions/Forge_Command/blob/main/docs/model-findings/sessions.yaml); dates are recorded when work actually begins, not inferred from this file's creation or merge. Charles Boswell coordinates the phase transition already described by the pilot.

- Weeks 1–2: Forge_Command, Author-Forge, NeuroForge, dataforge-Local, and hephaestus use structured intake and consult relevant prior findings before investigating.
- Weeks 1–2: forge-smithy, tarcie-reviewer, DataForge, Forge-Agents, and bds_website continue their existing review process, with only minimal timing/outcome notes for comparison. Handle and record real issues normally; do not withhold findings or fixes for the comparison.
- Weeks 3–4: all ten use structured intake. Record each repo's actual activation and any deviations. A quiet repository contributes no effectiveness conclusion.

This repository begins in **`baseline_after_merge`**. The shared scaffold alone is not the intervention; the measured change is structured intake plus consulting prior dispositions. Until that phase is active, the checklist below is staged guidance.

## Documentation-review checklist — structured phase

1. Pin the reviewed commit, review scope, source reports, and model/version when known. Mark missing provenance `unknown`.
2. Search relevant open and closed known issues before debugging. Record whether a prior entry changed the next action; do not claim estimated time savings as measured time.
3. Capture each distinct actionable concern, or link it to an existing ID. Enter untested claims as **unverified**; separate enhancement suggestions from defects.
4. Separate observed facts, expected behavior, and the proposed cause. Include affected code and the smallest confirming/refuting check. Prefer an executable reproduction when practical; retain human reproduction steps when appropriate.
5. Record checks actually run, their result, contradictory evidence, and missing access. Use **confirmed**, **disproven**, or **inconclusive** only as supported. Failed reproduction alone does not prove absence.
6. Give unresolved findings an owner, next action, and review trigger. A model's age, confidence, or agreement with another model does not establish severity or correctness.
7. Link any fix and its relevant verification at the corrected commit. Preserve disproven findings with rationale and scope; reopen on new evidence or changed conditions. Keep verification state separate from work disposition.
8. Before closing the review, account for every supplied concern and record the documentation build/validation outcome separately. A passing doc build does not close a product issue; merely logging an unverified claim does not fail a release gate.

Source modules under `doc/system/` remain the editing surface. Run `bash doc/system/BUILD.sh` when they change and preserve the repo's current generated output names. Use supported native parity checks. Do not hand-edit generated artifacts or change designation policy for this pilot.

## Concise issue template

Use the existing repo vocabulary where available. The example below is a template, not a reported defect. Unknown values stay unknown. Keep relevant excerpts only and redact secrets or private user content.

```yaml
id: <existing-or-new-stable-issue-id>
title: <specific-claim>
source: {review: <reference>, model: unknown, date: <actual-date>}
reviewed_commit: <sha>
affected_paths: []
observed: <facts-or-explicitly-unobserved>
expected: <behavior-or-governing-requirement>
hypothesis: <possible-cause>
check: <smallest-confirming-or-refuting-step>
evidence: []
verification: unverified
disposition: open
severity: <level-and-rationale-or-unknown>
owner: Charles Boswell
next_action: <bounded-step>
review_trigger: <event-or-date>
fix_and_verification: []
```

## Measurement

Record actual sessions in [model-findings/sessions.yaml](model-findings/sessions.yaml). Minimal baseline notes capture task type, active work minutes, waiting time, outcome, and issue references. Structured-phase notes additionally distinguish capture effort, false-alarm effort, and evidence reuse. Missing timing is `null`, never zero or a number inferred from PR age.

For a session, capture `session_id`, `started_at`, `phase`, `reviewed_commit`, `task_type`, `source_model`, `issue_ids`, `active_minutes`, `recordkeeping_minutes`, `false_alarm_minutes`, `inconclusive_minutes`, `waiting_minutes`, `outcome`, `verification_ref`, and `prior_evidence_reused`. Recordkeeping and investigation categories are subsets of active time, not extra time to add again. Separate setup cost from ordinary task cost.

At four weeks, compare comparable tasks: total active time to a verified disposition, verified fixes per active hour, recording overhead, false-alarm effort, repeat investigations, and reopened fixes. Report unresolved cases and per-repo samples. For unique adjudicated defect claims, precision is confirmed / (confirmed + disproven); show duplicates, enhancements, and inconclusive cases separately. Cross-repo copies of one root cause count once at ecosystem level.

The proposed practical review point is at least 30 adjudicated concerns across five active repos; this is not statistical power. A 20% improvement in comparable median active time or verified-fix yield is a proposed usefulness threshold, not a promised effect. Include overhead and regression outcomes. Sparse or confounded evidence means inconclusive. Keep model versions and workflow changes visible.

## Research basis

- [Using Hypotheses as a Debugging Aid](https://arxiv.org/html/2005.13652v1): controlled support for offering testable explanations; limited small-task setting.
- [What Makes a Good Bug Report for an AI Agent?](https://arxiv.org/html/2607.07593v1): 2026 preprint supporting concrete evidence, expected behavior, and localization; benchmark limits apply.
- [BitsAI-CR](https://arxiv.org/html/2501.15134v1): industrial precedent for verification and structured feedback; its performance is not a BDS prediction.

## Setup evidence

The pinned repository has a working `doc/system/BUILD.sh`. A dedicated `docs/KNOWN_ISSUES.md` was absent; this change creates the repo-level intake surface without replacing component documentation. Baseline and candidate builds are recorded in the PR. Setup findings are excluded from debugging-effectiveness metrics. No comprehensive runtime review is claimed.
