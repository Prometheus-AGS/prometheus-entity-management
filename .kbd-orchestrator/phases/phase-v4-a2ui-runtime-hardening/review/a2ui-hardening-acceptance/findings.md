# Artifact-only review: phase-v4-a2ui-runtime-hardening (cumulative)

Reviewer: fresh general-purpose subagent given only the artifact paths and the README claims, no generation history.
Scope reviewed: `packages/a2ui-react/src/**` changes. Not reviewed in depth: `examples/agui-activity-lab/`, README text.
Method: code reading plus `@a2ui/web_core@0.12.0` source; nothing was run. **None of these findings has been reproduced or verified by me yet.**
Verdict under the kbd-execute rule: no CRITICAL finding, so not BLOCK; two HIGH findings are WARN.

| # | Sev | Finding | Where |
|---|---|---|---|
| 1 | HIGH | v1 `actionResponse` is handled after the live apply and commit and can throw a non-limit error, leaving surfaces changed, the ledger uncommitted, a misleading `batch-refused` fault and resync | `runtime-core.ts:251`, `:739-755` |
| 2 | HIGH | Input-size caps run after `planActivity` (clone, canonicalize, digest); buffered deltas have no size cap, are not de-duplicated, up to 100 buffered; deep nesting raises raw `RangeError` | `runtime-core.ts:163/373/385`, `activity-plan.ts:161`, `delta-buffer.ts:45` |
| 3 | MEDIUM | Component payload bytes uncapped (only count and per-call bytes) | `limit-checks.ts:97-104` |
| 4 | MEDIUM | Data keys `constructor`/`prototype`/`__proto__` make `DataModel.get` throw in `planActivity`, before the `try`, so no fault or resync; `drainBuffer` swallows it | `data-reconcile.ts:171,188`, `runtime-core.ts:513-517` |
| 5 | MEDIUM | `deleteSurface` + `createSurface` + data write of the same surface in one activity reuses the old data base; the recreated surface loses its data | `activity-plan.ts:186-188,232` |
| 6 | MEDIUM | Per-call cost proportional to held state (shadow rebuild clones everything) | `runtime-core.ts:791-817`, `shadow-seed.ts` |
| 7 | LOW-MED | `v1Actions` keys `${surfaceId}:${componentId}` collide when ids contain `:` | `runtime-core.ts:172-176,209,219-222` |
| 8 | LOW | `keysOf` disagrees with the official `parsePath` (leading slash, empty segments) | `data-reconcile.ts:73-79` |
| 9 | LOW | Shadow seed drops per-component `catalogId`; may wedge `preflight` with several catalogs | `shadow-seed.ts:30-36` |
| 10 | LOW | False `version-conflict` for delta vs snapshot at the same key; huge version wedges a surface; `pendingActions` never pruned; `dispose()` leaves v1 promises live | `activity-ledger.ts:131-135`, `runtime-core.ts:713` |

Checked fine by the reviewer: no prototype pollution through the ledger/maps, iterative depth measure, shrink-safe limit rule, delta ordering and drain, timer cleanup, allowlist on both paths, UUIDv7 layout, export fixed point for ordinary surfaces.

## Disposition (operator chose: fix 1-5, add flows, rerun, archive)

| # | Disposition |
|---|---|
| 1 | Fixed: a failing `actionResponse` write is reported as `batch-refused`, not thrown. Flow AUI-15. |
| 2 | Fixed: call caps run before planning and before buffering; waiting deltas are de-duplicated by fingerprint; a `RangeError` from planning is reported as `invalid-message`. Flow AUI-16. |
| 3 | Fixed: new `maxComponentBytes` limit (1 MiB per surface). Flow AUI-17. |
| 4 | Fixed: planning reads a key the official model refuses as absent, and every error inside planning is reported through `batch-refused` and a resync. Flow AUI-18. |
| 5 | Fixed: a `deleteSurface` in an activity resets the data base and live reads for that surface. Flow AUI-19. |
| 6-10 | NOT fixed; recorded as follow-ups. |

Discrimination check: with fixes 1, 3 and 5 temporarily reverted, flows AUI-15, AUI-17 and AUI-19 each failed; the tree was restored byte-identical (verified with `cmp`) and the full set rerun green (15 browser flows, 4 headless checks, 6 Cucumber scenarios). Fixes 2 and 4 were not reverted for a discrimination check, so AUI-16 and AUI-18 are not shown to fail without their fixes.
