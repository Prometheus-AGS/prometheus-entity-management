# Current Waypoint

**Active phase:** `phase-v4-prometheus-entity-sync`
**Previous phase:** `phase-v3-universal-platform-evolution`
**KBD process state:** `execution_in_progress`
**Updated:** 2026-07-17 (v4-entity-sync-ts-sdk DONE — 12/12, archived — found + fixed a real pes-gateway production bug)

## Status

prometheus-entity-sync — **execution in progress**. 11/14 changes fully complete + 1 in progress. **Waves 4-6.5 (partial) done.**

✅ **`v4-entity-sync-ts-sdk` (Wave 6.5) is DONE** — 12/12 tasks, archived `2026-07-17-v4-entity-sync-ts-sdk`, commit `0b88600` in `prometheus-entity-sync`. Its Docker Compose integration tests (task 10) were the first coverage to run the delta-poll loop for more than a few assertions and caught a genuine, previously-shipped production bug in `pes-gateway`: `poll_deltas` redelivered the same op forever (off-by-one on an inclusive scan boundary). Fixed, regression-tested, and this also exposed and fixed a `resume_lsn: Some(PgLsn(0))` ambiguity used as a snapshot-skipping shortcut in several tests — see Known issues below. This clears the last blocker for `v4-pem-sync-transport`'s tasks 9-10.

