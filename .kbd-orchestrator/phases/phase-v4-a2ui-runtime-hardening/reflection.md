# Reflection — phase-v4-a2ui-runtime-hardening

## Delta (plan vs delivery)

1. **#74 was delivered differently from the plan.** The plan tagged `v4.2.0` at `34a21156`. The operator rejected that tag
   ("why confuse people and commit on 4.2.0 with outstanding software versions using it"). 4.3.0 shipped instead and 4.2.0
   stays published and untagged, with its source commit recorded in `RELEASING.md`. Goal text for #74 is therefore NOT MET as
   written and MET in intent.
2. **#70 was first closed on a shortcut.** The lab connected to one stream, so "two streams carry the same activity" was
   never reproduced. It took the operator's question ("why can we not fix those all the way?") to make me add multi-stream
   support and flow AUI-5b. The acceptance harness must reproduce the issue's own condition, not a convenient subset.
3. **Execute could not close until the changes were verified and archived.** `openspec validate` failed for all 8 changes
   (no `specs/` deltas). Fixed in the reflect pass: five changes gained real delta specs (four new capabilities under
   `openspec/specs/`), three declare `skip_specs: true` (release metadata, a probe, a test harness), and all 8 now pass
   `kbd-apply verify` and are archived. Reconcile stays clean.
4. **The bound contract's budgets were smaller than the work.** Ceilings were 150 min, 400 tool calls and 3 repairs; the
   phase measured 342 min wall clock, about 386 tool calls and an estimated 13 repairs. The terminal evaluator refuses
   `budget-exceeded`, and only an operator-signed amendment may raise ceilings. A budget-only amendment was prepared
   (`amendment-budget-1.json`) and needs the operator's signature. The placeholder `boundaryPacket.commands` were left
   as they are: they do not gate closure.
5. **Two release gates are red and stay red.** `verify:a2ui-bridge` and `verify:package-contracts` fail on an upstream
   `@a2ui/web_core@0.12.0` typing error (TS2835). Tracked as issue #75. The packed ESM and visual lanes never ran: UNKNOWN.
6. **A cumulative critic found 10 issues after the code was "done"**, none of which any run had caught. Five were fixed
   (1 to 5); five remain (6 to 10).
7. **Process slips of mine:** a partial release test run in task 5 (disclosed), a wrong commit count and a cited commit that
   did not exist (corrected before push), and vague "what I need from you" asks that the operator had to call out.

**Closure authority.** This file proposes; the canonical phase disposition recorded by `kbd-phase-close-eval.sh` is the
authority on whether the phase is closed. Read it with `prometheus kbd phase disposition --id phase-v4-a2ui-runtime-hardening`.

## Goal achievement

| Goal | Status | Basis |
| --- | --- | --- |
| #74 release/doc drift | PARTIAL | Status files, pins, changelog and `candidateSourceSha` corrected; 4.3.0 published, `latest`/`next` verified, `v4.3.0` tagged. The v4.2.0 tag deliberately not created (see Delta 1) |
| #70 idempotent redelivery | MET | Flows AUI-1 to 5b, 9, 9b against a real producer; issue closed |
| #71 versioned deltas, resync | MET | Flows AUI-6 to 8, 14; issue closed |
| #72 action ids and envelope | MET | Flows AUI-9 to 12, 16, 18; issue closed. AUI-16 and AUI-18 were not discrimination-checked |
| #73 headless runtime and export | MET | AUI-10 to 13 headless checks; registry install smoke; issue closed |

Verified by actually running: 17 browser flows, 4 headless checks, 6 Cucumber scenarios, registry verification of all 13
packages at 4.3.0, and a clean-project install smoke. A discrimination check (reverting fixes 1, 3 and 5) showed AUI-15, 17
and 19 fail without their fixes.

## Delivered changes

