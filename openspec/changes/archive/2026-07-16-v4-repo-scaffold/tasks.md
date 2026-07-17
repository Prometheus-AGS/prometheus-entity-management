# Tasks: v4-repo-scaffold

- [x] Create `/Users/gqadonis/Projects/prometheus/prometheus-entity-sync/` directory
- [x] Write `Cargo.toml` workspace root with all crate members + workspace dependency table
- [x] Create `crates/pes-core/` with `Cargo.toml` (lib crate) and empty `src/lib.rs`
- [x] Create stub `Cargo.toml` + `src/lib.rs` for: pes-rules, pes-oplog, pes-snapshot, pes-protocol, pes-gateway, pes-sdk-rust
- [x] Create `crates/pes-server/` with `Cargo.toml` (bin crate) and `src/main.rs` (hello world)
- [x] Write `pnpm-workspace.yaml`
- [x] Create `packages/entity-sync-core/`, `packages/entity-sync-pglite/`, `packages/entity-sync-react/`, `packages/entity-sync-tauri/` with minimal `package.json` stubs
- [x] Write `.github/workflows/ci.yml` (cargo test + clippy + fmt; pnpm typecheck + test)
- [x] Write `README.md` skeleton (what it is, quick-start, architecture diagram in ASCII)
- [x] Write `LICENSE` (MIT)
- [x] Write `.gitignore` (target/, node_modules/, .env, *.toml with secrets)
- [x] Initialize git repository, first commit
- [x] Verify `cargo build --workspace` succeeds
- [x] Verify `cargo clippy --workspace -- -D warnings` passes
