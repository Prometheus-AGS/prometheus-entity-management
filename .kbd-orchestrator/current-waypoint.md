# Current Waypoint

**Active phase:** `phase-v3-universal-platform-evolution`
**Previous phase:** `phase-v2-realtime-fabric-parity`
**KBD process state:** `plan_complete`
**Updated:** 2026-06-22

## Status

Universal Platform Evolution — **plan rewritten** to a higher standard (research-driven, supersedes the prior plan kept as `plan.superseded-2026-06-22.md`). **17 changes across 5 waves**, OpenSpec umbrella `v3-0-universal-platform-evolution`.

## Next pending change

`v3-monorepo-and-tooling` (pnpm + Turborepo + Changesets + tsup foundation), then `v3-core-extraction` (the critical-path unlock).

## Exact next command

```
/kbd-execute phase-v3-universal-platform-evolution
```
(or `/kbd-analyze` first for a build-vs-adopt ledger of the Rust/Flutter/CRDT deps.)

## Five research-driven corrections vs the superseded plan
1. Monorepo: adopt **pnpm + Turborepo + Changesets** (prior punted Turborepo)
2. MCP: official **rmcp** Rust SDK + Streamable HTTP (prior unspecified)
3. Flutter: **Riverpod 3.0** codegen (prior generic)
4. Tauri: **tauri-specta v2** typed bindings (prior untyped)
5. CRDT: Yjs default + **Loro reusing the shipped 2.2.0 merge seam** (prior Yjs-only)

## Parked
- `phase-v2-examples-and-docs-coverage` — resume after v3.