- `v4-entity-sync-ts-sdk` (DONE, 12/12 tasks, commit `0b88600`, archived `2026-07-17-v4-entity-sync-ts-sdk`): TypeScript client SDK — `entity-sync-core`'s `SyncClient` (full PSyncV1 WebSocket lifecycle, exponential-backoff reconnect with jitter, proactive JWT refresh 60s before expiry), `entity-sync-pglite`'s `prometheusSync()` PGlite extension (applies `Delta` ops as SQL via a `db.sync` namespace), `entity-sync-react`'s `useEntitySync`/`useSyncStatus` hooks. 21 unit tests (mocked timers) + 3 real Docker Compose integration tests (two-tab bidirectional sync, offline/reconnect with delta resume, JWT expiry+refresh), split into a separate `vitest.integration.config.ts` so the default `pnpm run test` never needs Docker. Bundle size 7.12 KB gzipped (budget 20 KB). All 4 TS packages pass `tsc --strict --noEmit`. **Found and fixed a real `pes-gateway` production bug** (infinite delta redelivery — see Known issues) and a `resume_lsn: Some(0)` ambiguity affecting both the Rust E2E tests and these new TS integration tests.
- `v4-pem-sync-transport` (IN PROGRESS, 9/11 tasks, commit `8f8c057` in `prometheus-entity-sync` + `50bc24a` in `prometheus-entity-management`, NOT archived — **tasks 9-10 now unblocked, and the docker-compose stack's redelivery bug is fixed**): `prometheusSyncTransport` — an `EntityTransport<T>` (`@prometheus-ags/entity-graph-core`) implementation in `entity-sync-pglite/src/pem-transport.ts`. `list()`/`get()` read from PGlite (kept current by the sync stream); `subscribe()` layers `ChangeEvent`s on `SyncClient.onDelta`, including a post-merge PGlite readback for `CrdtPatch` ops (which carry no row payload — without this, the engine's `useEntities` subscribe handler would silently skip the update, since it only calls `upsertEntity` when `ev.row` is truthy); `write()` sends `ClientMessage::Write` for `useEntityMutation({ mutate: transport.write })` wiring. Exported as `prometheusSyncTransport` (renamed) to avoid colliding with `v4-entity-sync-ts-sdk`'s PGlite-extension `prometheusSync` — both proposals independently named their factory the same thing. Added a hand-rolled Zustand-shaped `status-store.ts` (not a real `zustand` dependency) for a status observable. In `prometheus-entity-management`: added demonstration `src/lib/entity-sync-transport.ts` files to both example apps (NOT wired into either app's actual `Task` UI — both apps' `task-hooks.ts` still use the pre-2.0 `useEntityList`/`useEntity` pattern; see known-issues). Both apps confirmed typechecking clean via full-workspace `turbo run typecheck` (17/17). **Fixed a real `WebSocket.send()` type error** in `entity-sync-core/src/client.ts` surfaced by the example apps' newer TypeScript version.
- `v4-pes-gateway`: WebSocket sync gateway server implemented (commit `0530604`) — full PSyncV1 connection lifecycle: JWT auth (HMAC-SHA256/RS256+JWKS with 5-min key cache), bucket authorization, snapshot delivery, polling-based delta subscription, client write handling (Upsert/Delete/CrdtPatch), 30s keepalive, connection-limit enforcement. 20 tests (15 unit + 5 E2E against real Postgres/WAL/router). **Pre-archive security review found and fixed a CRITICAL broken-access-control bug**: `handle_write` originally authorized writes by `entity_type` only, never checking `entity_id`/ownership — any client could write/delete/CRDT-patch any other user's row of an authorized type, with the unauthorized write re-broadcast as a legitimate `Delta` via the WAL pipeline. Fixed by verifying `entity_id` falls within the authorized assignment's owner-scoped `data_queries` predicate before any write; a regression test (`e2e_write_authorization.rs`) proves cross-tenant writes are rejected and legitimate same-owner writes still succeed. Also fixed a HIGH finding (write-path DB errors bypassing the `GatewayErrorResponse` redaction boundary). **Found and flagged two further pre-existing bugs outside this change's scope** (background tasks, not blocking this change): `pes-rules::template::substitute` rendered `{bucket_parameters.X}` unquoted, breaking for non-numeric (e.g. UUID) owner columns — **fixed and committed** (`65ac051`); `pes-snapshot`'s keyset cursor compared `uuid > text` with no valid operator for UUID-keyed tables — **fixed and committed** (`097861f`).
- `v4-psync-protocol`: PSyncV1 wire protocol implemented (commit `035d92c`) — 7 `ServerMessage` + 4 `ClientMessage` variants, MessagePack codec via `rmp_serde::to_vec_named` (named-map, forward-compatible by construction). 19 Rust tests (12 round-trip, 2 forward-compat, 7 cross-language) + TypeScript codec (`@msgpack/msgpack`) with wire shapes verified empirically before coding, not guessed. Two `cargo-fuzz` targets ran ~8.5M combined iterations with zero crashes. **Fixed a real repo-wide gap**: no `tsconfig.json` existed anywhere in the repo since scaffold — added root + package-level configs; all 4 TS packages now typecheck clean.
- `v4-repo-scaffold`: sibling repo scaffolded at `/Users/gqadonis/Projects/prometheus/prometheus-entity-sync` (commit `1c8d91a`)
- `v4-pes-core-types`: all `pes-core` domain types implemented (commit `fc690da`) — 13 tests passing (serde round-trips, `Send+Sync` assertion, `Op::CrdtPatch` proptest fuzz), `cargo doc` clean under `#![warn(missing_docs)]`
- `v4-sync-rules-dsl`: `pes-rules` TOML DSL parser + validator implemented (commit `4d522bc`) — 20 fixtures (10 valid, 10 invalid), 5 integration/unit tests, caught and fixed a real `$10`-vs-`$1` placeholder validation bug during fixture testing
- `v4-bucket-assigner` ⚠️ CRITICAL SECURITY BOUNDARY: `BucketAssigner` implemented (commit `3bacd19`) — JWT `sub` always bound via `sqlx` `$1` (never `format!`), `{bucket_parameters.X}` substitution allowlist-validated even for DB-sourced values, expiry checked before any DB call. 17 tests, 100% branch coverage on `assign()` (`cargo-llvm-cov --branch`), 10,000-case proptest passing. `security-reviewer` agent sign-off obtained — 1 HIGH finding fixed live (`BucketAssigner::new` is now fallible and enforces `pes_rules::validate` at construction). 2 deferred lower-severity findings (`SyncError` redaction, cache eviction) landed separately via commit `524856a`.
- `v4-pes-oplog`: `BucketOpLog` implemented (commit `71f0348`) — append/drain_since/checksum/compact on an embedded redb database. 15 tests, criterion benchmark measured ~15,000–19,500 appends/sec, exceeding the 10K/sec target.
- `v4-pes-snapshot`: `SnapshotStream` implemented (commit `60f4214`) — keyset-paginated initial-sync streaming with a two-level xxh3 checksum. **Caught and fixed a real bug**: text-comparing the keyset cursor broke numeric ordering, returning 749,966 rows instead of 100,000 — fixed via `pg_typeof` detection run once per query. 3 testcontainers integration tests + 9 unit tests.
- `v4-wal-to-bucket-router`: `WalToBucketRouter` implemented (commit `a10c042`) as a **new `pes-router` crate** (not `pes-gateway/src/router.rs`, to avoid conflicting with then-concurrent work) — routes decoded WAL changes through `BucketAssigner::find_affected_buckets` (new method, single-owner-column local-matching heuristic) into the affected buckets' oplogs, real `tokio::spawn` fan-out, bounded-channel backpressure, prometheus metrics. **Deviates from the proposal in two documented ways**: `frf-postgres-cdc` publishes via a `LogBroker`, not a pull `Stream`; the true Postgres LSN never reaches the published envelope, so the broker's `Offset` is used as a `PgLsn` surrogate. 2 E2E tests (real Postgres logical replication, testcontainers) + 2 backpressure tests. **Caught and fixed a real test-fixture bug**: `frf-postgres-cdc` requires UUID primary keys on watched tables — a plain string silently dropped the row with only a WARN log.

