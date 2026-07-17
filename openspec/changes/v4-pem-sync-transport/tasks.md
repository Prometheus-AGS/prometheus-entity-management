# Tasks: v4-pem-sync-transport

- [x] Create `packages/entity-sync-pglite/src/pem-transport.ts` implementing `EntityTransport<T>`
- [x] Map `Delta` ops → `useGraphStore.getState().upsertEntity` / `removeEntity`
- [x] Map `useEntityMutation` write events → `SyncClient.write()` (hook into PEM mutation pipeline)
- [x] Expose `status` as a Zustand-compatible observable that PEM can subscribe to
- [x] Handle optimistic write flow: local graph update → write → confirm on delta receipt
- [x] Update `examples/vite-app/src/shared/db/entity-transports.ts` to use `prometheusSync`
- [x] Update `examples/nextjs-app/` transport registration likewise
- [x] Add `@prometheus-ags/entity-graph-core` as peer dependency in `entity-sync-pglite`
- [ ] Integration test: two tabs same user → mutual visibility of writes
- [ ] Integration test: two tabs different users → no cross-user data leak
- [x] Run `pnpm run typecheck:vite` and `pnpm run typecheck:next` — zero errors
