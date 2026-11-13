## Why

`^1.0.0` everywhere (D5), dev pin 1.0.4, lockfile off 0.0.57 (G7), `zod` peer question settled. Root devDependencies for the real collaborators. Task 2 is an implementation probe (F-5, resolving the G3 UNKNOWN), not evidence.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 4 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Set AG-UI peer ranges to `^1.0.0` in core, react and a2ui-react, dev-pin 1.0.4, add `@ag-ui/client`, `@ag-ui/encoder` and `@ag-ui/a2ui-middleware` (latest at execution, recorded) with its peers as root devDependencies, re-resolve the lockfile, and satisfy the non-optional `zod` peer of `@ag-ui/core` 1.0.4
- Map the AG-UI 1.0 event, run-outcome and `resume[]` types from the installed `@ag-ui/core` into design.md, and probe a real `@ag-ui/a2ui-middleware` stream, recording its payload shape against our `a2ui-surface` ingestion
- Adapt to the middleware's `a2ui_operations` shape where it differs and request a resync on `a2ui_recovery`
- Write the `a2ui-activity-delivery` spec delta for recovery activities

## Impact

- Scope: peers in core/react/a2ui-react, root devDependencies, lockfile, activity ingestion
- Depends on: 1 · Est. M · Complexity Medium · frontier · MEDIUM
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
