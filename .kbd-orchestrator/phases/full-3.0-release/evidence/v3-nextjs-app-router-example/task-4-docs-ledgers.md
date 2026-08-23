# Task 4 — coverage, public API, skills, and documentation

Recorded: 2026-08-03

## Result

The Next.js App Router implementation is now represented across the declared
coverage, React API, skill, example, root, and release documentation surfaces.
The update preserves the evidence boundary: implementation and its verification
command are present, but the Next.js showcase and its browser/visual evidence
remain `planned` until task 5 executes the clean packed production verifier.

## Updated surfaces

- `examples/coverage.json` names `pnpm run verify:nextjs-app-router` and its
  structural/browser sources without claiming a clean receipt.
- The React runtime export ledger adds `GraphStoreProvider` and
  `useGraphStoreApi`; the API reference also records
  `GraphStoreProviderProps` and store-scoped engine behavior.
- The React README and changelog document provider-owned SSR graphs.
- The Next.js example README now documents request creation, RSC serialization,
  one browser store, Server Action mutation, realtime takeover, layering, and
  the packed verification boundary.
- The shared Next.js skill reference replaces the earlier global batch-upsert
  guidance across setup, migration, optimization, and realtime skills.
- Root and release documentation link the Next.js boundary while distinguishing
  present implementation from pending clean evidence.

## Verification

- `pnpm run verify:example-coverage`: pass; 13/13 semantic scenarios, 16
  capabilities, 16 stable artifacts, 5 showcase identities, release remains
  uncertified.
- `node --test tests/release/v3-example-coverage-contract.test.mjs`: pass; 14/14.
- `node --test tests/release/v3-nextjs-app-router-example.test.mjs`: pass; 5/5.
- Focused ESLint for the scoped provider and Next runtime sources: pass.
- Focused JSON/export-ledger truthfulness contract: pass; 203 unique sorted
  React runtime exports and the Next evidence remains planned.
- `openspec validate v3-nextjs-app-router-example --strict --no-interactive`:
  pass.
- `git diff --check`: pass.

## Deferred verification

The direct React package typecheck could not resolve
`@prometheus-ags/entity-graph-core` because the core package's ignored `dist/`
directory is absent in this worktree. No build was introduced into this
documentation task. Task 5 owns the clean dependency-ordered build, package
typechecks, generated export-ledger comparison, packed Next.js production
build, and Playwright evidence.

## Security boundary

No security code changed. Documentation now identifies the existing trust
boundary: the Server Action validates task ID and status and resolves the task
from server-owned data; client input does not grant entity or graph authority.
