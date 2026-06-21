# Tasks: v2-flint-realtime-adapter

- [ ] Define minimal-surface Flint types (EntityEvent/EntityQuery/EntityRecord) to avoid hard frf-sdk dep
- [ ] Implement `createFlintAdapter(client, config)` → RealtimeAdapter
- [ ] Map watchEntities() AsyncIterable → ChangeSet → RealtimeManager
- [ ] Map mutateEntity() → optimistic graph write (+ MergeStrategy on conflict)
- [ ] Implement offset↔checkpoint-store resume (mirror surreal-live)
- [ ] Add @prometheusags/frf-sdk as optional peerDependency; guard with clear error
- [ ] Tests: event ingestion, mutation publish, reconnect/resume, missing-peer guard
- [ ] Export from `src/index.ts`
- [ ] `pnpm run refresh:exports` + update skill docs
- [ ] `pnpm run typecheck` + `pnpm run test` + `pnpm run verify:skills`
