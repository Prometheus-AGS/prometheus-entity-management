# Proposal: v4-pes-server-binary — pes-server deployable binary

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 4 · Depends on: v4-pes-gateway

## Summary

Create the `pes-server` binary: the deployable `prometheus-entity-sync` service with TOML config, health endpoint, graceful shutdown, Prometheus metrics, and Docker image.

## Config format

```toml
[server]
host = "0.0.0.0"
port = 8080
max_connections = 10000

[postgres]
url = "postgres://user:pass@host/dbname"
max_pool_size = 20

[auth]
mode = "hmac"          # or "jwks"
secret = "${AUTH_SECRET}"   # env var interpolation
jwks_url = ""          # used when mode = "jwks"

[sync_rules]
path = "./sync-rules.toml"

[metrics]
port = 9090

[oplog]
compaction_ttl_days = 7
data_dir = "./data/oplog"
```

Env var interpolation: `${VAR_NAME}` in string values is replaced with the environment variable at startup. Missing required env vars cause startup failure with a clear error.

## HTTP endpoints

- `GET /health` → `200 { "status": "healthy", "connections": N, "lag_ms": N }`
- `GET /metrics` → Prometheus text format
- `GET /ready` → `200` when WAL replication is active, `503` when initializing

## Graceful shutdown

On SIGTERM: stop accepting new connections, send `Error { code: 1001, message: "server shutting down" }` to all clients, wait up to 30s for clients to disconnect, then exit.

## Docker image

Distroless base (`gcr.io/distroless/cc`), ~80 MB. Published to `ghcr.io/prometheus-ags/entity-sync:latest`.

## Success criteria

- [ ] Docker image starts and serves `/health` within 2 seconds
- [ ] `docker-compose up` in `examples/docker-compose/` brings up server + Postgres
- [ ] SIGTERM causes graceful shutdown within 30 seconds
- [ ] Missing required config causes clear error message at startup (not panic)
- [ ] Env var interpolation works for `${AUTH_SECRET}`
