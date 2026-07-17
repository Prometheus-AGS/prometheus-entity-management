# Tasks: v4-entity-sync-ts-sdk

- [x] Create `packages/entity-sync-core/src/client.ts` — `SyncClient` class with WebSocket lifecycle
- [x] Create `packages/entity-sync-core/src/codec.ts` — TypeScript MessagePack encode/decode matching Rust codec
- [x] Create `packages/entity-sync-core/src/reconnect.ts` — exponential backoff reconnect logic with jitter
- [x] Create `packages/entity-sync-core/src/jwt.ts` — JWT expiry detection + proactive refresh timer
- [x] Create `packages/entity-sync-pglite/src/extension.ts` — PGlite `Extension` implementing `prometheusSync()`
- [x] Create `packages/entity-sync-pglite/src/apply.ts` — apply `Delta` ops as SQL to PGlite (`upsert`, `delete`, `crdt_patch`)
- [x] Create `packages/entity-sync-react/src/hooks.ts` — `useEntitySync`, `useSyncStatus` React hooks
- [x] Write unit tests for reconnect backoff (mock timers)
- [x] Write unit tests for JWT refresh timing
- [x] Write integration tests against docker-compose stack:
  - [ ] Two-tab bidirectional sync
  - [ ] Offline/reconnect with delta resume
  - [ ] JWT expiry + refresh cycle
- [x] Measure `entity-sync-core` bundle size with `rollup-plugin-visualizer`; verify < 20 KB gzipped
- [x] Run `tsc --strict --noEmit` on all packages — zero errors
