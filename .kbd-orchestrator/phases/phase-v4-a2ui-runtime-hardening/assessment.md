# Assessment — phase-v4-a2ui-runtime-hardening

**Date:** 2026-10-28 (revision 3, after two adversarial review rounds)
**Phase goals:** GitHub issues #70–#74 (Prometheus-AGS/prometheus-entity-management), filed 2026-10-28 from the Universal Agent Runtime (UAR) A2UI surface-architecture review.
**Package under assessment:** `packages/a2ui-react` at `28a500d6` (published as `@prometheus-ags/a2ui-react` 4.2.0).
**Evidence standard:** static reading of source and of three published tarballs: `@prometheus-ags/a2ui-react` 4.2.0, `@ag-ui/core` 1.0.3 and `@a2ui/web_core` 0.12.0. **Nothing was built or run**, so every behavior below is "read in source", not "observed".

## Method notes

- Model preflight: unavailable (`preflight-models.sh` absent from the installed pack). Recorded, not blocking.
- `prior-context.md` was not generated for this phase. No recalled lessons are cited. Knowledge gaps: none recorded (the file that lists them is absent).
- Triage by an independent read-only agent, re-checked by hand. Review round 1 found 5 CRITICAL; round 2 found 5 more, nearly all because the first design leaned on `web_core` behavior marked UNKNOWN. This revision reads that source and rebuilds the design on it. Two rounds is the cap, so remaining items are listed under "Unresolved review findings".

## Decision status (read before the specs)

| Decision | Status |
|---|---|
| Support the AG-UI 1.0 spec | **ADOPTED**, explicitly. `@ag-ui/core` latest is 1.0.3; the package pins `>=0.0.59 <0.1.0`. Peer-range detail is a recommendation: dev dependency 1.0.3, peer `>=0.0.59 <0.1.0 \|\| ^1.0.0` for this phase. |
| Reconcile rather than replace | **ADOPTED**, with these points confirmed by the operator on 2026-10-28: **producer wins** when producer and user both changed a path; a message absent from a `MESSAGES_SNAPSHOT` **leaves its surfaces alone**. The rest of the design below is a candidate for Plan. |
| No CRDT for concurrent delivery | **ACCEPTED** ("continue with all this"). |
| Action id | **ADOPTED 2026-10-28:** `actionId`, UUIDv7, at `forwardedProps.a2uiAction.actionId` with `heldVersion` beside it. |
| Epoch type | **AGREED 2026-10-28** ("agreed, run /kbd-plan"): a whole number the producer raises on every restart (its start time in milliseconds). |
| Deltas without a version | **AGREED 2026-10-28:** reject them with a clear error; versionless snapshots still work. |
| Version location (D4) | **AGREED 2026-10-28:** inside the activity `content`, not `metadata`. |
| Server mirror needs headless entry (D2) | **AGREED 2026-10-28:** keep #73, schedule it last behind the Node-loadability probe, drop it to a follow-up if the probe fails or UAR says no. |
| Surface and component caps | **ADOPTED 2026-10-28 (add them).** Values and management are recommendations in the Limits section. |
| Peer range | **CONFIRMED 2026-10-28:** `>=0.0.59 <0.1.0 \|\| ^1.0.0`, dev dependency 1.0.3. |

## What the protocol sources define

Verified in the published `@ag-ui/core` 1.0.3 package:
- `ActivitySnapshotEvent`: `messageId`, `activityType`, `content` (any non-array object), optional `replace`. Schemas are loose, so extra fields pass.
- Every event extends `BaseEvent`, which has an optional `metadata`.

From documentation pages only (the activity page I read was the **draft** spec, not 1.0; confirm against 1.0.3 in Plan):
- `replace` defaults to true; a snapshot overwrites activity content; `ActivityDelta` requires `activityType` and carries RFC 6902 operations.
- An activity-bearing `MESSAGES_SNAPSHOT` is the complete set for that role.
- The spec defines no version, sequence, idempotency, replay or concurrent-stream behavior.

Verified in `@a2ui/web_core` 0.12.0 source (`src/processing/message-processor.js`, `src/state/data-model.js`), read not run:
- `createSurface` on a held surface **throws** `Surface X already exists` (`:466`).
- `updateComponents` on a missing surface throws (`:570`). For an existing component it replaces `properties` wholesale (`:~548`); components not mentioned persist. A component is removed only if its type or catalog changes (`:549`).
- `updateDataModel` calls `dataModel.set(path, value)` (`:592`); path `/` replaces the entire model (`data-model.js:88-90`). Notifications are synchronous.
- `processMessages` is synchronous; `processMessagesAsync` exists for RPC functions.
- `web_core` has **no surface or component caps**; `ValidationConfig` has only `allowedMessages`. `a2ui-react` has no caps either (grep found none). It does have catalog and component allowlisting (`runtime.ts:141`, `:511`).
- Not verified: Node-loadability of `web_core` (depends on `lit`, `@lit/context`, `@preact/signals-core`).

