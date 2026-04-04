# Releasing `@prometheus-ags/prometheus-entity-management`

## Version policy

- **Semantic versioning** — Breaking API or documented behavior → major; additive features → minor; fixes → patch.
- **Changelog** — Every release updates [CHANGELOG.md](./CHANGELOG.md) (Keep a Changelog style).

## Pre-publish checklist

From the repository root:

1. `pnpm install`
2. `pnpm run typecheck`
3. `pnpm run build`
4. `pnpm run test`
5. `pnpm run verify:skills` (requires `dist/` from step 3; compares runtime exports to `skills/_shared/references/library-exports.json`)
6. `pnpm run typecheck:vite` and `pnpm run typecheck:next`

`prepublishOnly` runs typecheck, build, test, and `verify:skills` automatically; keep the skills ledger in sync when the public export surface changes:

```bash
pnpm run refresh:exports
```

Commit `skills/_shared/references/library-exports.json` when it changes.

## Publishing to npm

1. Bump `version` in [package.json](./package.json).
2. Commit and tag (`v1.0.0`, etc.).
3. `pnpm publish --access public` (maintainers only; requires npm auth).

## Post-release

- Push tags to the remote.
- Update GitHub release notes if desired (can mirror CHANGELOG).
