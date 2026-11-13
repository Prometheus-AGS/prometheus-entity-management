## Tasks

Model assignments for these tasks: see the **Task model assignments** table in `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`,
rows keyed `phase-a2ui-1-0-agui-upgrade` / `agui-1-0-floors-and-middleware-interop` / `agui-1-0-floors-and-middleware-interop#<n>`.

- [x] 4.1 Set AG-UI peer ranges to `^1.0.0` in core, react and a2ui-react, dev-pin 1.0.4, add `@ag-ui/client`, `@ag-ui/encoder` and `@ag-ui/a2ui-middleware` (latest at execution, recorded) with its peers as root devDependencies, re-resolve the lockfile, and satisfy the non-optional `zod` peer of `@ag-ui/core` 1.0.4
- [x] 4.2 Map the AG-UI 1.0 event, run-outcome and `resume[]` types from the installed `@ag-ui/core` into design.md, and probe a real `@ag-ui/a2ui-middleware` stream, recording its payload shape against our `a2ui-surface` ingestion
- [x] 4.3 Adapt to the middleware's `a2ui_operations` shape where it differs and request a resync on `a2ui_recovery`
- [x] 4.4 Write the `a2ui-activity-delivery` spec delta for recovery activities
