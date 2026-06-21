# Tasks: v2-crdt-merge-strategy-port

- [ ] Define `MergeStrategy` interface + `MergeContext` (prev, next, origin, updatedAt) in `src/merge/types.ts`
- [ ] Implement `lwwStrategy` (default — matches current shallow-merge semantics)
- [ ] Add `registerMergeStrategy(type, strategy)` + lookup; default fallback to LWW
- [ ] Wire strategy lookup into `upsertEntity` (graph.ts) without changing default behavior
- [ ] Implement `loroStrategy` in `src/merge/loro.ts` with lazy `import("loro-crdt")`
- [ ] Add `loro-crdt` as optional peerDependency + peerDependenciesMeta
- [ ] Unit tests: LWW unchanged; Loro resolves concurrent writes; missing-peer guard
- [ ] Export from `src/index.ts`
- [ ] `pnpm run refresh:exports` + update skill docs
- [ ] `pnpm run typecheck` + `pnpm run test` + `pnpm run verify:skills`
