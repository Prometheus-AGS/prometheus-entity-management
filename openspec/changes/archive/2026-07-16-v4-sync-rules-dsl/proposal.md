# Proposal: v4-sync-rules-dsl — SyncRule TOML DSL parser

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 2 · Depends on: v4-pes-core-types

## Summary

Implement `pes-rules` crate: TOML-based sync rule DSL parser that deserializes `sync-rules.toml` into a validated `SyncRuleSet`. Provides the authoring surface for data access control.

## TOML format

```toml
[buckets.user_entities]
description = "All entities owned by the authenticated user"
parameters = ["user_id"]

[buckets.user_entities.parameter_queries]
user_id = "SELECT id FROM users WHERE auth_user_id = $1"

[buckets.user_entities.data]
entities = "SELECT * FROM entities WHERE owner_id = {bucket_parameters.user_id}"
tags = "SELECT * FROM entity_tags WHERE entity_id IN (SELECT id FROM entities WHERE owner_id = {bucket_parameters.user_id})"

[buckets.tenant_shared]
description = "Reference data shared across a tenant"
parameters = ["tenant_id"]

[buckets.tenant_shared.parameter_queries]
tenant_id = "SELECT tenant_id FROM users WHERE auth_user_id = $1"

[buckets.tenant_shared.data]
entity_types = "SELECT * FROM entity_types WHERE tenant_id = {bucket_parameters.tenant_id}"
```

## Validation rules

- Each parameter named in `parameters` must have a corresponding entry in `parameter_queries`
- Parameter queries must contain exactly `$1` (for `sub` claim) — no other placeholders
- `{bucket_parameters.X}` references in data queries must match a declared parameter name
- No circular bucket references
- Bucket IDs must match `[a-z][a-z0-9_-]*`

## Success criteria

- [ ] 10+ valid fixture files parse without error
- [ ] 10+ invalid fixture files produce specific line/column error messages
- [ ] `SyncRuleSet` is clonable + Send + Sync (required for use behind Arc)
- [ ] `cargo doc` documents all public types and the TOML format
