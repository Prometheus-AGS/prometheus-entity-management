# Task 4 — coverage, public API ledgers, skills, and documentation

Date: 2026-08-03

## Coverage disposition

- Corrected the showcase path to `examples/agentic-a2ui-app`.
- Kept the showcase status `planned` because clean production-browser and
  visual evidence has not yet run.
- Recorded focused unit results as partial capability integration evidence and
  kept both showcase-level runtime and visual evidence `planned`, with their
  declared Playwright command and sources.

## Public API disposition

This change is an example application only. It does not change a publishable
entry point or runtime export in `@prometheus-ags/entity-graph-a2a` or
`@prometheus-ags/a2ui-react`. The inspected
`a2a-library-exports.json` and `a2ui-library-exports.json` ledgers therefore
remain unchanged. Regenerating them would create false API churn.

## Documentation and skill routes

- Added the release-facing architecture, action matrix, commands, current
  evidence state, and exclusions in `release/agentic-a2ui-example.md`.
- Added the agent-facing composition rules in
  `prometheus-entity-skills/_shared/references/agentic-a2ui-example.md` and
  routed both skill indexes to it.
- Updated the root, release, example, A2A-package, and A2UI-package guides to
  link to the dedicated example without weakening their independent evidence
  boundaries.

## Task-scoped verification

- `jq empty examples/coverage.json examples/coverage.schema.json` — pass.
- `pnpm run verify:example-coverage` — pass; 13/13 semantic scenarios, 16
  stable capabilities, 16 stable artifacts, five showcases, overall status
  `in-progress`, and `releaseCertified: false`.
- `pnpm run test:example-coverage` — pass; 14/14 tests.
- `openspec validate v3-agentic-a2ui-example --strict` — pass.
- `git diff --check` — pass.
- All newly linked repository paths exist.
- `git diff --name-only` confirms neither A2A nor A2UI export ledger changed.
- The package-specific `verify:skills` attempt stopped before comparison because
  `packages/a2ui-react/dist/index.mjs` is absent in this unbuilt worktree.
  Package builds and both export checks remain explicitly deferred to task 5's
  clean gate; this task does not claim built-export verification.
