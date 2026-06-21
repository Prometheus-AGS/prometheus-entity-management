# Tasks: v2.0 Realtime Fabric Parity (umbrella tracking)

Child-change completion tracker. Detailed tasks live in each child's `tasks.md`.

## Round 1 (parallel — no dependencies)
- [ ] `v2-crdt-merge-strategy-port` (C1, foundation)
- [ ] `v2-tauri-sqlite-persistence` (C4)
- [ ] `v2-devtools-time-travel` (C5)
- [ ] `v2-incremental-query-spike` (C7, gated)
- [ ] `v2-eslint-layering-rule` (C8)

## Round 2 (depends on Round 1)
- [ ] `v2-agui-ingestion-bridge` (C2 ← C1)
- [ ] `v2-flint-realtime-adapter` (C3 ← C1)
- [ ] `v2-devtools-graph-visualization` (C6 ← C5)

## Release gate
- [ ] All Round 1 + Round 2 changes verified (C7 may ship as ceiling-doc)
- [ ] `pnpm run typecheck` + `pnpm run test` green
- [ ] `pnpm run verify:skills` green
- [ ] CHANGELOG + spec delta written
- [ ] `pnpm publish` dry-run succeeds for 2.0.0
