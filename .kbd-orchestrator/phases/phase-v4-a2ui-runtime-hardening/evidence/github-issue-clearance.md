# GitHub issue clearance: #70-#74 (Prometheus-AGS/prometheus-entity-management)

Prepared 2026-10-28. Status of every issue: **OPEN, uncommented, unmodified.** Nothing was closed, commented on or deleted.
Evidence: `hardening-acceptance/browser-receipts.json` (16 flows) and `headless-receipts.json` (4 checks), one full local run, 6 Cucumber scenarios green. No CI was used.

## Not yet deliverable to dependents

All of this is **uncommitted, unpushed, untagged and unpublished.** The Universal Agent Runtime consumes the published npm package, so none of these issues is resolved for it until a release (minor, `4.3.0`, per the plan) is committed, certified and published. Clearing the issues needs operator approval for: the commit, the release, the `v4.2.0` tag, and any GitHub comment or close.

| Issue | Acceptance criterion | Status | Evidence / note |
|---|---|---|---|
| #70 | Fixtures: duplicate create, duplicate updates, out-of-order, `MESSAGES_SNAPSHOT` replay with live input; none changes a held surface or loses input | MET (local) | AUI-1, AUI-2, AUI-3 |
| #70 | Genuine restatement follows a documented rule with no silent data loss | MET (local) | AUI-4 (producer wins, conflict reported); README + bridge doc |
| #70 | Two concurrent streams: specified and tested | MET (local) | AUI-5 (one stream, two message ids) and AUI-5b (the lab holds two real EventSource streams on one runtime; interleaved replay and updates apply once each, typed input kept, no faults) |
| #70 | `replace:false` and `MESSAGES_SNAPSHOT` behavior documented | MET | README redelivery section, bridge doc |
| #71 | Delta, stale-version, gap, resync, reject-then-resync fixtures; typed input survives | MET (local) | AUI-2, AUI-6, AUI-7 (typed input asserted), AUI-14 |
| #71 | Targeted AG-UI version stated | MET | peer `>=0.0.59 <0.1.0 \|\| ^1.0.0`, developed against 1.0.3 (bridge doc) |
| #71 | Held versions exposed; client error + resync reporting | MET (local) | `getHeldVersions()`, `onProducerFault`, `onResyncNeeded`; AUI-6, AUI-7, AUI-15 |
| #72 | Ids unique across runtimes, tabs, reloads; retry reuses; new action gets new id | MET (local) | AUI-8 (two contexts + reload, UUIDv7, retry duplicate flag) |
| #72 | Envelope fixtures v0.9.1 and v1, with and without `sendDataModel` | MET (local) | AUI-9 (with), AUI-9b (without) |
| #73 | export -> fresh runtime -> export fixed point, incl. v1 action responses | MET (local) | AUI-10 (headless Node) |
| #73 | Headless and React runtimes accept and reject the same fixtures | MET (local) | AUI-11 (React runtime constructed in Node, no rendering) |
| #73 | Unreachable components absent from the export | MET (local) | AUI-12 |
| #74 | Registry status file and package tables match the registry | MET | AUI-13 compared 13 packages against live `npm view` |
| #74 | 4.2.0 has a tag, or its source commit is recorded | **PARTIAL** (tag needs push approval) | Source commit `34a211563fe7f06118996a40cc398c4c3af953ef` recorded in `release/npm-registry-status.json`; the `v4.2.0` tag is NOT created (needs approval). |
| #74 | Version that first ships application-supplied components stated | MET | 4.2.0 (tarball verified); package changelog |
| #74 | Bridge document matches pinned `web_core` | MET | 0.12.0 pins; AUI-13 asserts it. `release/a2ui-protocol-bridge.md:66` was corrected after checking the published exports: `@a2ui/react@0.12.0` has no v1.0 entry, `@a2ui/web_core@0.12.0` does export `./v1_0`. |

## Known caveats the downstream project should read

- Architecture review of the code found five defects (atomicity, caps, forbidden data keys, delete-then-create, component bytes); all five were fixed and have flows (AUI-15..19). Five lower findings (per-call cost proportional to held state, `v1Actions` key collisions with `:`, `keysOf` vs official path parsing, shadow-seed catalog id, ledger cleanup) are NOT fixed.
- The `a2uiResync` and stale-action rejection wire shapes are this runtime's proposals; the agent side must agree before relying on them.
- Resource caps are enforced by default: a breaking change for hosts with large surfaces.
- `verify:a2ui-bridge` is red from an upstream `@a2ui/web_core@0.12.0` typing error that predates this phase (`known-failure-bridge-gate-upstream-typing.md`); its packed ESM and visual lanes did not run.
- `openspec` backend verify fails for all eight changes (no spec deltas), so the changes are NOT archived (operator decision: option 2).
- Single browser (Chromium), single OS, and the producer is this repository's own, so AUI-5 and AUI-7 prove the runtime against our producer, not a third party's.
