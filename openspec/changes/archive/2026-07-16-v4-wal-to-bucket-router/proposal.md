# Proposal: v4-wal-to-bucket-router — WAL→Bucket routing pipeline

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 3 · Depends on: v4-bucket-assigner, v4-pes-oplog

## Summary

Wire `frf-postgres-cdc` WAL change events through `BucketAssigner` to `BucketOpLog`. When a WAL event arrives (INSERT/UPDATE/DELETE on a watched table), the router determines which user buckets are affected and appends a `BucketOp` to each relevant op log concurrently.

## Design

```rust
pub struct WalToBucketRouter {
    cdc_stream: Pin<Box<dyn Stream<Item = ChangeEvent> + Send>>,
    assigner: Arc<BucketAssigner>,
    oplog: Arc<BucketOpLog>,
    metrics: RouterMetrics,
}

impl WalToBucketRouter {
    /// Consume WAL events and route to buckets indefinitely.
    /// Returns only on stream end or unrecoverable error.
    pub async fn run(mut self) -> Result<(), SyncError>;
}
```

For each `ChangeEvent`:
1. Extract `entity_type` and `entity_id` from the change
2. Call `assigner.find_affected_buckets(&change)` — returns all `BucketId`s whose data queries match the changed row
3. Fan out: spawn one tokio task per affected bucket, each appending to `oplog`
4. Apply backpressure: if oplog write queue depth > threshold, slow WAL consumption (via bounded channel)

`find_affected_buckets` is a new method on `BucketAssigner` — given a `ChangeEvent`, evaluates each rule's data query filter against the changed row's column values to determine bucket membership. This is evaluated locally (no Postgres roundtrip needed for most rules) using the resolved bucket parameters from cache.

## Metrics

Exposed as Prometheus counters/histograms:
- `pes_wal_events_received_total` (counter)
- `pes_wal_events_routed_total` (counter, label: bucket_id)
- `pes_routing_latency_ms` (histogram)
- `pes_oplog_queue_depth` (gauge, label: bucket_id)

## Success criteria

- [ ] E2E test: Postgres INSERT → WAL event → op appears in correct bucket's oplog within 100ms
- [ ] Unrelated table INSERT → no ops appended to any bucket
- [ ] Backpressure test: oplog artificially slowed → WAL consumption slows proportionally (no OOM)
- [ ] Metrics endpoint returns correct counts after routing
