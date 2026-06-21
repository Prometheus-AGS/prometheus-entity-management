# Tasks: v2-flint-realtime-adapter

- [x] Define minimal-surface Flint types (EntityEvent/EntityQuery/EntityRecord) to avoid hard frf-sdk dep
- [x] Implement `createFlintAdapter(client, config)` → RealtimeAdapter
- [x] Map watchEntities() AsyncIterable → ChangeSet → RealtimeManager
- [x] Map mutateEntity() → optimistic graph write (+ MergeStrategy on conflict)
- [x] Implement offset↔checkpoint-store resume (mirror surreal-live)
- [x] Add @prometheusags/frf-sdk as optional peerDependency; guard with clear error
- [x] Tests: event ingestion, mutation publish, reconnect/resume, missing-peer guard
- [x] Export from `src/index.ts`
- [x] `pnpm run refresh:exports` + update skill docs
- [x] `pnpm run typecheck` + `pnpm run test` + `pnpm run verify:skills`
