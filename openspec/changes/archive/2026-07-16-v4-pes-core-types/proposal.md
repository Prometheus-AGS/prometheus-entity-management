# Proposal: v4-pes-core-types — Core sync domain types

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 1 · Depends on: v4-repo-scaffold

## Summary

Implement all domain types in `pes-core` that downstream crates consume. This is the shared vocabulary of the entire sync engine.

## Types

```rust
// pes-core/src/types.rs

/// Postgres Log Sequence Number — monotonically increasing WAL position
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct PgLsn(pub u64);

/// A sync rule definition loaded from sync-rules.toml
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncRule {
    pub id: String,
    pub description: Option<String>,
    /// Parameter names resolved from JWT claims via parameter_queries
    pub parameters: Vec<String>,
    /// SQL queries to resolve each parameter from JWT claims
    pub parameter_queries: HashMap<String, String>,
    /// SQL queries defining which rows go into this bucket
    pub data_queries: HashMap<String, String>,
}

/// A bucket assignment for one user (resolved from SyncRule + JWT claims)
#[derive(Debug, Clone)]
pub struct BucketAssignment {
    pub bucket_id: BucketId,
    pub rule_id: String,
    pub parameters: HashMap<String, serde_json::Value>,
    pub data_queries: HashMap<String, String>, // with parameters substituted
}

/// Opaque bucket identifier
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct BucketId(pub String);

/// Claims extracted from a sync JWT
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenClaims {
    pub sub: String,
    pub tenant_id: Option<String>,
    pub exp: u64,
    #[serde(flatten)]
    pub custom: HashMap<String, serde_json::Value>,
}

/// A single op appended to a BucketOpLog
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BucketOp {
    pub lsn: PgLsn,
    pub bucket_id: BucketId,
    pub entity_type: String,
    pub entity_id: String,
    pub op: Op,
}

/// The operation payload
#[derive(Debug, Clone, Serialize, Deserialize)]
#[non_exhaustive]
pub enum Op {
    Upsert(serde_json::Value),
    Delete,
    CrdtPatch(Vec<u8>), // Loro binary
}

/// Running checksum for a bucket's op log
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct BucketChecksum(pub u64);

/// Sync engine errors
#[derive(Debug, thiserror::Error)]
#[non_exhaustive]
pub enum SyncError {
    #[error("bucket assignment failed: {0}")]
    BucketAssignmentFailed(String),
    #[error("LSN gap detected: expected {expected}, got {actual}")]
    LsnGap { expected: PgLsn, actual: PgLsn },
    #[error("checksum mismatch: expected {expected:?}, got {actual:?}")]
    ChecksumMismatch { expected: BucketChecksum, actual: BucketChecksum },
    #[error("protocol error: {0}")]
    ProtocolError(String),
    #[error("auth error: {0}")]
    AuthError(String),
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}
```

## Success criteria

- [ ] All types serialize/deserialize via `serde_json` without loss
- [ ] Unit tests for serde round-trips on each public type
- [ ] `SyncError` is `Send + Sync + 'static` (required for tokio error handling)
- [ ] `Op::CrdtPatch` round-trips Loro binary bytes without corruption
- [ ] `cargo doc` generates documentation for all public types
