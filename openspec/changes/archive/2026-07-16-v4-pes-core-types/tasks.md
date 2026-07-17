# Tasks: v4-pes-core-types

- [x] Create `crates/pes-core/src/types.rs` with all domain types (PgLsn, SyncRule, BucketAssignment, BucketId, TokenClaims, BucketOp, Op, BucketChecksum, SyncError)
- [x] Add `#[derive(Debug, Clone, Serialize, Deserialize)]` to all public structs
- [x] Add `#[non_exhaustive]` to `Op` enum and `SyncError` enum
- [x] Implement `Display` for `PgLsn` and `BucketId`
- [x] Implement `From<sqlx::Error> for SyncError`
- [x] Write serde round-trip unit tests for all public types in `src/types.rs`
- [x] Write a test asserting `SyncError` is `Send + Sync + 'static`
- [x] Write a test that `Op::CrdtPatch(bytes)` round-trips without modification
- [x] Run `cargo doc --no-deps` and verify all public types have doc comments
- [x] Verify `cargo clippy -- -D warnings` passes
