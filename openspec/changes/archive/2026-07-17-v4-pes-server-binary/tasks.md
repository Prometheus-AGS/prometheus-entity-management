# Tasks: v4-pes-server-binary

- [x] Create `crates/pes-server/src/main.rs` with tokio runtime init and config load
- [x] Create `crates/pes-server/src/config.rs` — deserialize `config.toml` with `serde` + `config` crate; implement env var interpolation
- [x] Add axum HTTP server for health/metrics/ready endpoints (separate port from WebSocket)
- [x] Wire `GatewayServer`, `WalToBucketRouter`, `BucketOpLog`, `BucketAssigner` together in `main.rs`
- [x] Implement SIGTERM handler using `tokio::signal::unix::signal`
- [x] Implement graceful shutdown: notify all connections, wait 30s, force exit
- [x] Write `Dockerfile` using multi-stage build (rust:1.87-slim builder → distroless/cc runtime)
- [x] Write `docker-compose.yml` in `examples/docker-compose/`: server + Postgres + sync-rules volume mount
- [x] Write `.github/workflows/docker.yml`: build and push on tag
- [x] Test: start server, hit `/health`, verify response fields
- [x] Test: start server with missing `AUTH_SECRET` env var, verify clean error (not panic)
- [x] Test: send SIGTERM, verify server exits within 35 seconds
- [x] Verify Docker image size < 100 MB: `docker image inspect | jq '.[0].Size'`
