# Tasks: v4-tauri-plugin

- [ ] Create `packages/tauri-plugin-prometheus-sync/` Tauri v2 plugin scaffold (`tauri plugin init`)
- [ ] Add `pglite-oxide` path dependency to `Cargo.toml` (patch to local clone); document fallback feature flag `rusqlite-fallback`
- [ ] Implement `src/commands.rs` — `apply_delta`, `get_status`, `write_op` Tauri commands
- [ ] Implement `src/sync_actor.rs` — Rust actor owning the pglite-oxide handle + PSyncV1 WebSocket client
- [ ] Implement `src/ipc_bridge.rs` — emit `prometheus_sync_delta` and `prometheus_sync_status_changed` events to WebView
- [ ] Create `guest-js/index.ts` — typed wrappers over `invoke` / `listen` matching the TypeScript SDK `SyncClient` interface
- [ ] Wire `entity-sync-pglite` to delegate storage to `prometheus_sync_apply_delta` IPC command when running inside Tauri
- [ ] Create `examples/tauri-app/` — Tauri v2 app demonstrating todo CRUD with pglite-oxide backend + sync
- [ ] Write `tests/apply_delta.rs` — Rust unit test: upsert → query via pglite-oxide returns correct row
- [ ] Write `tests/ipc_roundtrip.rs` — Tauri mock runtime test: write_op emitted as delta event
- [ ] Run `cargo build --release` on macOS — zero warnings
- [ ] Run `pnpm tauri build` in example app — produces signed macOS `.app`
- [ ] Verify bundle size < 120 MB
- [ ] Document pglite-oxide local clone prerequisite and fallback instructions in plugin README
