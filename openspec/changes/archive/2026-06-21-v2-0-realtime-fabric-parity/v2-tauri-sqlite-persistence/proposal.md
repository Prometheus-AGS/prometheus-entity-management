# Proposal: Tauri/SQLite GraphPersistenceAdapter

> Part of umbrella `v2-0-realtime-fabric-parity` · Change C4 · addresses GAP-6 · `library: cand-008`

## Summary

Implement a `GraphPersistenceAdapter` over `@tauri-apps/plugin-sql` so the entity graph persists/hydrates against on-device SQLite on Tauri desktop — pairing with the existing PGlite (browser) adapter for cross-platform local-first.

## Motivation

Flint targets Tauri + web parity; the natural desktop store is SQLite (or redb-over-IPC), not PGlite-wasm. Our `GraphPersistenceAdapter` (get/set/remove) already abstracts storage, so this is a new adapter, not a core change.

## Library reuse (cand-008)

- **@tauri-apps/plugin-sql 2.4.0** (MIT OR Apache-2.0). Official, stable v2. Optional peer.
- **wa-sqlite REJECTED** (cand-009): browser SQL already covered by PGlite; no second wasm engine.

## Non-goals

- Browser SQLite (covered by existing PGlite adapter).
- redb-over-IPC (Flint-internal; revisit only if Tauri SQL proves insufficient).

## Design

- New `src/adapters/tauri-sql-persistence.ts` implementing `GraphPersistenceAdapter` (get/set/remove) backed by a Tauri SQL key/value table.
- Reuse existing `startLocalFirstGraph` / hydrate / persist runtime — adapter slots in unchanged.
- `@tauri-apps/plugin-sql` optional peer; guard if absent.

## Success criteria

- [ ] Graph snapshot persists to and hydrates from Tauri SQLite.
- [ ] Works with existing local-first runtime (replay/poison handling unchanged).
- [ ] Optional peer; no impact on browser/core builds.
- [ ] New exports in skills ledger (`verify:skills` green).
