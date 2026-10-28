# Tasks: a2ui-hardening-acceptance

Model assignments: see the Task model assignments table in `.kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/plan.md`.
Nothing here is authored or run until all production tasks of the other seven changes are complete and wired.

## Implementation

- [x] 1 Scaffold the `examples/agui-activity-lab` package: add it to `pnpm-workspace.yaml`, copy the `src` aliases for `@prometheus-ags/a2ui-react` used by the other examples, add `@ag-ui/core`, and update `pnpm-lock.yaml`
- [x] 2 Add a Node SSE server that emits AG-UI 1.0 snapshots, deltas and `MESSAGES_SNAPSHOT` with versions and epochs and records received action envelopes
- [x] 3 Add the consumer page that feeds the stream to `PrometheusA2uiRuntime` through the package hooks layer and posts action envelopes back

## Static confirmation (once)

- [x] 4 Run one scoped `typecheck:affected` for the touched workspaces

## Documentation and gates (once)

- [x] 5 Update the package README, the bridge document and the skills reference, reconcile the existing gates' expectations for the replacement assertion, export counts and pins, then run the scoped `refresh:exports` and `verify:skills`

## Integration

- [x] 6 Author the executable scenarios as Cucumber features and Playwright flows with a new Playwright config and confirm the Cucumber config picks up the new features
- [x] 7 Run the complete integration set once against the real producer and consumer, fix defects, rebuild the package output and rerun, including the registry comparison for the delivery-only scenario

## Review

- [x] 8 Run an artifact-only review, record evidence, and archive the phase changes only after the gates pass, without tagging or publishing
