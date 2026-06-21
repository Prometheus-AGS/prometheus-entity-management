# Tasks: v2-crdt-merge-strategy-port — DONE (commit 317c572)

- [x] Define `MergeStrategy` interface + `MergeContext` (prev, next, origin, updatedAt) in `src/merge/types.ts`
- [x] Implement `lwwStrategy` (default — matches current shallow-merge semantics)
- [x] Add `registerMergeStrategy(type, strategy)` + lookup; default fallback to LWW
- [x] Wire strategy lookup into `upsertEntity`/`upsertEntities` (graph.ts) without changing default behavior
- [x] Implement `createLoroMergeStrategy` in `src/merge/loro.ts` with lazy `import("loro-crdt")`
- [x] Add `loro-crdt` as optional peerDependency + peerDependenciesMeta
- [x] Unit tests: LWW unchanged; custom strategy invoked; resolution order; missing-peer guard (5 tests)
- [x] Export from `src/index.ts`
- [x] `pnpm run refresh:exports` (ledger 176→182)
- [x] `pnpm run typecheck` + `pnpm run test` (164 pass) + `pnpm run verify:skills` (182) + treeshake
