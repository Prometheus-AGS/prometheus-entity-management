# Tasks: v2-tauri-sqlite-persistence

- [ ] Define minimal Tauri-SQL client surface (load/execute/select) to avoid hard dep
- [ ] Implement `createTauriSqlPersistenceAdapter(opts)` → GraphPersistenceAdapter (get/set/remove)
- [ ] Ensure key/value schema bootstrap (CREATE TABLE IF NOT EXISTS)
- [ ] Verify integration with startLocalFirstGraph (hydrate/persist/replay)
- [ ] Add @tauri-apps/plugin-sql as optional peerDependency; guard if absent
- [ ] Tests: persist/hydrate roundtrip; missing-peer guard
- [ ] Export from `src/index.ts`
- [ ] `pnpm run refresh:exports` + update skill docs
- [ ] `pnpm run typecheck` + `pnpm run test` + `pnpm run verify:skills`
