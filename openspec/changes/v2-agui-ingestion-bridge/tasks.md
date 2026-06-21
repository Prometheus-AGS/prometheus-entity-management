# Tasks: v2-agui-ingestion-bridge

- [ ] Decide JSON-Patch applier: reuse @ag-ui/client's vs. add fast-json-patch (Spec/impl call)
- [ ] Define agent-state-path → type:id:field mapping config
- [ ] Implement `applyAgUiSnapshot(snapshot, mapping)` → replaceEntity/upsertEntity
- [ ] Implement `applyAgUiDelta(delta, mapping)` → patchEntity / MergeStrategy write
- [ ] Add @ag-ui/core (and fast-json-patch if chosen) as optional peerDependency
- [ ] Guard: clear error if @ag-ui/* absent
- [ ] Unit tests: snapshot, add/replace/remove delta ops, shared-path conflict → MergeStrategy
- [ ] Export from `src/index.ts`
- [ ] `pnpm run refresh:exports` + update skill docs
- [ ] `pnpm run typecheck` + `pnpm run test` + `pnpm run verify:skills`
