PLAN: phase-v2-realtime-fabric-parity — Gap Closure (held 2.2.0)
Date: 2026-06-21
OpenSpec available: YES
Changes: 5 (G1–G5) on branch feat/v2-realtime-fabric-parity (folded into PR #3)
Acceptance bar: PARITY PROVEN (tested against real competitor-class systems), not just contract-correct.

CHANGE LIST (ordered)

G1. v2-gap-flint-live-integration — prove Flint round-trip against the real SDK
   - Closes: "Flint parity NOT proven"
   - Scope: test + tiny glue (consume @prometheusags/frf-entity-management built dist)
   - Acceptance: publish an entity event via real SpineClient/frf adapter → assert it lands in graph via createFlintAdapter; round-trip proven. CI-safe (in-process/loopback; skip-with-loud-log if SDK unresolved, but RUN this session).
   - Complexity: M

G2. v2-gap-crdt-real-merge — prove Loro convergence with real loro-crdt
   - Closes: "merge math unproven in CI"
   - Scope: add loro-crdt devDependency; real convergence tests
   - Acceptance: two divergent concurrent field writes converge identically regardless of order; LWW vs CRDT difference demonstrated. Real engine, not guard.
   - Complexity: M

G3. v2-gap-incremental-queries — FULL incremental view maintenance
   - Closes: "TanStack DB sub-ms incremental deferred"
   - Scope: incremental evaluator behind existing useEntityView/applyView API; index + dirty-tracking (or d2ts) so a single change updates a derived list sub-linearly
   - Acceptance: benchmark proves sub-linear single-row update at 100k vs O(n) baseline; results identical to full re-derivation (correctness parity); existing evaluator.bench baseline still the floor.
   - Complexity: L (heaviest)

G4. v2-gap-true-time-travel — rewind/replay the live graph
   - Closes: "time-travel is read-only inspection"
   - Scope: snapshot ring + restore() in graph/devtools; Timeline tab gains jump-to-state that mutates the live graph + replay-forward
   - Acceptance: record N states → restore to state K → graph matches snapshot K → replay to N → matches original. Round-trip proven; bounded history.
   - Complexity: L

G5. v2-gap-persistence-conformance — real SQLite conformance for Tauri adapter
   - Closes: "tested with fake DB, not real runtime"
   - Scope: better-sqlite3 devDependency; conformance test driving the SAME TauriSqlClient surface against a real SQLite engine
   - Acceptance: persist a full graph snapshot → reopen → hydrate → deep-equal original. Real SQL engine, real upsert/delete semantics.
   - Complexity: M

EXECUTION ROUND ORDER
Round 1 (parallel, independent): G1, G2, G5 (test-led, isolated)
Round 2: G3 (incremental engine — core), G4 (time-travel — graph+devtools)
   G3/G4 touch core/graph; do after the isolated proofs so the suite is green underneath.

VERIFICATION (per change): pnpm typecheck + test; refresh:exports + verify:skills if exports change; treeshake.
RELEASE GATE (folds into 2.2.0): all 5 acceptance tests green + original 201 still green + prepublishOnly + npm dry-run.

SYCOPHANCY CHECK
- S-02: Each acceptance criterion names the REAL system under test (real SDK / real loro-crdt / 100k benchmark / live-graph restore / real SQLite) — no "unit test passes" stand-ins.
- S-03: G3 risk (d2ts 0.1.x) has a documented fallback (hand-rolled dirty-tracking) with the SAME acceptance bar.
- S-07: Exactly the 5 user-listed gaps; no additions.

PLAN COMPLETE
