## Why

Changelog read mapped to call sites first (G13; closes goal 4). One combined 0.15.0 patch file for the zod/v3 rewrite (G9, including `import("zod")` type references) and the #75 import (pnpm keeps one patch per package version). Published declarations made independent of the broken upstream file (see Operator attention). API fixes. v0.9.1 surfaces must still render; 1.0 is not added yet.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 1 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Read the `@a2ui/web_core` and `@a2ui/react` changelogs 0.12.0→0.15.0 and record every breaking change against its call sites in design.md
- Install workspace dependencies, pin `@a2ui/web_core` and `@a2ui/react` exactly at 0.15.0, and write one 0.15.0 patch file covering the zod/v3 rewrite (including `import("zod")` type references) and the #75 extension-less import, recording bundle size before and after
- Make the published `a2ui-react` declarations independent of the upstream #75 declaration so packed consumers type-check with `skipLibCheck: false`, and draft the upstream fix
- Fix the 0.13–0.15 API breaks in `packages/a2ui-react` (basic catalog import, possibly-undefined `SurfaceModel.catalog`, parent/child enforcement through `createPrometheusA2uiComponent`, `CatalogInterface` additions, agent-only invoker, `a2ui-` class prefix)
- Update the 0.12.0 and v0.9.1 pins in `scripts/verify-a2ui-protocol-bridge.mjs`, `scripts/verify-package-contracts.mjs`, the release notes, and `tests/steps/v3-a2ui-protocol-bridge.steps.ts` (kept consistent, not cited as evidence)

## Impact

- Scope: package deps, one patch file, declaration bundling, `packages/a2ui-react/src/official/*`, packed-consumer pins
- Depends on: NONE · Est. L · Complexity High · Model class frontier · Customer value HIGH
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
