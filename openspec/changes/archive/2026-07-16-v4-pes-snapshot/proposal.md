# Proposal: v4-pes-snapshot — SnapshotStream for initial sync

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 3 · Depends on: v4-bucket-assigner

## Summary

Implement `pes-snapshot` crate: streams the current Postgres snapshot for a user's bucket assignments in 10,000-row batches, computing a deterministic checksum for integrity verification. Used during the initial sync when a client first connects.

## Design

```rust
pub struct SnapshotStream {
    pool: PgPool,
    assignments: Vec<BucketAssignment>,
    batch_size: usize,  // default 10_000
}

impl SnapshotStream {
    pub fn stream(self) -> impl Stream<Item = Result<SnapshotBatch, SyncError>> + Send
}

pub struct SnapshotBatch {
    pub bucket_id: BucketId,
    pub table_name: String,
    pub rows: Vec<serde_json::Value>,
    pub offset: usize,
    pub is_last: bool,
    pub batch_checksum: BucketChecksum,
}
```

Pagination uses keyset cursor (ORDER BY pk, LIMIT 10000, WHERE pk > last_pk) — safe for large tables. `OFFSET`-based pagination is forbidden (breaks on concurrent inserts).

The final `SnapshotComplete` checksum is `xxhash3` of all row PKs + `_version` columns in PK-sorted order, enabling the client to verify it received all rows.

## Success criteria

- [ ] Snapshot of 100,000-row table completes in <5 seconds on local Postgres
- [ ] Checksum is deterministic: two snapshots of same data produce same checksum
- [ ] Keyset pagination: no row is emitted twice; no row is skipped
- [ ] Stream is cancellation-safe (dropping the stream mid-way does not leak connections)
- [ ] Integration test with test-containers Postgres
