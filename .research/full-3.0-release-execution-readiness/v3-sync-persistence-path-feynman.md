# Feynman readiness — deterministic persistence and convergence

Date: 2026-08-01  
Change: `v3-sync-persistence-path`

## Plain-language model

The entity graph is the application's current view of the world. PGlite is the durable notebook that lets one client recover that view after it stops and starts again. Loro is the reconciliation protocol that lets two clients independently edit their own copies and later agree on one result. These are different promises:

- reopening a notebook proves persistence, but says nothing about two peers resolving concurrent edits;
- two peers converging in memory proves merge behavior, but says nothing about surviving a process restart; and
- a WebSocket reconnect proves transport recovery only when unsent or missed changes are subsequently reconciled.

The mandatory release path therefore needs separate, composable oracles. A real file-backed PGlite instance must close and reopen. Two isolated graph stores with deterministic Loro peer IDs must make offline writes, exchange updates in controlled orders, and reach the same canonical entities. A reconnect test must prove the transport resumes without silently dropping local work. None of those tests may turn green by returning early when a dependency is absent.

## Why deterministic loopback comes first

A loopback channel is the laboratory bench for the merge algorithm: the test controls disconnects, delivery order, duplication, and reconnect. A WebSocket lane then verifies that the real transport preserves the same contract. Requiring a remote service for every unit/integration run would make network availability part of the oracle; using only loopback would leave reconnect behavior unproved. The two lanes answer different questions and both must be labeled honestly.

The sibling `prometheus-entity-sync` repository is useful prior art for gateway and reconnect behavior, but it cannot satisfy this repository's mandatory release gate through an absolute path, a conditional install, or a silently skipped test. Its integration remains explicit opt-in evidence until a reproducible current-repository job invokes it.

## Source-grounded corrections

- The current package advertises Loro as an optional peer and its provider test can return early when Loro is unavailable. That is incompatible with a mandatory stable gate.
- The current PGlite adapter tests use shaped mocks. They prove adapter calls, not durable PGlite close/reopen behavior.
- `@electric-sql/pglite` is not installed in the current workspace. The current official registry version is `0.5.4`.
- `loro-crdt` resolves to the current official registry version `1.13.9`.
- Loro 1.13.9 deprecates `getOrCreateContainer` for concurrently and lazily created child containers because peers can create incompatible child IDs. `ensureMergeableMap` provides a deterministic child-container identity and is the appropriate primitive for two-client entity maps.
- Loro's update export/import API supports incremental synchronization from an oplog version. Full snapshots may remain a deliberate initial implementation, but the protocol and tests must explicitly define replay, duplication, and reconnect behavior.
- PGlite's documented single-user/single-connection limitation means the durable test should close one handle before reopening the same filesystem database, rather than use simultaneous handles against one directory.

Primary sources checked on 2026-08-01:

- PGlite upstream README and interface source: <https://github.com/electric-sql/pglite>
- PGlite official registry metadata: <https://registry.npmjs.org/@electric-sql%2Fpglite>
- Loro upstream README: <https://github.com/loro-dev/loro>
- Loro official registry metadata: <https://registry.npmjs.org/loro-crdt>
- Installed Loro 1.13.9 declarations for `ensureMergeableMap`, `export`, `import`, `oplogVersion`, and `setPeerId`

## Transfer checks

1. **A real PGlite database closes and reopens with the expected entities, but two offline Loro clients disagree after exchanging updates. Is the change releasable?** No. Persistence passed; deterministic convergence failed. The release gate remains red.
2. **Two loopback clients converge, but the WebSocket sender drops messages while disconnected and reconnect does not resynchronize. May the package claim reconnect support?** No. The merge oracle passed, but transport recovery did not.
3. **The sibling sync repository passes its own gateway tests, while this repository has no installed PGlite and conditionally skips Loro. May the sibling evidence satisfy this change?** No. It is useful comparison evidence, not a hermetic mandatory gate for the package being released.
4. **Both clients edit different fields of one entity while offline. What must the oracle inspect?** Both clients must retain both non-conflicting edits after exchange, and canonical graph reads—not only internal CRDT state—must match.
5. **Both clients concurrently edit the same field. What must be asserted?** The policy need not preserve both scalar values, but every delivery order and reconnect path must deterministically choose the same result and surface the policy in tests/documentation.

## Readiness conclusion

The prerequisite contracts are sufficient to begin implementation, but the current implementation is not release-ready. Task 2 must add real dependency-backed persistence, isolated-client convergence, deterministic container/peer identity, inbound-update provenance or echo suppression, and reconnect/resynchronization behavior before any stable claim is made.
