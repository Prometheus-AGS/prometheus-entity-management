# Proposal: v4-pes-oplog — BucketOpLog (per-bucket op log)

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 3 · Depends on: v4-pes-core-types

## Summary

Implement `pes-oplog` crate: a per-bucket append-only op log backed by `frf-store-redb` (embedded redb key-value store). Ops are ordered by LSN, queryable by range, and compactable by TTL.

## Design

```rust
pub struct BucketOpLog {
    db: Arc<redb::Database>,
    compaction_ttl: Duration,  // default: 7 days
}

impl BucketOpLog {
    /// Append an op. Returns the stored LSN.
    pub async fn append(&self, op: BucketOp) -> Result<PgLsn, SyncError>;

    /// Stream all ops for a bucket since a given LSN.
    pub fn drain_since(
        &self,
        bucket_id: &BucketId,
        from_lsn: PgLsn,
    ) -> impl Stream<Item = Result<BucketOp, SyncError>> + Send;

    /// Running checksum for a bucket's entire log.
    pub async fn checksum(&self, bucket_id: &BucketId) -> Result<BucketChecksum, SyncError>;

    /// Remove ops older than compaction_ttl.
    pub async fn compact(&self) -> Result<u64, SyncError>;
}
```

Storage layout in redb:
- Table: `bucket_ops` — key: `(bucket_id_bytes, lsn_u64_be)`, value: `BucketOp` MessagePack bytes
- Table: `bucket_checksums` — key: `bucket_id_bytes`, value: `u64 checksum`

## Success criteria

- [ ] Sustains 10,000 concurrent appends/second (measured with `criterion`)
- [ ] `drain_since(lsn)` returns ops in LSN order with no gaps and no duplicates
- [ ] Concurrent appenders and readers are race-free (redb's MVCC handles this)
- [ ] Compaction removes ops older than TTL without affecting in-progress reads
- [ ] All ops written before crash are recoverable after restart
