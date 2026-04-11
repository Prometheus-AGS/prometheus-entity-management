## Summary

<!-- What does this PR change and why? -->

## Checklist

- [ ] `pnpm run typecheck` passes (library)
- [ ] If **`src/index.ts`** public exports or **architecture rules** in `AGENTS.md` / `CLAUDE.md` changed: updated `prometheus-entity-skills/_shared/references/` (e.g. `library-api.md`) and ran `pnpm run refresh:exports` so `pnpm run verify:skills` passes
- [ ] Example apps: `pnpm run typecheck:vite` / `typecheck:next` if relevant to the change

## Skills ↔ code (immutable)

This repo enforces agent-facing docs against the built bundle. **Do not merge** export or rule changes without a green `verify:skills` (CI runs it on PRs to `main`).