`cargo build --workspace` and `cargo clippy --workspace --all-targets -- -D warnings` both pass clean.

## Known issues

**kbd-apply task-numbering mismatch.** Hit once during `v4-sync-rules-dsl` (nested `tasks.md` sub-checkboxes cause `os_list`/`os_mark_done` to disagree on ordinals); corrected manually. No subsequent change's `tasks.md` has had nesting. Background fix flagged as `task_6dd34901`. Keep verifying task text directly against `tasks.md` if a future change's list has indentation.

**testcontainers needs `DOCKER_HOST` override in this dev environment.** This machine runs Colima, not Docker Desktop; `testcontainers`'s bollard client defaults to `/var/run/docker.sock` and ignores the active `docker context`. Set `DOCKER_HOST=unix:///Users/gqadonis/.colima/default/docker.sock` when running any `testcontainers`-backed test locally. Not needed in CI with a standard Docker socket.

**`frf-postgres-cdc` requires UUID primary keys on watched tables.** Found during `v4-wal-to-bucket-router`'s E2E test: a non-UUID `id` column silently drops the WAL row (WARN log only, not a hard error). Real schemas synced through this system need UUID primary keys on any CDC-watched table — worth flagging in future architecture docs.

**`pes-rules` unquoted template substitution — RESOLVED.** `pes_rules::template::substitute` rendered `{bucket_parameters.X}` unquoted into `data_queries` SQL, which only works for bare numeric literals — a UUID or other string owner column produces a Postgres parse error. Found while writing `v4-pes-gateway`'s first E2E test (no prior test suite exercised the real substitution path against a non-numeric column). Fixed and committed as `65ac051` (renders as a quoted SQL string literal; `docs/sync-rules-reference.md` updated).

**`pes-snapshot` uuid/text keyset cursor bug — RESOLVED.** Same discovery path as the above: `IdCast::Text`'s branch cast only the cursor bind, not the `sq.id` column itself, so a UUID-keyed table's keyset pagination failed with `operator does not exist: uuid > text`. Fixed and committed as `097861f`.

**`pes-server` binary — RESOLVED, no longer a stub.** `crates/pes-server/src/main.rs` used to be just `println!("hello world")`; now a full deployable binary (commit `1ab1d99`). This unblocked `v4-entity-sync-ts-sdk`'s task 10 (now done), `v4-pem-sync-transport`'s tasks 9-10, and `v4-dart-sdk` (previously blocked entirely). `critical_path` in `current-waypoint.json` was updated to include both `v4-pes-server-binary` and `v4-dart-sdk`, which the original plan omitted despite `v4-dart-sdk`'s proposal stating `Depends on: v4-psync-protocol, v4-pes-server-binary`.