## Gap analysis

| Goal | Current state (evidence) | Gap | Verdict |
|---|---|---|---|
| #74 release facts | `release/npm-registry-status.json`: `candidate-prepared-unpublished`, `verifiedAt` 2026-10-08, all 13 package entries at 4.1.1, `candidateSourceSha` and `certifiedPackageSourceSha` both `c5a3a101` (the 4.1.1 release commit). Registry `latest` is 4.2.0 for at least six packages (a2ui-react, entity-graph-core, prometheus-entity-management, entity-graph-react, entity-graph-sync, entity-graph-a2a). No `v4.2.0` tag (tags stop at `v4.1.1`). Root `CHANGELOG.md:8` reads `[4.2.0] - unreleased (prepared, not published)`. `packages/a2ui-react/CHANGELOG.md` tops out at 4.0.0. `release/a2ui-protocol-bridge.md:59-60` lists `web_core` 0.10.5 and `@a2ui/react` 0.10.2 against pins of 0.12.0; `markdown-it` line 61 not checked in detail. Published 4.2.0 exports `createPrometheusA2uiComponent`; `gitHead` is null; `34a21156` is the last commit touching published packages (the choice of it as the published source is inferred from the exports). | Update the status file for all packages including both source SHAs, both changelogs, the bridge pins; tag `v4.2.0` (outward-facing, needs approval). Repo-wide scope. | Real |
| #70 redelivery | `runtime.ts:276` handles only `ACTIVITY_SNAPSHOT`; `MESSAGES_SNAPSHOT` returns false, so replay handling is a new feature. `:289` ignores only `replace:false` for known ids. `:295-300` adds every surface mentioned by any of four operation types to the message's set, so an updater "owns" what it updates. `:306-313` deletes every owned surface, then re-applies; `:314` overwrites the map. No digest or version. | Digest and version tracking, creator tracking, `MESSAGES_SNAPSHOT` handler, per-path data tracking. **Behavior change:** the legacy test "honors replacement" (`official-a2ui.test.tsx:322-376`) asserts delete-then-recreate; that behavior is changed intentionally and must be called out in the changelog. | Real defect |
| #71 deltas | No delta handler, held-version API or resync signal. | Delta handler, version, held-version report, error and resync, stale-action operations. | Real gap |
| #72 action ids | `:128` per-instance counter; `:366` id only for v1 `wantResponse`, **inside the action object**, keys `pendingActions`. | Idempotency id that leaves the v1 correlation id alone; runtime retry API; envelope helper using `getClientDataModel()` (`:335`). | Real gap |
| #73 headless + export | Shadow rebuild in `preflight` (`~:437-486`) drops component `catalogId`/`rootId`; `v1-compat.ts:129-141` moves response metadata to a private map. No public export or headless entry. | Headless entry (Node-loadability UNKNOWN; need pending D2), lossless export, orphan pruning. Independent of #70/#71. | Real gap |

## Candidate design, built on the verified `web_core` behavior

This is an input to Plan, **not a settled specification**. Items marked (Plan) still need a decision.

