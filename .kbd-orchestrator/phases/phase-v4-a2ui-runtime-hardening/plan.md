# Plan — phase-v4-a2ui-runtime-hardening

**Date:** 2026-10-28 (revision 3, after two adversarial review rounds; round 2 was the last)
**Goal:** resolve GitHub issues #70–#74 in `packages/a2ui-react` (plus repo-wide release metadata for #74), web only; Flutter gets a documented contract, not an implementation.
**Change backend:** OpenSpec (`openspec/changes/<change-id>/`), detected from the existing `openspec/` directory. The 8 change structures and a draft contract exist on disk (emitted after the round-1 vet); neither is registered in the runtime or adopted.
**Scenario ids:** the contract schema requires `^[A-Z]+-[0-9]+$` (letters only before the hyphen), so scenarios are named `AUI-1` through `AUI-14`. The recorded assess handoff still says `A2UI-n` for the same scenarios; that record is runtime-owned and was left unedited.
**Total changes:** 8 · **Total tasks:** 46. Task IDs are the ordinals in each change's `tasks.md`, written `<change>#<n>`.
**Inputs:** `assessment.md` revision 3, operator decisions of 2026-10-28.
**Prior context:** `prior-context.md` recalled 0 lessons; none cited.
**Preflight:** the OpenSpec refresh ran during `kbd-new-phase` this session. It was **not repeated**: it applies the machine-wide 6-workflow profile and deletes 24 committed workflow files, which then have to be restored.

## Decisions applied

| Decision | Status |
|---|---|
| AG-UI 1.0 support; peer `>=0.0.59 <0.1.0 \|\| ^1.0.0`, dev dependency `@ag-ui/core` 1.0.3 | Operator-confirmed |
| Reconcile, not replace; **producer wins** on a both-changed path; a message absent from `MESSAGES_SNAPSHOT` leaves its surfaces alone | Operator-confirmed |
| `actionId` = UUIDv7 at `forwardedProps.a2uiAction.actionId`, `heldVersion` beside it | Operator-confirmed |
| Add surface and component caps (values provisional) | Operator-confirmed. **Caps are enforced by default, which can reject activities large hosts accepted today; this is a behavior change the risk acceptance must cover.** |
| Epoch = integer raised on every producer restart; deltas without a version rejected; version in activity `content` (D4); #73 last behind the Node probe (D2); risk acceptance as recorded | Recommended by Claude, **agreed** by the operator ("agreed, run /kbd-plan") |
| New example package `examples/agui-activity-lab` for the producer and consumer | **Claude decision, not confirmed.** Both existing examples are guarded: `tests/release/v3-agentic-a2ui-example.test.mjs` checks required files, a secret regex and dependency pins, and `vite preview` cannot host a server. |
| Emit the action envelope for **executed** actions of both v0.9.1 and v1, never for policy-denied ones | **Claude decision, not confirmed.** Today `forwardV1Action` (`runtime.ts:157-158,362`) runs only for v1 actions after an `executed` decision; extending it to v0.9.1 is a trust-boundary choice (denied actions never leave the runtime). |
| A new Flutter-contract section in `release/a2ui-protocol-bridge.md` | **Claude decision, not confirmed.** The document's line 167 lists Flutter as out of scope. |
| Updating the existing bridge gates' expectations (the "honors replacement" assertion, hard-coded export counts, pins) | **Claude decision, surfaced.** An exception to "do not touch legacy suites", done once at the final boundary in `a2ui-hardening-acceptance#5`, not mid-implementation. |
| Contract adoption (`kbd-contract-adopt.sh`) | **Not done; operator-owned.** |

## Ordering rationale

All changes edit `packages/a2ui-react/src/official/runtime.ts` and/or `v1-compat.ts`, so work is serialized (single writer).

```
1 release-status ──(independent, first: fixes the version baseline)
2 webcore-node-probe ──(gates 7)
3 runtime-limits ──► 4 activity-idempotency ──► 5 versioned-deltas ──► 6 action-ids
                                                                    7 headless-export (conditional on 2 go + D2)
                                        4,5,6,7 ──► 8 hardening-acceptance
```

