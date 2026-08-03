# Task 1 — dependency and execution-readiness gate

Date: 2026-08-01  
Change: `v3-sync-persistence-path`  
Verdict: **PASS TO IMPLEMENTATION; CURRENT FEATURE STATE IS NOT RELEASE-READY**

## Declared prerequisites

Both declared dependencies are complete, archived, promoted, and strictly valid.

| Dependency | Completion evidence | Promoted contract | Result |
| --- | --- | --- | --- |
| `v3-package-module-contracts` | `openspec/changes/archive/2026-08-01-v3-package-module-contracts`; all six tasks checked | `openspec/specs/v3-package-module-contracts/spec.md` | Pass |
| `v3-example-coverage-contract` | `openspec/changes/archive/2026-08-01-v3-example-coverage-contract`; all six tasks checked | `openspec/specs/v3-example-coverage-contract/spec.md` | Pass |

The package prerequisite establishes real packed-consumer evidence as distinct from workspace-source success. The coverage prerequisite establishes a shared offline/persistence/convergence scenario and keeps its `npm-sync` implementation evidence honestly incomplete until this change produces it. Neither archive is treated as proof that PGlite durability or Loro convergence already passes.

## Feynman transfer

The change-specific explanation and transfer assessment are recorded in:

- `.research/full-3.0-release-execution-readiness/v3-sync-persistence-path-feynman.md`
- `.research/full-3.0-release-execution-readiness/v3-sync-persistence-path-grade.json`

The assessment passes at `0.965` against a `0.70` threshold with `misconceptions_absent: 1.0`. Its governing distinction is:

> PGlite proves durable recovery for one client. Loro proves deterministic reconciliation between clients. The entity graph proves that the reconciled result reaches the public canonical read model. Reconnect proves that transport interruption does not lose the work needed by either of the first two guarantees.

No one of those receipts substitutes for another.

## Current implementation audit

Existing source is a useful candidate to adapt, not a stable-complete implementation:

- `packages/entity-graph-sync` has a provider abstraction, bridge, registry, Loro provider, and Yjs providers.
- Core has `createPGlitePersistenceAdapter`, `createLocalFirstRuntime`, and merge helpers.
- Current focused sync and core tests pass, providing a refactoring baseline.
- `@electric-sql/pglite` is absent from the workspace, so current persistence tests use mocks rather than a real close/reopen database.
- `loro-crdt` resolves to `1.13.9`, but the Loro provider test can return early when it is missing. A mandatory gate cannot be conditional.
- The provider uses deprecated `getOrCreateContainer` for per-entity maps. Loro 1.13.9 warns that concurrent first creation can fork child state; `ensureMergeableMap` is the deterministic alternative.
- The WebSocket channel drops sends while not open and implements neither a retry queue nor reconnect/resynchronization.
- Inbound peer changes are written to the graph without provenance/suppression, while the bridge republishes graph changes. That risks echo or ping-pong traffic.
- The bridge and provider registry are process-global. Two isolated same-type clients need injected `GraphStore`/registry ownership or an equally explicit isolation boundary.
- Import/export failures are swallowed, so a failed synchronization can appear successful.
- The sibling `/Users/gqadonis/Projects/prometheus/prometheus-entity-sync` contains useful gateway/reconnect prior art, but its current PGlite declaration is older and it is not a hermetic dependency of this repository.

## Dependency maintenance decision

Official registry and upstream sources were rechecked on 2026-08-01:

| Dependency | Selected current version | Release use |
| --- | --- | --- |
| `@electric-sql/pglite` | `0.5.4` | mandatory real persistence/reopen test dependency |
| `loro-crdt` | `1.13.9` | mandatory deterministic convergence implementation/test dependency |

The frozen pnpm lockfile must pin the tested resolution. Optional peer declarations may remain appropriate for consumers that do not select a provider, but the repository's stable release lane must install and execute both dependencies unconditionally.

## Authoritative implementation contract for task 2

Task 2 may proceed only within these boundaries:

1. Install current PGlite and make the current Loro version mandatory in the stable test lane; remove every early-return/skip path from mandatory tests.
2. Use a real file-backed PGlite database under an isolated temporary directory, close it, reopen it, and prove canonical entities/lists and intended local state recover. Respect PGlite's one-handle-at-a-time filesystem limitation.
3. Create two isolated graph clients with deterministic Loro peer IDs and deterministic child-map identity (`ensureMergeableMap` or a demonstrably equivalent primitive).
4. Prove offline writes, reconnect, repeated delivery, and both delivery orders converge in public graph reads—not only internal CRDT snapshots.
5. Cover different-field concurrent edits and same-field conflicts. The same-field policy must be deterministic, asserted, and documented.
6. Prevent inbound peer graph writes from being blindly republished as new local updates; test the provenance/echo boundary.
7. Do not drop disconnected writes silently. Queue/resend or an explicit resynchronization protocol must make reconnect lossless and testable.
8. Keep deterministic loopback convergence in the default mandatory lane. Label WebSocket/reconnect separately and enforce it whenever its integration lane is enabled.
9. Keep Yjs secondary; it cannot replace the selected Loro stable path.
10. Keep sibling `prometheus-entity-sync` explicit opt-in integration evidence. No absolute `link:` dependency, conditional local path, or sibling pass may satisfy the mandatory package gate.
11. Preserve components → hooks → stores/adapters → external I/O, one normalized canonical entity graph, separate patches, and ID-only lists.
12. Synchronize public exports, package contracts, skills, coverage evidence, and docs if implementation changes their declared surfaces.

## Evidence boundary

This headless dependency task does not alter a rendered UI. Screenshots would be decorative and are not valid proof of durable reload or CRDT convergence. The appropriate evidence is strict specification validation, real dependency-backed integration tests, deterministic transcripts/assertions, and packed consumers. Later Vite, Next.js, Flutter, Tauri, agentic A2UI, and Docusaurus changes remain responsible for truthful visual, accessibility, browser, device, trace, and video evidence.

No registry, GitHub Pages, remote service, sibling repository, signing system, or publication state was mutated by this task.
