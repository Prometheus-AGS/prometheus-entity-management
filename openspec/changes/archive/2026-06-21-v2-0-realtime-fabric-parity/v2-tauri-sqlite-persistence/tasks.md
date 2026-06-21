# Tasks: v2-tauri-sqlite-persistence

- [x] Define minimal Tauri-SQL client surface (load/execute/select) to avoid hard dep
- [x] Implement `createTauriSqlPersistenceAdapter(opts)` → GraphPersistenceAdapter (get/set/remove)
- [x] Ensure key/value schema bootstrap (CREATE TABLE IF NOT EXISTS)
- [x] Verify integration with startLocalFirstGraph (hydrate/persist/replay)
- [x] Add @tauri-apps/plugin-sql as optional peerDependency; guard if absent
- [x] Tests: persist/hydrate roundtrip; missing-peer guard
- [x] Export from `src/index.ts`
- [x] `pnpm run refresh:exports` + update skill docs
- [x] `pnpm run typecheck` + `pnpm run test` + `pnpm run verify:skills`
