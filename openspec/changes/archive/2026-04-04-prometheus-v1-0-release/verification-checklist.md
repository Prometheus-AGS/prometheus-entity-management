# Manual verification — `prometheus-v1-0-release`

**Signed off:** 2026-04-04 (manual verify equivalent; package **`@prometheus-ags/prometheus-entity-management@1.0.0`** published to npm).

Use this when the OpenSpec CLI `verify-change` is unavailable. Check every box before closing the change or tagging **v1.0.0**.

## Spec [`openspec/specs/v1-0.md`](../../specs/v1-0.md)

- [x] **2.1** Library surface (graph, engine, hooks, view/CRUD/GQL/adapters, DevTools) matches shipped `dist/` exports.
- [x] **2.2** `pnpm run typecheck`, `pnpm run build`, `pnpm run test`, `pnpm run verify:skills` pass locally (same as CI).
- [x] **2.3** README, CLAUDE/AGENTS, guides (`docs/tanstack-query-and-table.md`, `docs/advanced.md`), `RELEASING.md`, `CHANGELOG.md` consistent with implementation.
- [x] **2.4** Vite + Next.js example READMEs and `/tanstack-bridge` demo present as specified.
- [x] **2.5** `package.json` version and `prepublishOnly` match spec (includes `verify:skills`).

## Non-goals

- [x] No first-class Redux/MobX graph backends introduced.

## Commands

```bash
pnpm install
pnpm run typecheck && pnpm run build && pnpm run test && pnpm run verify:skills
pnpm run typecheck:vite && pnpm run typecheck:next
```
