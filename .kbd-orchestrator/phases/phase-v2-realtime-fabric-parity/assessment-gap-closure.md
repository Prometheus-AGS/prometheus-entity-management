# Assessment Addendum — Parity Gap Closure (2.2.0, held)

**Date:** 2026-06-21
**Trigger:** Post-delivery review found 5 competitive features were delivered as *contracts/seams* but parity was **claimed, not proven**. User directive: fully scope/design/implement a complete response and close these in 2.2.0 (held in PR #3 until proven).
**Decisions:** (1) Hold 2.2.0; fold gap closure into `feat/v2-realtime-fabric-parity`. (2) Build a FULL incremental query engine (not a ceiling).

## Root cause

The original 8 changes encoded **contract correctness** ("X unit tests pass") but never **parity proof** ("tested against the real competitor-class system") as an acceptance criterion. The gaps are missing acceptance scope, not broken code.

## Environment recheck (blockers re-evaluated)

| Prior blocker | Status NOW |
|---|---|
| `@prometheusags/frf-sdk` unpublished | **RESOLVED** — built at `flint-realtime-fabric/sdks/ts/dist` (`SpineClient.subscribe()`/`publish()`); `@prometheusags/frf-entity-management` also built. Live integration test is now possible. |
| `loro-crdt` only guard-tested | **RESOLVABLE** — `loro-crdt@1.13.6` installable from npm; real merge-math tests possible. |
| Tauri SQLite mock-only | **RESOLVABLE** — conformance test via `better-sqlite3` (same SQL dialect) in-process, or a Tauri harness. |
| Time-travel = read-only timeline | **CODE GAP** — need real rewind/replay of the live graph (materials exist: action log + snapshot clone). |
| Incremental queries deferred | **DECISION REVERSED** — build full incremental view maintenance. |

## The 5 gaps → acceptance criteria (what "proven" means)

- **G1 Flint parity:** an integration test drives a real `SpineClient`/`frf-entity-management` instance (in-process spine or test double of the *real* SDK, not a hand-fake), publishes an entity event, and asserts it lands in the graph through `createFlintAdapter`. Round-trip publish→subscribe proven.
- **G2 CRDT parity:** `createLoroMergeStrategy` exercised with **real `loro-crdt` installed** — two concurrent divergent field writes converge identically regardless of apply order (commutativity/convergence proven), not just the missing-peer guard.
- **G3 Incremental queries:** a real incremental view layer where a single-entity change updates a derived list without full re-derivation; benchmark proves sub-linear update cost at 100k rows vs the current O(n) baseline.
- **G4 True time-travel:** devtools can rewind the **live** graph to a prior recorded state and replay forward; not just inspect a log. Round-trip (snapshot N → restore → current) proven.
- **G5 Persistence parity:** Tauri SQLite adapter validated against a **real SQLite engine** (better-sqlite3 conformance) — persist/hydrate a full graph snapshot and assert byte-equality after reload.

## Non-goals (unchanged)
- WebRTC/P2P (Flint-owned). Full AG-UI client (ingestion bridge already shipped + will get an integration test only if cheap).

## Risk register
- **G3 is the heavy item** (differential dataflow integration). Mitigation: implement behind the existing `applyView`/`useEntityView` API so it's internal; gate on the existing benchmark as the regression floor; if d2ts (0.1.x) proves unstable, fall back to a hand-rolled dirty-tracking index that still beats O(n) — either way the acceptance test (sub-linear at 100k) is the bar.
- **G1 live test** must not make CI depend on a running external spine — use an in-process/embedded spine or the real SDK against a loopback, skippable if unavailable but RUN in this session.
