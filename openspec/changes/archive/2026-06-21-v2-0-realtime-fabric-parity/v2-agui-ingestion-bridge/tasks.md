# Tasks: v2-agui-ingestion-bridge

- [x] Decide JSON-Patch applier: reuse @ag-ui/client's vs. add fast-json-patch (Spec/impl call)
- [x] Define agent-state-path → type:id:field mapping config
- [x] Implement `applyAgUiSnapshot(snapshot, mapping)` → replaceEntity/upsertEntity
- [x] Implement `applyAgUiDelta(delta, mapping)` → patchEntity / MergeStrategy write
- [x] Add @ag-ui/core (and fast-json-patch if chosen) as optional peerDependency
- [x] Guard: clear error if @ag-ui/* absent
- [x] Unit tests: snapshot, add/replace/remove delta ops, shared-path conflict → MergeStrategy
- [x] Export from `src/index.ts`
- [x] `pnpm run refresh:exports` + update skill docs
- [x] `pnpm run typecheck` + `pnpm run test` + `pnpm run verify:skills`
