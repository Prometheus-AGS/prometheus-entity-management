## Tasks

Model assignments for these tasks: see the **Task model assignments** table in `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`,
rows keyed `phase-a2ui-1-0-agui-upgrade` / `a2ui-0-15-library-baseline` / `a2ui-0-15-library-baseline#<n>`.

- [x] 1.1 Read the `@a2ui/web_core` and `@a2ui/react` changelogs 0.12.0→0.15.0 and record every breaking change against its call sites in design.md
- [x] 1.2 Install workspace dependencies, pin `@a2ui/web_core` and `@a2ui/react` exactly at 0.15.0, and write one 0.15.0 patch file covering the zod/v3 rewrite (including `import("zod")` type references) and the #75 extension-less import, recording bundle size before and after
- [x] 1.3 Make the published `a2ui-react` declarations independent of the upstream #75 declaration so packed consumers type-check with `skipLibCheck: false`, and draft the upstream fix
- [x] 1.4 Fix the 0.13–0.15 API breaks in `packages/a2ui-react` (basic catalog import, possibly-undefined `SurfaceModel.catalog`, parent/child enforcement through `createPrometheusA2uiComponent`, `CatalogInterface` additions, agent-only invoker, `a2ui-` class prefix)
- [x] 1.5 Update the 0.12.0 and v0.9.1 pins in `scripts/verify-a2ui-protocol-bridge.mjs`, `scripts/verify-package-contracts.mjs`, the release notes, and `tests/steps/v3-a2ui-protocol-bridge.steps.ts` (kept consistent, not cited as evidence)
