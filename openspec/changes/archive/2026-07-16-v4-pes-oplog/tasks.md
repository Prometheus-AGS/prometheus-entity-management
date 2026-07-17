# Tasks: v4-pes-oplog

- [x] Create `crates/pes-oplog/src/lib.rs` with `BucketOpLog`
- [x] Add `redb`, `rmp-serde` (MessagePack), `async-stream` dependencies
- [x] Define redb table schemas: `bucket_ops` (composite key) and `bucket_checksums`
- [x] Implement `append`: serialize op to MessagePack, write to redb, update running checksum
- [x] Implement `drain_since`: open redb read transaction, range scan from `(bucket_id, from_lsn)`, yield ops
- [x] Implement `checksum`: read from `bucket_checksums` table
- [x] Implement `compact`: delete all entries older than `now - compaction_ttl`
- [x] Write benchmark with `criterion`: 10K appends to 100 buckets concurrently — measured 513–670ms for 10,000 appends (~15,000–19,500 appends/sec), exceeding the proposal's 10K/sec target on an in-memory redb backend
- [x] Write test: 10 concurrent appenders + 5 concurrent readers, verify no ops lost
- [x] Write test: crash simulation (drop DB handle mid-write), reopen and verify last committed LSN
- [x] Write test: compact removes old ops without corrupting checksum
- [x] Verify `cargo clippy -- -D warnings` passes