- **3 before 4–7.** Trust boundary named: **agent-generated UI arriving at the runtime** (untrusted producer input to the catalog allowlist and resource limits). Every path (snapshot, delta, `MESSAGES_SNAPSHOT`, headless, export) must pass the existing allowlist and the new limits; change 3 creates the hook and changes 4, 5 and 7 wire their own buffers to it.
- **4 before 5:** #71 reuses #70's tracking. **5 before 6:** `heldVersion` needs #71's held-version API, and change 5 creates the single `forwardedProps` builder that change 6 extends. Stale-action rejection handling lives in change 6 because it needs `actionId` for correlation.
- **Constraints from existing gates**, for changes 4, 5, 6 and 7: source under `official/`, `react/` and `policy/` must not contain, in any case, `STATE_SNAPSHOT`, `STATE_DELTA`, `MESSAGE_START`, `JSON.parse` or `jsonl` (`tests/release/v3-a2ui-protocol-bridge.test.mjs:34`; the bridge step also checks `runtime.ts` for `getState(`). Use `structuredClone` and sorted-key `JSON.stringify`, and avoid identifiers such as `stateDelta`.
- **No mid-phase builds or test edits.** `refresh:exports` runs `pnpm run build` first, so it runs **once**, scoped, in `a2ui-hardening-acceptance#5`, as do the existing-gate reconciliations. After any fix made during `#7`, the package `dist` must be rebuilt before rerunning.
- **8 last:** the whole production path is implemented and wired before tests are authored or run.

## Changes

### 1 `a2ui-release-status-reconcile` — #74 (delivery-only, 6 tasks)
1 Record provenance: the published 4.2.0 tarball exports `createPrometheusA2uiComponent` (inspected this session in a scratch directory; recorded in `evidence/`), `gitHead` is null, and source `34a21156` is **inferred** as the last commit touching the published packages. 2 Update `release/npm-registry-status.json` for all 13 entries to what `npm view` reports (run outside the repo root), with `candidateSourceSha` and `certifiedPackageSourceSha` set to the **full 40-character SHA** of `34a21156`. `candidateSourceSha` must equal `website/static/api/packed-inventory.json` `revision` (checked by `check-generated-artifacts.mjs` and `site-contract.test.mjs`), so regenerate that file and the README registry table (`scripts/readme-parity.mjs`) with the repository's own generators. 3 Correct the stale `web_core`, `@a2ui/react` and `markdown-it` pins in **both** `release/a2ui-protocol-bridge.md` (lines 59-61) and `prometheus-entity-skills/_shared/references/a2ui-protocol-bridge.md` (lines 51-52). 4 Fix the root `CHANGELOG.md` 4.2.0 heading and add a changeset (the package changelog is changeset-generated) stating that 4.2.0 first ships application-supplied component implementations. 5 Record every reader of the edited files and read their expected strings: the bridge Cucumber step and the release test for the pins (a reviewer reported an assertion of the old pins that I could not reproduce in either file; settle this by reading), the generated-artifact checks, and the readme parity script; done = the list is recorded and each expectation is confirmed or the conflicting test assertion is listed for `a2ui-hardening-acceptance#5`. 6 Prepare the `v4.2.0` tag command at `34a21156`; **not created or pushed**.

### 2 `a2ui-webcore-node-probe` (3 tasks)
1 Frozen-lockfile install scoped to the package. 2 Scripted Node import of the `web_core` 0.12.0 processing entries and a create/update/data-model sequence. 3 `evidence/webcore-node-probe.md` with the exact failing import if any, plus a go/no-go for change 7. The probe covers `web_core` only; the React import in `catalog.ts` is change 7's task 1.

### 3 `a2ui-runtime-limits` (4 tasks)
1 Typed `PrometheusA2uiLimits` and the `onProducerFault` callback option, with provisional defaults (64 surfaces, 2,000 components/surface, 10,000/runtime, depth 32, 1 MiB data/surface, 500 operations and 1 MiB per activity, 100 buffered deltas for 5 s, 1,000 tracked messages and tombstones) validated at construction. 2 Pre-apply check over one call's operations plus held state; whole-call atomic rejection. 3 `setLimits(partial)` (future calls only, never evicts) and `getLimitUsage()`. 4 README documentation, including that enforcement is on by default. `web_core` and `a2ui-react` currently enforce **no caps**.

