# Proposal: v4-entity-sync-skill — AgentSkills.io compliant skill

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 8 · Depends on: all prior changes

## Summary

Publish an AgentSkills.io compliant skill package (`prometheus-entity-sync-skill`) that gives AI agents structured knowledge about the prometheus-entity-sync system: how to configure sync rules, how to integrate the TypeScript SDK, how to debug common issues, and how to reason about security boundaries.

## Skill structure

```
prometheus-entity-sync-skill/
├── SKILL.md                  # AgentSkills.io manifest
├── references/
│   ├── sync-rule-dsl.md      # TOML DSL reference with examples
│   ├── ts-sdk-api.md         # TypeScript SDK API surface
│   ├── dart-sdk-api.md       # Dart SDK API surface
│   ├── security-model.md     # JWT → bucket → data security chain
│   ├── wire-protocol.md      # PSyncV1 message reference
│   └── troubleshooting.md    # Common errors + remediation
├── recipes/
│   ├── add-entity-type.md    # End-to-end: new entity type from schema → sync rule → transport
│   ├── offline-first.md      # Offline queue + resume pattern
│   ├── multi-tenant.md       # Tenant-scoped bucket pattern with JWT claim mapping
│   └── tauri-setup.md        # pglite-oxide + Tauri plugin setup
└── validators/
    ├── sync-rule-linter.ts   # Validates TOML sync rules for common mistakes
    └── security-checker.ts   # Flags string interpolation in SQL queries
```

## SKILL.md manifest

```yaml
name: prometheus-entity-sync
version: 1.0.0
description: >
  Structured knowledge for configuring, integrating, and debugging
  prometheus-entity-sync — the PSyncV1-protocol Rust sync engine
  with TypeScript, Dart, and Tauri SDKs.
registry: agentskills.io
capabilities:
  - sync-rule-authoring
  - sdk-integration
  - security-review
  - troubleshooting
compatibility:
  - claude-code
  - cursor
  - continue
```

## AgentSkills.io compliance requirements

1. `SKILL.md` passes `agentskills validate` lint
2. All reference docs are < 400 lines each (AgentSkills size limit)
3. Every recipe includes a "verify" step the agent can execute to confirm success
4. `validators/` tools are executable via `ts-node` with no extra setup
5. Skill published to `agentskills.io` registry under `@prometheus-ags` organization

## Success criteria

- [ ] `agentskills validate prometheus-entity-sync-skill/` passes with zero warnings
- [ ] All reference docs < 400 lines
- [ ] All recipes include machine-verifiable "verify" steps
- [ ] `ts-node validators/sync-rule-linter.ts examples/valid-rule.toml` exits 0
- [ ] `ts-node validators/security-checker.ts examples/unsafe-rule.toml` exits 1 with clear error
- [ ] Skill published to agentskills.io registry
- [ ] `pnpm run verify:skills` in the prometheus-entity-sync repo passes
