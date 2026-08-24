# Release impact — `v3-sync-persistence-path`

Date: 2026-08-01

## What this change makes release-ready

- The npm core package has a real, deterministic PGlite filesystem persistence receipt rather than mock-only storage proof.
- The npm sync package has a mandatory Loro path with isolated graph stores, deterministic peer identities, mergeable entity containers, different-field preservation, documented scalar conflict behavior, and inbound echo suppression.
- The WebSocket channel queues disconnected writes, requests peer state on every connection, answers sync requests with current snapshots, and recovers after an actual socket termination.
- Core and sync candidates are proven from tarballs in ESM, CommonJS, and NodeNext consumers; the broader release gate proves all twelve npm candidates.
- The sync runtime has its own 16-export drift ledger, reference guide, release documentation, BDD contract, and changeset.
- A manual-only external workflow verifies the current packed core against the sibling `prometheus-entity-sync` TypeScript contract without contaminating the hermetic mandatory gate or using a developer-local link.

## Compatibility and dependency effect

- `createSyncProviderRegistry`, injected store/registry support in `startSyncBridge`, deterministic Loro peer identity, `createLoroLoopbackNetwork`, and `createWebSocketLoroChannel` are public additions.
- `loro-crdt >=1.13.9 <2` remains an optional published peer so consumers not selecting Loro do not acquire a CRDT runtime. Release development pins 1.13.9 exactly.
- PGlite is a development dependency of core for the real persistence receipt and is not bundled into consumers.
- The sync package retains Yjs as a secondary optional provider; no second graph owner or query-owned entity cache was introduced.

## What remains incomplete for full 3.0

This change certifies one headless npm local-first path, not the full release. It does not complete Flutter/Riverpod, native Tauri storage, mobile devices, A2UI/A2A bridges, Flint portability, any of the five showcase applications, the complete Prometheus-branded Docusaurus site, GitHub Pages, provenance, RC rehearsal, immutable-commit certification, registry authority, or stable publication.

The example ledger therefore remains `in-progress`, the documentation site and all showcases remain `planned`, and visual evidence remains unclaimed. No registry, package tag, release, deployment, or external production service was mutated.

## Publication authority

Publication remains unauthorized. This archive may unblock dependent implementation changes, but it cannot authorize `changeset publish`, npm `latest`, or any stable 3.0 registry mutation.
