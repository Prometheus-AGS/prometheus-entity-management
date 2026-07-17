# Tasks: v4-pes-gateway

- [x] Create `crates/pes-gateway/src/lib.rs` and `src/server.rs`
- [x] Add dependencies: `tokio-tungstenite`, `jsonwebtoken`, `reqwest` (JWKS fetch), `dashmap`
- [x] Implement `GatewayServer::bind(addr, config) -> Self` using `tokio-tungstenite::accept_async`
- [x] Implement `ConnectionHandler::run()` — per-connection async task driving the lifecycle
- [x] Implement JWT validation: `validate_token(token, config) -> Result<TokenClaims, SyncError>`
  - [ ] HMAC-SHA256 path (shared secret)
  - [ ] RS256 path (JWKS fetch + cache with DashMap + 5-min TTL)
- [x] Implement snapshot delivery: stream `SnapshotStream` and send batches over WebSocket
- [x] Implement delta subscription: subscribe to `BucketOpLog::drain_since` and push `Delta` messages
- [x] Implement write handling: validate entity type, write to Postgres, apply CRDT patch
- [x] Implement Keepalive: `tokio::time::interval(30s)` task per connection
- [x] Connection limit: `Arc<AtomicUsize>` counter; reject new connections when at max
- [x] Load test script (`scripts/load-test.js`) using k6 with 1,000 WebSocket clients
- [x] Integration test: client A writes → client B receives delta within 200ms
- [x] Test: invalid JWT → connection rejected before any data sent
- [x] Verify `cargo clippy -- -D warnings` passes
