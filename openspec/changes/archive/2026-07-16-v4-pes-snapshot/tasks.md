# Tasks: v4-pes-snapshot

- [x] Create `crates/pes-snapshot/src/lib.rs` with `SnapshotStream` and `SnapshotBatch`
- [x] Add `xxhash-rust` dependency with `xxh3` feature
- [x] Implement keyset cursor pagination: `ORDER BY id LIMIT $1 WHERE id > $2`
- [x] Compute per-batch checksum as `xxh3(sorted PKs || row data)`
- [x] Compute final bucket checksum as `xxh3(all per-batch checksums in order)`
- [x] Implement `Stream` trait for `SnapshotStream` using `async_stream::stream!` — uses `try_stream!` (not `stream!`), the fallible variant, since `SnapshotStream::stream()` yields `Result<SnapshotBatch, SyncError>` per the proposal's own signature; `try_stream!` supports `?` inline for error propagation from the `sqlx` calls inside the loop, `stream!` does not
- [x] Test: snapshot 100K-row table, verify row count and checksum determinism — **caught and fixed a real keyset-pagination bug**: the initial `sq.id::text > $1::text` comparison broke numeric ordering ('2' > '10' lexicographically vs 2 < 10 numerically), returning 749,966 rows instead of 100,000 on a `BIGINT` id table. Fixed by detecting the `id` column's real type via `pg_typeof` once per query (before pagination starts — Postgres type-checks all `WHERE ... OR ...` branches at parse time, so the cast can't be deferred until a cursor value exists) and casting the cursor bind to `numeric` or `text` accordingly. Runs in ~1-2s for 100K rows, well under the 5s target
- [x] Test: cancel stream after 3 batches — no connection leak (verify pool idle count) — fixed the test's own assertion after finding it compared `num_idle()` against an unreliable pre-warm-up baseline (sqlx pools are lazy); now asserts `num_idle() == size()` post-cancellation, i.e. no connection stuck outside the pool, plus a follow-up query proving the pool is still fully usable
- [x] Test: two identical snapshots produce identical checksums — verified per-batch (not just the final fold), proving pagination itself is deterministic, not only the checksum math
- [x] Add `testcontainers` dev-dependency for Postgres integration tests — used `testcontainers` 0.23 + `testcontainers-modules` (postgres feature) 0.11; required setting `DOCKER_HOST` to the active Colima socket in this dev environment (bollard's client defaults to `/var/run/docker.sock`, not respecting `docker context`)
- [x] Verify `cargo clippy -- -D warnings` passes
