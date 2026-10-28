# Tasks: a2ui-activity-idempotency

Model assignments: see the Task model assignments table in `.kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/plan.md`.
Constraint: source under `official/`, `react/`, `policy/` must not contain, in any case, `STATE_SNAPSHOT`, `STATE_DELTA`, `MESSAGE_START`, `JSON.parse` or `jsonl`; `runtime.ts` must not contain `getState(`.
The legacy "honors replacement" assertion is reconciled once, in `a2ui-hardening-acceptance#5`.

- [x] 1 Track the creating message of each surface separately from messages that only update it
- [x] 2 Read the ordering key `(surface, epoch, version)` from `content.surfaceVersions`, with epoch as a producer-raised integer defaulting to 0
- [x] 3 Add a canonical content digest and bounded tombstone and tracked-message maps wired to the runtime limits
- [x] 4 Filter an activity's operations per surface so a stale surface and a fresh surface in one message are handled independently
- [x] 5 Reconcile a restatement in place by stripping `createSurface` for held surfaces, reporting a differing catalog, theme or `sendDataModel` as a producer fault, and keeping the v1 action-clearing path correct
- [x] 6 Track the last producer-applied value per data path and write only changed paths, with producer-wins conflicts reported through `onConflict`
- [x] 7 Handle `MESSAGES_SNAPSHOT` through the idempotent path, untracking absent messages without deleting their surfaces
- [x] 8 Document the behavior change and add the changelog callout for the minor release