All 8 changes DONE in the ledger (`kbd-apply reconcile` exit 0, clean): release-status reconcile, web_core Node probe,
runtime limits, activity idempotency, versioned deltas, action ids, headless export, hardening acceptance.
Commits on `origin/main`: `849e8946`, `72bf0352`, `ea38b265`, `b7796047`, `ded34ef0`, and the docs commit `a06f8549`.
Tag `v4.3.0` at `ea38b265`. Issues #70 to #74 commented and closed.

## Artifact Quality Summary

| Metric | Value |
| --- | --- |
| Per-change QA gates | none run (forbidden by the phase rule) |
| Cumulative independent review | 1 run, artifact-only; 10 findings (2 HIGH, 3 MEDIUM, 5 LOW/MED) |
| Findings fixed and re-verified by full-integration flows | 5 of 10 |
| Artifact-refiner logs | none for this phase |

Recurring constraint violations: none recorded by a refiner. The recurring pattern in the review was that **input caps and
atomicity were checked after expensive work** (findings 1, 2, 4, 5).

## Technical debt introduced

- `runtime-core.ts` is about 870 lines, over the 800-line soft ceiling (documented exception). The v1 bridge could be
  extracted.
- Review findings 6 to 10 unfixed: per-call cost proportional to held state; `v1Actions` key collisions on `:`; `keysOf` vs
  official `parsePath`; shadow seed drops per-component `catalogId`; ledger cleanup, false `version-conflict`, unpruned
  `pendingActions`, `dispose()` leaving v1 promises live.
- Default limits are provisional estimates, not measurements.
- Published without npm provenance.
- `publish-stable-3.0.0.sh` checks registry visibility after 30 s, which false-alarms on registry lag.
- 8 OpenSpec changes unarchived and without `specs/` deltas.
- Outside this phase: `v4-*` OpenSpec edits and `phase-v4-prometheus-entity-sync` artifacts remain uncommitted.

## Recalled Lessons

- *"adopted-contract.draft.json is an unadopted draft … /kbd-apply stays blocked"* (plan summary): applied; adoption was
  done on the operator's instruction before execute. It **recurred in a different form**: the adopted commands were
  placeholders (Delta 4).
- *Assessment warning: confirm the reconcile design and caps with the operator before building* : applied; every design
  decision was put to the operator and recorded.

## Lessons captured

- Reproduce an issue's own condition in the acceptance harness before calling it fixed; a single-stream lab cannot clear a
  two-stream issue.
- Run the cumulative adversarial review before declaring a phase done; it found atomicity and cap-ordering defects that no
  run had exposed.
- A discrimination check (revert the fix, watch the flow fail) is what makes a flow evidence; do it for every flow, not a
  subset (AUI-16 and AUI-18 still owed).
- A red gate can hide stale assertions behind it (`processor.version`); when a gate is known red, audit what it stopped
  from running.
- npm registry visibility lags 30 s or more after publish; wait with a long bound instead of failing on a short one.
- Do not tag or commit a version that has consumers in the wild; ask which version the work belongs to before preparing a
  release.
- State needs from the operator as one concrete decision with a recommendation, never as an open list.
- Verify counts and commit ids against `git` before stating them.

## Codify as Skill?

No. These are project and process lessons; none is a repeated multi-project workflow without a covering skill.

## Next Phase Seed

Recommended focus: **close this phase's open obligations before any new feature work**, in this order.

1. Tidy the adopted contract's placeholder boundary commands with a signed amendment (does not gate closure).
2. Resolve #75 (upstream typing) so `verify:a2ui-bridge` and `verify:package-contracts` run past the failure, including the
   unrun ESM and visual lanes.
3. Decide on the OpenSpec changes: add `specs/` deltas and archive, or record a waiver.
4. Discrimination-check AUI-16 and AUI-18; triage review findings 6 to 10 into issues.

Deferred and independent: `phase-v4-prometheus-entity-sync` (PES-11 stale-resume gap detection before the Dart codec; two Dart
packages in the sync repo) and the #59 to #69 architecture epic, neither touched here.
