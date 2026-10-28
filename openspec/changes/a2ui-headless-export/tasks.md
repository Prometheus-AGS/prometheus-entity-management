# Tasks: a2ui-headless-export

Model assignments: see the Task model assignments table in `.kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/plan.md`.
Conditional on a `go` from `a2ui-webcore-node-probe` and the operator's D2 decision.
Constraint: source under `official/`, `react/`, `policy/` must not contain, in any case, `STATE_SNAPSHOT`, `STATE_DELTA`, `MESSAGE_START`, `JSON.parse` or `jsonl`.

- [x] 1 Split the catalog so a React-free entry does not import `@a2ui/react`
- [x] 2 Add a headless entry with no React or DOM that applies the same allowlist, limits and validation as the React runtime
- [x] 3 Add `exportSurfaceMessages(surfaceId)` preserving catalog, root, theme, `sendDataModel`, component `catalogId` and `rootId`
- [x] 4 Keep v1 `wantResponse` and `responsePath` metadata exportable from the v1 compatibility layer
- [x] 5 Prune components unreachable from the root on export and report orphan accounting
- [x] 6 Add the package `exports` entry, a `tsup.config.ts` entry and the `entryPoints` update in `scripts/skills-package-registry.mjs`
