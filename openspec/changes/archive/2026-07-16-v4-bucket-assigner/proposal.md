# Proposal: v4-bucket-assigner — BucketAssigner (CRITICAL SECURITY BOUNDARY)

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 2 · Depends on: v4-sync-rules-dsl  
> ⚠️ SECURITY CRITICAL — data leakage between users is the highest-severity bug class

## Summary

Implement `BucketAssigner` in `pes-rules`: given JWT `TokenClaims` and a `SyncRuleSet`, execute parameter lookup queries against Postgres (safely, with full parameterization) and return the `BucketAssignment`s the user is authorized to subscribe to.

## Security Requirements

**The following are non-negotiable:**

1. **No string interpolation of user-controlled values into SQL.** JWT claims (`sub`, `tenant_id`, custom fields) may contain SQL injection payloads. All parameter values must be passed via `$1`, `$2`, etc. placeholders to `sqlx::query()`.

2. **Template substitution uses a safe allowlist.** Data query templates substitute `{bucket_parameters.X}` with values resolved from parameter queries. The templating engine validates that substitution values match `[a-zA-Z0-9_-]` (identifiers only) and rejects anything else. UUIDs, integers, and slugs are accepted. Arbitrary strings are rejected.

3. **JWT validation is not optional.** The assigner never calls a parameter query for an expired or malformed JWT. `exp` is checked before any database call.

4. **Property-based testing.** A proptest property test must pass 10,000 iterations with random strings injected into all JWT claim fields, verifying that the resulting SQL never contains unescaped user input.

## Design

```rust
pub struct BucketAssigner {
    rule_set: Arc<SyncRuleSet>,
    pool: PgPool,
    cache: Arc<DashMap<CacheKey, (Vec<BucketAssignment>, Instant)>>,
    cache_ttl: Duration,
}

impl BucketAssigner {
    /// Assign buckets for a validated JWT.
    /// Returns only the buckets the user is authorized to access.
    pub async fn assign(
        &self,
        claims: &TokenClaims,
    ) -> Result<Vec<BucketAssignment>, SyncError> {
        // 1. Validate exp
        // 2. Check cache
        // 3. For each SyncRule, execute parameter_queries with claims as $1/$2
        // 4. Substitute resolved parameters into data_queries (safe template)
        // 5. Cache result for cache_ttl
        // 6. Return BucketAssignment list
    }
}
```

## Test matrix (exhaustive)

| Scenario | Expected result |
|----------|----------------|
| Valid JWT, single matching bucket | Returns 1 `BucketAssignment` |
| Valid JWT, 2 buckets match | Returns 2 `BucketAssignment`s |
| Valid JWT, no bucket matches | Returns empty vec (not an error) |
| Expired JWT | `SyncError::AuthError` |
| Malformed JWT | `SyncError::AuthError` |
| `sub` contains `'; DROP TABLE users; --` | Parameter query receives literal string, no injection |
| `sub` contains `\0` null bytes | Safely handled; no crash |
| `tenant_id` is null/missing | Falls back to default (None path in rule) |
| Postgres connection timeout | `SyncError::Database(...)` propagated |
| Cache hit | Second call returns instantly without Postgres roundtrip |
| Cache expiry | After TTL, next call re-queries Postgres |

**proptest property:** `∀ s: String. assign(claims { sub: s }) never executes SQL containing s literally`

## Success criteria

- [ ] 100% branch coverage on `assign()` (verified with `cargo-llvm-cov`)
- [ ] proptest with 10,000 random `sub` strings passes
- [ ] All test matrix scenarios pass
- [ ] Clippy lint: no `format!` or string concatenation anywhere in SQL-related code
- [ ] Code review by security-reviewer agent before merge