**`pes-gateway` `poll_deltas` infinite redelivery — RESOLVED.** `ConnectionHandler::poll_deltas` stored the last-delivered LSN (inclusive, matching `Ack`/`resume_lsn` semantics) and reused it directly as `BucketOpLog::drain_since`'s scan start — but `drain_since` is also inclusive of `from_lsn`, so every ~50ms poll tick re-included the already-delivered op, forever. Shipped in the already-archived, already-security-reviewed `v4-pes-gateway` change; only caught now because `v4-entity-sync-ts-sdk`'s Docker Compose integration tests were the first coverage to run the delta loop for more than a few assertions and check delivery *count*, not just presence. Diagnosed by writing a standalone Node script that spoke the raw WebSocket+MessagePack protocol directly (bypassing `SyncClient`), which logged 50+ identical `Delta` messages for a single Postgres INSERT. Fixed by scanning from `last_seen_lsn + 1`, kept local to the scan and distinct from the inclusive-by-contract `last_seen_lsn` field. Regression test: `crates/pes-gateway/tests/e2e_delta_propagation.rs`'s `a_single_write_is_delivered_as_exactly_one_delta_not_repeated`. Committed as `0b88600`.

**`resume_lsn: Some(PgLsn(0))` ambiguity — RESOLVED.** Several Rust E2E tests and `entity-sync-core`'s `SyncClient.subscribe(buckets, "0")` calls used `resume_lsn: Some(PgLsn(0))` as a shortcut to skip snapshot delivery. This is ambiguous: `PgLsn(0)` is a real, reachable value (`WalToBucketRouter`'s broker-`Offset` surrogate LSN starts at 0, per that crate's own documented LSN caveat), so `Some(0)` can't be distinguished from "I've already consumed the op at LSN 0." Once the redelivery bug above was fixed, `poll_deltas` correctly started treating `Some(0)` as already-consumed, silently dropping each client's first op — breaking the pre-existing `write_propagates_to_other_subscribed_client_within_200ms` E2E test. Surfaced to the user via `AskUserQuestion`; user chose to fix the affected tests to use the real `resume_lsn: None` + snapshot-then-live-delta path (matching how a real client actually connects) over introducing a distinct sentinel type. `e2e_write_authorization.rs` and `e2e_graceful_shutdown.rs` keep `Some(0)` — audited and confirmed safe since neither asserts on `Delta` receipt. Committed as `0b88600`.

**TS integration test subscribe/write race — RESOLVED.** `entity-sync-core`'s Docker integration tests called `SyncClient.subscribe()` and immediately wrote to Postgres via a direct `pool.query`, with no wait for the WebSocket connection to actually reach the server and process `Subscribe`. If the write committed first, the entity landed in the (already-in-flight) snapshot instead of arriving as a `Delta`, and a test only listening via `onDelta` would hang until timeout. Fixed with a `trackStatus()`/`waitForLive()` helper that waits for `SyncClient`'s `onStatus` callback to report `state: "live"` before writing. Committed as `0b88600`.

**`EntityTransport<T>` vs `SyncProvider` architectural fork (design note, not a bug).** `v4-pem-sync-transport`'s proposal specifies `EntityTransport<T>` (pull-based `list`/`get`/`subscribe`, same contract `makeRestTransport` implements). `prometheus-entity-management/packages/entity-graph-sync` already has a purpose-built `SyncProvider` interface (`start`/`pushLocalChange`/`stop`) for realtime CRDT peer sync, with Yjs/Loro providers already implemented — a closer architectural fit for a persistent WebSocket delta stream. User confirmed following the proposal exactly rather than redirecting. Worth a future design discussion on whether `entity-graph-sync` should also get a `prometheus-entity-sync` `SyncProvider`.

**Example apps' `Task` UI still on 1.x hooks.** Both `examples/vite-app` and `examples/nextjs-app`'s `task-hooks.ts` use the 1.x `useEntityList`/`useEntity` + mock-backend pattern, not the 2.0 `useEntities`/`useEntityQuery` + `registerEntityTransport` pattern. `v4-pem-sync-transport`'s new `src/lib/entity-sync-transport.ts` in each app proves the registration API compiles/typechecks but isn't wired into either app's rendered `Task` views — a future change would need to migrate `task-hooks.ts` to actually see synced data.

## Structural note (fixed during apply)

