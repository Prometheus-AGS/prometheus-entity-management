# Proposal: v4-pes-gateway — WebSocket sync gateway

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 4 · Depends on: v4-psync-protocol, v4-wal-to-bucket-router

## Summary

Implement `pes-gateway` crate: the WebSocket server that serves sync clients. Each connection subscribes to buckets, receives a snapshot then live deltas, and can push write ops upstream to Postgres.

## Connection lifecycle

```
Client connects
  → Sends ClientMessage::Subscribe { buckets, token, resume_lsn }
  → Server validates JWT (HMAC-SHA256 or RS256 via JWKS URL)
  → Server calls BucketAssigner::assign(claims) → authorized bucket set
  → Server intersects requested buckets with authorized buckets
  → For each authorized bucket (no resume_lsn): send SnapshotBegin → SnapshotBatches → SnapshotComplete
  → For each authorized bucket (with resume_lsn): send Delta ops since resume_lsn
  → Subscribe to BucketOpLog deltas — push Delta messages as they arrive
  → On ClientMessage::Ack { lsn }: update client's tracked LSN
  → On ClientMessage::Write { ... }: validate, write to Postgres, emit CRDT patch
  → On ClientMessage::Ping: respond with Keepalive
  → Server sends Keepalive every 30s regardless
  → On disconnect: cleanup subscriptions
```

## JWT validation

Supports two modes (configured per-deployment):
- **HMAC-SHA256**: shared secret in config
- **RS256 via JWKS**: fetches public keys from `jwks_url`, caches with 5-minute TTL

## Write handling

`ClientMessage::Write` is validated against entity type allowlist (from sync rules), then written to Postgres via `sqlx`. If the op is `CrdtPatch`, it's applied via `frf-crdt::apply_delta` before Postgres write. The resulting WAL event routes back through `WalToBucketRouter` to other connected clients.

## Success criteria

- [ ] 1,000 concurrent connections sustained for 60 seconds without memory leak
- [ ] JWT expiry causes graceful disconnect with `Error { code: 4001 }` before next keepalive
- [ ] Write op from client A appears in client B's delta stream within 200ms (local network)
- [ ] Connection with invalid JWT is rejected immediately (no data sent)
- [ ] Load test: `wrk` or `k6` with 1,000 WebSocket clients, measure p99 delta latency