### 4 `a2ui-activity-idempotency` — #70 (8 tasks)
1 Creator-vs-updater tracking (`runtime.ts:295-300` treats any surface named by any of four operation types as owned). 2 Ordering key `(surface, epoch, version)` from `content.surfaceVersions`; epoch is a producer-raised integer, absent means 0. 3 Canonical digest and **bounded tombstone and tracked-message maps wired to the limits**. 4 Per-surface operation filtering. 5 Reconcile in place: strip `createSurface` for held surfaces, report a differing `catalogId`/`theme`/`sendDataModel` as a producer fault, keep the v1 `clearSurfaceActions` path correct. 6 Per-path base tracking so only changed paths are written; producer wins; `onConflict`. 7 New `MESSAGES_SNAPSHOT` handler; absent message untracked, surfaces left alone. 8 Behavior-change documentation and changelog callout (minor 4.3.0). **Behavior change:** the legacy "honors replacement" assertion (`official-a2ui.test.tsx:322-376`) is reconciled once, in `a2ui-hardening-acceptance#5`.

### 5 `a2ui-versioned-deltas` — #71 (5 tasks)
1 Declare `@ag-ui/core` 1.0.3 as a dev dependency and widen the peer range (the handler takes untyped payloads; this declares 1.0 compatibility and serves the lab example's types). 2 `ACTIVITY_DELTA` handler: per-message content copy, `add` to the operations list and `test` on version only; versionless deltas and other operations rejected. 3 Bounded gap buffer wired to the limits, `onResyncNeeded`, `dispose()` clears timers. 4 `getHeldVersions()` and the single `forwardedProps` builder module (resync request). 5 Report a refused batch as a validation error plus resync request.

### 6 `a2ui-action-ids` — #72 and the stale-action half of #71 (6 tasks)
1 UUIDv7 (RFC 9562), inline, **no new dependency**. 2 Emit the action envelope for executed actions of both v0.9.1 and v1 and never for denied ones (decision above); keep the v1 correlation id inside the action untouched. 3 Extend the task-5 builder with `actionId`, `heldVersion` and the client data model when `sendDataModel` is set. 4 `retryAction(actionId)` reusing the id. 5 Apply operations returned with a stale-action rejection (wire shape fixed in this task and recorded as a decision). 6 Document the two ids.

### 7 `a2ui-headless-export` — #73 (6 tasks, conditional)
1 Split the catalog so a React-free entry does not import `@a2ui/react` (`catalog.ts:10`, imported by `runtime.ts`). 2 Headless entry with the same allowlist, limits and validation. 3 Lossless `exportSurfaceMessages(surfaceId)`. 4 Keep v1 `wantResponse`/`responsePath` metadata exportable from `v1-compat.ts`. 5 Orphan pruning with accounting. 6 `package.json` exports, a `tsup.config.ts` entry, and the `entryPoints` update in `scripts/skills-package-registry.mjs`. Proceeds only on a probe go and D2; if dropped, AUI-10..12 leave the contract by amendment.

### 8 `a2ui-hardening-acceptance` (8 tasks)
1 Scaffold `examples/agui-activity-lab`: add it to `pnpm-workspace.yaml` (examples are listed one by one), copy the `src` aliases for `@prometheus-ags/a2ui-react` that the other examples use in tsconfig and Vite, and update `pnpm-lock.yaml`. Check `examples/coverage.json` (lists showcases only; registration not enforced). `@ag-ui/core` is added as a dependency for event types. 2 Node `node:http` SSE producer emitting AG-UI 1.0 snapshots, deltas and `MESSAGES_SNAPSHOT` with versions and epochs, recording received action envelopes. 3 Consumer page feeding the stream to `PrometheusA2uiRuntime` through the package hooks layer and posting action envelopes. 4 One scoped `typecheck:affected` (Gate II). 5 Docs and gates, once: package README; the bridge doc (AG-UI 1.0 row, reconcile semantics, new Flutter-contract section) and the skills reference; reconcile the existing gates' expectations: the "honors replacement" assertion, hard-coded export counts (`tests/release/v3-a2ui-protocol-bridge.test.mjs:56-57` expects 19 and 9; the step expects 18 and 9), and the pins; then the scoped `pnpm --filter @prometheus-ags/a2ui-react run refresh:exports` and `run verify:skills`. 6 Author the executable scenarios (Cucumber and Playwright) with a new Playwright config; confirm `cucumber.mjs` picks up the new features. 7 Run the complete integration set once, fix, rebuild `dist`, rerun; include the registry comparison for AUI-13. 8 Artifact-only review, evidence, archive after gates; no tag or publish without approval.

## Scenario to task coverage

Authoring owner `a2ui-hardening-acceptance#6`; run owner and contract `ownerTask` `a2ui-hardening-acceptance#7`.

| Scenarios | Production tasks they depend on |
|---|---|
| AUI-1..5 | `a2ui-activity-idempotency#1–7`, `a2ui-runtime-limits#1–3` |
| AUI-6, 7 | `a2ui-versioned-deltas#1–5`, `a2ui-activity-idempotency#2–3` |
| AUI-14 | `a2ui-action-ids#1–5`, `a2ui-versioned-deltas#4` |
| AUI-8, 9 | `a2ui-action-ids#1–4`, `a2ui-versioned-deltas#4` |
| AUI-10..12 (conditional) | `a2ui-headless-export#1–6` |
| AUI-13 (delivery-only) | `a2ui-release-status-reconcile#1–5` |

## Effort (active coding-agent hours; estimates, not measurements)

| Change | Hours |
|---|---|
| 1 release reconcile | 3–4 |
| 2 Node probe | 1 |
| 3 limits | 3–5 |
| 4 idempotency | 6–9 |
| 5 deltas | 4–6 |
| 6 action ids | 5–7 |
| 7 headless export (conditional) | 7–10 |
| 8 example, docs, gates, acceptance | 10–14 |
| **Total** | **39–56** (32–46 without change 7) |

External waiting, not counted: registry publication and tag push (human-approved), Playwright browser installs.

## Task model assignments

Routes are **provisional**: no local capability results exist for these models and capability documentation was not consulted on 2026-10-28, so every row is weak evidence. Harness: Claude Code, native Agent tool; the `liter-llm` MCP server failed to connect this session, so no external route is verified and every native alternative is the same model. Profiles: **D** Opus 5.5, high; **I** Sonnet 5.5, medium; **M** Haiku 5.5, low; **R** Fable 5.1, high (final review, a different model from every producer). Effort-control support is assumed from this session's controls. Worker handoff for every row: scope = the task, working directory = repo root, tools = Read/Edit/Bash/Grep, result returned to the active `kbd-apply` driver, which alone begins and ends tasks.

| Phase path | Change ID | Task | Requirements | Model / effort | Prerequisites |
|---|---|---|---|---|---|
| phase-v4-a2ui-runtime-hardening | a2ui-release-status-reconcile | 1 | provenance record | M / low | none |
| | | 2 | 13-entry status JSON, full SHA, regenerate dependent artifacts | I / medium | npm access |
| | | 3 | pins in two documents | M / low | none |
| | | 4 | root changelog heading, changeset | M / low | none |
| | | 5 | list readers, read expectations | I / medium | tasks 2–4 |
| | | 6 | prepare tag command, no push | M / low | operator approval before execution |
| | a2ui-webcore-node-probe | 1 | frozen-lockfile install | I / medium | network |
| | | 2 | scripted Node import and sequence | I / medium | task 1 |
| | | 3 | go/no-go record | I / medium | task 2 |
| | a2ui-runtime-limits | 1 | typed options, defaults, callback | I / medium | none |
| | | 2 | pre-apply counting, atomic rejection | D / high | task 1 |
| | | 3 | `setLimits`, `getLimitUsage` | I / medium | tasks 1–2 |
| | | 4 | README documentation | M / low | tasks 1–3 |
| | a2ui-activity-idempotency | 1 | creator/updater tracking | D / high | limits done |
| | | 2 | ordering key and epoch | D / high | task 1 |
| | | 3 | canonical digest, bounded maps wired to limits | D / high | task 2 |
| | | 4 | per-surface operation filtering | D / high | task 2 |
| | | 5 | reconcile in place, v1 path | D / high | tasks 1–4 |
| | | 6 | per-path base tracking, `onConflict` | D / high | task 5 |
| | | 7 | `MESSAGES_SNAPSHOT` handler | D / high | tasks 1–4 |
| | | 8 | behavior-change docs, changelog | M / low | tasks 1–7 |
| | a2ui-versioned-deltas | 1 | dev dependency and peer range, network | M / low | none |
| | | 2 | delta handler, `add`/`test` only | D / high | task 1, idempotency done |
| | | 3 | bounded buffer, timers, `dispose()` | D / high | task 2 |
| | | 4 | held-version API, single `forwardedProps` builder | I / medium | tasks 2–3 |
| | | 5 | refusal reporting with resync | I / medium | task 4 |
| | a2ui-action-ids | 1 | RFC 9562 UUIDv7, no new dependency | I / medium | none |
| | | 2 | emission for executed v0.9.1 and v1 actions | D / high | task 1 |
| | | 3 | extend the builder | I / medium | tasks 1–2, deltas#4 |
| | | 4 | `retryAction` | D / high | task 3 |
| | | 5 | stale-action operations | D / high | tasks 3–4 |
| | | 6 | document two ids | M / low | tasks 1–5 |
| | a2ui-headless-export | 1 | split catalog from React | D / high | probe go; D2 |
| | | 2 | headless entry, same validation | D / high | task 1 |
| | | 3 | lossless export | D / high | task 2 |
| | | 4 | v1 metadata exportable | D / high | task 3 |
| | | 5 | orphan pruning, accounting | D / high | task 3 |
| | | 6 | exports, tsup entry, registry entryPoints | M / low | tasks 1–5 |
| | a2ui-hardening-acceptance | 1 | scaffold package, workspace, aliases, lockfile | I / medium | runtime changes wired; network |
| | | 2 | SSE producer, records envelopes | I / medium | task 1 |
| | | 3 | consumer page through hooks layer | I / medium | task 2 |
| | | 4 | one `typecheck:affected` | M / low | tasks 1–3 and all production tasks |
| | | 5 | docs, existing-gate reconciliation, scoped refresh, `verify:skills` | I / medium | task 4 |
| | | 6 | author Cucumber and Playwright scenarios | I / medium | tasks 1–5 |
| | | 7 | run once, fix, rebuild, rerun; AUI-13 comparison | D / high | task 6; Playwright browsers |
| | | 8 | artifact-only review, evidence, archive | R / high | task 7; no tag or publish without approval |

## Contract binding

`adopted-contract.draft.json` for this phase exists, binds to the canonical run reported by `prometheus kbd status` (its name comes from the earlier phase that started the run) and maps AUI-1..14 to `a2ui-hardening-acceptance#7`. **It is not adopted.** Adoption (`kbd-contract-adopt.sh`) records an operator decision, which I do not make for you; until it is adopted the Plan→Execute readiness gate blocks `/kbd-apply`. Its gate commands are all BLOCKED-UNTIL-AUTHORED, so a contract amendment is certain once scenarios are authored. Its budget is a proposal: 150 min, 400 tool calls, 3 repair attempts.

## Risks carried

- Design verified by reading source; `web_core` behavior unobserved until the integration run.
- Limit defaults provisional and enforced by default (a breaking change for large hosts); buffer limits are wired in changes 4 and 5.
- AUI-5 and AUI-7 are only as strong as the repo-written producer.
- Minor release for a behavior change, no compatibility flag, unless a consumer relying on the old `replace` behavior is identified.
- Existing gates (`test:a2ui-bridge`, `bdd:a2ui-bridge`) will fail until `a2ui-hardening-acceptance#5` reconciles them; the plan keeps that edit at the final boundary.

## Unresolved review findings (round 2 was the last round)

- RESOLVED by `a2ui-release-status-reconcile#5`: the bridge step does assert the old pins (`steps.ts:252-253`, written with escaped dots, which my first search missed). The reviewer was right; the assertion is listed for `a2ui-hardening-acceptance#5` in `evidence/release-readers.md`.
- Whether `cucumber.mjs` picks up new feature files, and how `scripts/verify-a2ui-visual-evidence.mjs` interacts with the changes: checked in `a2ui-hardening-acceptance#6`.
- Stale-action rejection wire shape and the resync wire shape: decided during implementation and recorded.
- Round-1 and round-2 findings counts in this document are the author's tally, not independently verified.
- Operator confirmation of the Claude decisions in the table above (new example package, emission for executed v0.9.1 actions, Flutter-contract section, gate-expectation edits).