The plan phase nested all 14 changes under `openspec/changes/2026-07-13-v4-prometheus-entity-sync/v4-*/`. The `openspec` CLI treats each change as a flat top-level directory — it does not understand umbrella nesting — so `kbd-apply`'s OpenSpec backend adapter could not detect these changes. Fixed by flattening all 14 to `openspec/changes/v4-*/` directly. The umbrella `2026-07-13-v4-prometheus-entity-sync/proposal.md` remains as a tracking doc only (not a real OpenSpec change). Completed changes archive via `openspec archive <change> --skip-specs -y` since these are infra/tooling changes with no user-facing capability delta to spec.

## Next pending change

Resume `v4-pem-sync-transport`'s deferred tasks 9-10 (now unblocked — `examples/docker-compose/` in the target repo is a real, verified-working stack, and its `pes-gateway` redelivery bug is fixed), then `v4-dart-sdk`.

## Exact next command

```
Resume v4-pem-sync-transport tasks 9-10 using examples/docker-compose/, then /kbd-apply v4-dart-sdk
```

## Change inventory (14 total)

| Wave | Change ID | Status |
|------|-----------|--------|
| 1 | v4-repo-scaffold | ✅ DONE (archived `2026-07-16-v4-repo-scaffold`) |
| 2 | v4-pes-core-types | ✅ DONE (archived `2026-07-16-v4-pes-core-types`) |
| 2 | v4-sync-rules-dsl | ✅ DONE (archived `2026-07-16-v4-sync-rules-dsl`) |
| 2 | v4-bucket-assigner | ✅ DONE (archived `2026-07-16-v4-bucket-assigner`) ⚠️ security-reviewed |
| 3 | v4-pes-oplog | ✅ DONE (archived `2026-07-16-v4-pes-oplog`) |
| 3 | v4-pes-snapshot | ✅ DONE (archived `2026-07-16-v4-pes-snapshot`) |
| 3 | v4-wal-to-bucket-router | ✅ DONE (archived `2026-07-16-v4-wal-to-bucket-router`) — **Wave 3 complete** |
| 4 | v4-psync-protocol | ✅ DONE (archived `2026-07-16-v4-psync-protocol`) |
| 4 | v4-pes-gateway | ✅ DONE (archived `2026-07-17-v4-pes-gateway`) ⚠️ security-reviewed — **Wave 4 complete** |
| 6 | v4-pes-server-binary | ✅ DONE (archived `2026-07-17-v4-pes-server-binary`, commit `1ab1d99`) ⚠️ security-reviewed — **Wave 6 complete** |
| 6.5 | v4-entity-sync-ts-sdk | ✅ DONE (archived `2026-07-17-v4-entity-sync-ts-sdk`, commit `0b88600`) — found + fixed a real `pes-gateway` production bug |
| 6.5 | v4-pem-sync-transport | 🟡 IN PROGRESS (9/11 tasks, commits `8f8c057` + `50bc24a`, not archived) — tasks 9-10 now unblocked, ready to resume |
| 7 | v4-dart-sdk | ⏭️ NEXT (once `v4-pem-sync-transport` above is resumed/archived) |
| 7.5 | v4-tauri-plugin | PENDING |
| 8 | v4-entity-sync-skill | PENDING |

⚠️ `v4-bucket-assigner` is a **CRITICAL SECURITY BOUNDARY**: JWT → bucket → data. Requires 100% branch coverage + proptest property testing (10,000 random `sub` strings) + `security-reviewer` agent sign-off before it can be marked done.

## Environment requirements for apply

- **Rust toolchain** (cargo) — required for all server crates (Waves 1–6)
- **pnpm** — required for TypeScript SDK (Waves 6.5)
- **Flutter/Dart SDK** — required for Dart SDK (Wave 7)
- **Tauri CLI v2** — required for Tauri plugin (Wave 7.5)
- **FRF path** — `flint-realtime-fabric` workspace must be accessible at `/Users/gqadonis/Projects/prometheus/flint-realtime-fabric` for path dependencies

## Parked

- `phase-v2-examples-and-docs-coverage` — resume after v3+v4 so coverage spans the full surface
- `phase-v3-universal-platform-evolution` — v3.0.0 staged, PR #4 open; resume publishing after v4 is unblocked
