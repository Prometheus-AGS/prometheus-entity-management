# Proposal: v4-psync-protocol — PSyncV1 wire protocol

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 4 · Depends on: v4-pes-core-types

## Summary

Implement `pes-protocol` crate: PSyncV1 binary wire protocol using MessagePack encoding over WebSocket frames. All messages are versioned from the start to enable future evolution.

## Message types

```rust
/// Server → Client
#[derive(Serialize, Deserialize)]
#[non_exhaustive]
pub enum ServerMessage {
    SnapshotBegin { bucket_id: BucketId, total_rows: u64, protocol_version: u8 },
    SnapshotBatch { bucket_id: BucketId, rows: Vec<serde_json::Value>, offset: u64 },
    SnapshotComplete { bucket_id: BucketId, checksum: BucketChecksum },
    Delta { bucket_id: BucketId, ops: Vec<BucketOp>, lsn: PgLsn },
    Checkpoint { lsn: PgLsn, bucket_checksums: HashMap<BucketId, BucketChecksum> },
    Keepalive { server_time_ms: u64 },
    Error { code: u16, message: String },
}

/// Client → Server
#[derive(Serialize, Deserialize)]
#[non_exhaustive]
pub enum ClientMessage {
    Subscribe { buckets: Vec<String>, token: String, resume_lsn: Option<PgLsn>, protocol_version: u8 },
    Ack { lsn: PgLsn },
    Write { entity_type: String, entity_id: String, op: Op },
    Ping,
}
```

Codec: `encode(msg) -> Bytes` uses `rmp-serde`, `decode(bytes) -> Result<Msg, ProtocolError>` uses `rmp-serde` with unknown-field tolerance.

## Versioning

`protocol_version: u8` in `Subscribe` and `SnapshotBegin`. Server rejects v0 clients with `Error { code: 4000, message: "unsupported protocol version" }`. Current version: 1.

## Success criteria

- [ ] All message types round-trip without data loss
- [ ] `decode` is forward-compatible: extra fields in future versions are ignored (not rejected)
- [ ] Fuzz test: 100,000 random byte sequences never panic the decoder
- [ ] TypeScript codec (`packages/entity-sync-core/src/codec.ts`) produces bytes that Rust decoder accepts