1. **No deletion without an explicit `deleteSurface`.** Omission from a `replace:true` restatement deletes nothing. `replace:false` stays "ignore if known".
2. **Restatement applies as updates, with held-surface handling.** Because `createSurface` on a held surface throws, the runtime strips `createSurface` for surfaces it holds and applies only `updateComponents` and filtered data writes. If the restated `catalogId`, `theme` or `sendDataModel` differs from the held surface, that is a producer fault reported to the host, not silently applied (Plan: exact reporting). The v1 path (`clearSurfaceActions`, `nextV1Surfaces` handling) must stay correct when `createSurface` is dropped (Plan: verify against `v1-compat.ts`). Components the producer stops referencing persist as orphans (web_core never removes them); they are pruned at export (#73), and live-surface compaction is a Plan item.
3. **Ordering key.** `(surface, epoch, version)` orders applies; a separate content digest is used only to detect a conflict at an equal key. The digest is computed over canonical JSON after normalizing the protocol version (Plan: canonical form). A stale key under a new `messageId` is stale, not unseen.
4. **Epoch.** Recommended: an integer assigned by the producer that strictly increases across restarts; a version with no epoch means epoch 0. A higher epoch resets ordering; a lower one is ignored, so a replay of an old epoch cannot roll a surface back.
5. **Versionless producers.** Snapshots without a version are deduped by digest only and out-of-order replay is *not* protected (documented limitation). Versionless **deltas are rejected** with a validation error, so nothing waits forever.
6. **Data model.** Because path `/` replaces the whole model, the runtime never hands a producer's raw data write to `web_core`. It stores, per surface, the last producer-applied value per path, and writes only paths whose incoming value differs from that base. A path is *locally modified* when its current value differs from the base; this needs no attribution mechanism, and `responsePath` writes count as local. Both changed: **producer wins and a conflict is reported** (recommended; operator policy decision). Re-applying an identical producer value never writes.
7. **Tombstones.** A bounded record of deleted surfaces `(surface, epoch, version)` prevents a redelivered `createSurface` from resurrecting a deleted surface (Plan: size and eviction).
8. **Ownership and version scope.** Track the creator (`createSurface`) separately from updaters. Versions are per surface and carried as a map, so a message touching two surfaces has two versions and per-surface filtering of its operations (Plan: operations arrays are not segregated by surface).
9. **`MESSAGES_SNAPSHOT`.** Activity messages go through the same idempotent path. A message absent from an activity-bearing snapshot is untracked as a message but its dedupe state is retained in the tombstone-style record; its surfaces are not deleted. Tracking maps are bounded.
10. **Deltas.** Only `add` to the operations list and `test` (to assert the held version) are honored; `remove` cannot be honored because web_core has no remove-component. The runtime keeps a per-message copy of content to patch (Plan: memory bound).
11. **Delta before snapshot, or a gap.** A bounded buffer (size and time chosen in Plan), then a host resync callback. AG-UI has no resync event, so the request is proposed to travel in `forwardedProps` next to actions. `dispose()` clears buffers and timers. Per-surface serialization is trivial while apply is synchronous and matters only once buffering exists.
12. **New host-facing channels.** Conflict, producer-fault and resync reports are new public options on `CreatePrometheusA2uiRuntimeOptions` (today only `onActionDecision`, `onRendererMessage`, `onFunctionCall`). They are new public API: `pnpm run refresh:exports` and `verify:skills` apply. Invalid input keeps today's behavior of throwing from `processAgUiEvent`; non-throwing producer faults go to the callbacks.

Concurrent delivery: per-surface apply is serialized; separate sessions keep separate surfaces and typed input. No CRDT.

## Action id proposal (needs confirmation)

- `actionId`: a globally unique id (UUIDv7 recommended), created once per interaction, at `forwardedProps.a2uiAction.actionId` with `heldVersion` beside it. The raw A2UI v0.9.1 action object is unmodified.
- The v1 `wantResponse` correlation id stays inside the action as today: **correlation** (per runtime instance) and **idempotency** (`actionId`, global) are two ids with two jobs.
- "Retry reuses the id" holds only if the runtime owns the retry, so Plan adds a runtime retry API; a host re-sending on its own mints a new id.

## Flutter and web

- **Web:** all five issues. #74 is repo-wide; the rest are `packages/a2ui-react`.
- **Flutter:** a Dart A2UI *consumer* exists as an example, not a package: `examples/flutter-riverpod/lib/a2ui/` (about 437 lines) with `genui` `SurfaceController`, `a2ui_core` messages and an app-owned action policy, plus a base-merge precedent in `lib/transport/offline_convergence.dart`. It has no AG-UI activity handling, so #70–#72 are not defects there. No packaged Dart runtime exists.
- `release/a2ui-protocol-bridge.md` has **no Flutter section**; line 167 lists "Flutter or native A2UI rendering" as out of scope, and `tests/steps/v3-a2ui-protocol-bridge.steps.ts` reads the document, so edits can break the step.
- **For this phase:** Flutter is out of implementation scope (overlaps epic #65; its "web PARTIAL, Flutter NOT-STARTED" status is the triage agent's, not #65's text). A new Flutter-contract section stating the normative semantics is added to the bridge doc after Plan confirms the step reader tolerates it.

## Adopted-outcome contract inputs (several are UNKNOWN, so this is incomplete)

| Input | Value |
|---|---|
| User operation | A host applies agent-produced A2UI surfaces from an AG-UI stream with no loss, rollback or duplicate effect under redelivery, incremental update, reconnect and multiple tabs, and can validate or compact a surface headlessly with the same rules. |
| Observed baseline | As in the gap table. UNKNOWN: Node-loadability of `web_core`; whether typed-input loss is visible to a user. |
| Desired observable result | Redelivery never changes a held surface or loses typed input; deltas and resync converge; action ids are unique across tabs and reloads; export is a fixed point; headless and React agree. |
| Supported environments | Chromium via Playwright; Node for the headless entry. No Safari, Firefox or Flutter. |
| Safety checks (real boundary: agent-generated UI to the catalog allowlist) | Every path (snapshot, delta, restatement, `MESSAGES_SNAPSHOT`, headless, export) goes through the existing catalog and component allowlist. **Surface and component caps do not exist** in this package or in `web_core`; the operator decided on 2026-10-28 to add them (provisional values and management in the Limits section). No secrets logged. |
| Exclusions | Flutter implementation, CRDT, collaborative input merge, epic workstreams #59–#69, tagging or publishing without approval, server-side action arbitration (UAR). |
| Risk acceptance | **AGREED 2026-10-28** as written in the Risk acceptance section below, with one addition surfaced at Plan: caps are enforced by default, which can reject activities that large hosts accept today. |
| Decision owner | Operator. UAR decisions D2 and D4 are pending per the issues. |

## Value scenario candidates (PROPOSALS, none adopted, likelihood UNKNOWN)

Real entry: a real AG-UI 1.0 producer feeding `PrometheusA2uiRuntime` in a real browser. **No producer exists** (`examples/agentic-a2ui-app` never calls `processAgUiEvent`), so a small producer endpoint that records the envelopes it receives is a prerequisite *production* task. Reuse the existing Cucumber and Playwright infrastructure (`tests/features`, `tests/steps`, `tests/browser`, `cucumber.mjs`).

| ID | Observation | Negative control | Issue |
|---|---|---|---|
| AUI-1 | Duplicate create activity leaves the held surface and typed input unchanged | Same epoch and version, different digest: first kept, fault reported | #70 |
| AUI-2 | Duplicate and out-of-order **versioned** updates change nothing already applied and typed input survives | A stale version under a *new* `messageId` is also ignored. Versionless producers are outside this guarantee | #70 |
| AUI-3 | `MESSAGES_SNAPSHOT` replay of a thread with live input keeps surface and input | A snapshot omitting the activity does not delete the surface; a redelivered `createSurface` after `deleteSurface` does not resurrect it | #70 |
| AUI-4 | A newer restatement applies as updates; an unchanged producer value never overwrites typed input | Assert the **final value** under the chosen conflict policy, not only the event: producer-wins means the producer's value, and the conflict is reported; a surface omitted from the restatement survives | #70 |
| AUI-5 | Two concurrent streams carrying one activity apply it once, including when the same surface version arrives under two different `messageId`s | Same key, different digest: first kept | #70 |
| AUI-6 | Versioned delta applies in order; a gap or missing snapshot triggers resync; a refused batch reports the validation error | Delta introducing a component outside the allowlist is rejected, surface unchanged; versionless delta rejected | #71 |
| AUI-7 | A held-version report on reconnect returns only the missing operations | Limitation: the producer is repo code, so this proves the runtime's report, not a third party's behavior | #71 |
| AUI-14 | Operations returned with a stale-action rejection are applied | Rejection with no operations triggers resync | #71 |
| AUI-8 | Two browser contexts and a reload produce distinct `actionId`s at the producer endpoint; the runtime retry API reuses one | Two distinct actions never share an id. Server-side arbitration is out of scope | #72 |
| AUI-9 | The envelope **received by the real producer endpoint** from a real browser action for v0.9.1 and v1, with and without `sendDataModel` | Missing data model when `sendDataModel` is set fails | #72 |
| AUI-10 | export → fresh runtime → export is a fixed point including v1 action responses | An export that loses `rootId` or `catalogId` fails | #73 |
| AUI-11 | Headless and React runtimes accept and reject the same corpus | Corpus includes allowlist violations | #73 |
| AUI-12 | Unreachable components are absent from the export | A reachable component is never pruned | #73 |
| AUI-13 | Status files, both changelogs, bridge pins and `v4.2.0` agree with the registry (**delivery-only**) | A stale pin fails. Tag part is NOT_EXERCISED until approved | #74 |

Deferred, for owner review: Firefox/Safari; Flutter lifecycle (epic #65); load on many surfaces; collaborative input merge; surface and component caps.

## Ordering, effort and open items

Single writer on `runtime.ts` and `v1-compat.ts`, so work is serialized, but #73 does **not** depend on #70/#71 tracking. Order: **#74, a `web_core` Node-loadability probe (cheapest remaining unknown, gates #73), #70, #71, #72, #73.** Public export changes need `pnpm run refresh:exports` and `pnpm run verify:skills`.

Effort (active coding-agent hours, **estimates, not measurements**): #74 2–3, #70 6–9 (creator tracking, `MESSAGES_SNAPSHOT`, per-path base tracking, tombstones, new callbacks), #71 5–7, #72 3–4 (retry API), #73 6–9 **only if `web_core` loads under Node and D2 requires it**, producer and acceptance harness 4–6: about **26–38**. External waiting: tag push and any publish (human-approved); Playwright browser installs.

**Open before Plan (operator):** confirm this design, especially producer-wins on a both-changed path, the epoch type, `MESSAGES_SNAPSHOT` non-deletion and versionless-delta rejection; confirm `actionId` shape and UUIDv7; D2; D4; peer-range detail; whether to add surface and component caps; risk acceptance.

## Limits (recommendation; the decision to add caps is adopted)

Trust boundary: agent-generated UI arriving at the runtime. Without caps, a faulty or hostile producer can exhaust the browser's memory or CPU. Values below are **provisional defaults, not measured**; the acceptance harness measures real UAR-style surfaces and the defaults are then set with headroom.

| Limit | Provisional default |
|---|---|
| Surfaces per runtime | 64 |
| Components per surface | 2,000 |
| Components per runtime | 10,000 |
| Component nesting depth | 32 |
| Data model size per surface | 1 MiB |
| Operations per activity | 500 |
| Activity content size | 1 MiB |
| Delta buffer (waiting for a missing version) | 100 entries, 5 s |
| Tracked messages and tombstones | 1,000 each, oldest evicted |

- **Configuration:** a typed `limits` option when the runtime is created, validated at construction, with the defaults above. A library has no business reading environment variables.
- **When exceeded:** the offending activity is rejected whole, checked before anything is applied, the surface is left unchanged, and the producer-fault callback reports the limit name, its current value and the attempted value. Nothing is silently truncated.
- **Runtime changes:** a `setLimits(partial)` method lets the host tighten or loosen limits while running (for example a lower ceiling on a constrained device, a higher one for a paid tier). Changes apply to *future* activities and never evict an existing surface. `getLimitUsage()` lets the host show how close it is. A per-activity limit function is deferred until a real need appears.

## Risk acceptance (recommendation; needs the operator's yes)

Accept, because each is documented, bounded and fixable in a patch release:
1. **Behavior change:** a `replace:true` restatement no longer deletes surfaces. Release as a minor version (4.3.0) with a prominent changelog entry and `deleteSurface` as the migration. No compatibility flag unless a consumer is known to rely on the old behavior.
2. **Producer wins** can overwrite a user's in-flight edit in a true conflict; the conflict is reported so the host can warn.
3. **Versionless snapshots** are only protected by content comparison, not ordering.
4. **Design checked by reading source, not by running it,** until the integration run; `web_core` and AG-UI draft-spec details are confirmed only then.
5. **Limit defaults are provisional** until measured.

Do **not** accept: loss of typed input when a *versioned* activity is redelivered; any path that bypasses the catalog and component allowlist; publishing or tagging without an explicit approval and a passing full integration run.

## Unresolved review findings (round 2 was the last round)

Items the reviewers raised that Assess cannot close and that Plan must decide or the probe must answer:
- Node-loadability of `web_core`, and any runtime (not source-read) behavior above, remain unobserved.
- Canonical digest form, tombstone and tracking-map bounds, buffer size and time, and live-surface orphan compaction are named but not sized.
- The exact wire shape of the resync request and of the held-version report.
- Handling of a restated `catalogId`/`theme`/`sendDataModel` that differs from the held surface, and v1 `clearSurfaceActions` correctness once `createSurface` is stripped.
- Per-surface filtering of an operations array that is not segregated by surface.
- Whether the draft-spec statements about `replace` default and `MESSAGES_SNAPSHOT` hold in 1.0.3.
- AUI-5 and AUI-7 remain only as strong as the repo-written producer allows.
- The statement that the operator said "yes" to the action id before a name existed comes from the conversation and is not independently checkable.
