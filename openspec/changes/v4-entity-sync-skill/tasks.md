# Tasks: v4-entity-sync-skill

- [ ] Create `prometheus-entity-sync-skill/SKILL.md` with full AgentSkills.io manifest (name, version, description, capabilities, compatibility)
- [ ] Write `references/sync-rule-dsl.md` — full TOML DSL reference with annotated examples (< 400 lines)
- [ ] Write `references/ts-sdk-api.md` — `SyncClient`, `prometheusSync()`, `useEntitySync`, `useSyncStatus` API reference (< 400 lines)
- [ ] Write `references/dart-sdk-api.md` — Dart `SyncClient` and `SyncStatusWidget` API reference (< 400 lines)
- [ ] Write `references/security-model.md` — JWT → bucket → data chain; BucketAssigner non-negotiable rules (< 400 lines)
- [ ] Write `references/wire-protocol.md` — PSyncV1 message type reference with binary layout notes (< 400 lines)
- [ ] Write `references/troubleshooting.md` — top 10 errors with cause + fix for each (< 400 lines)
- [ ] Write `recipes/add-entity-type.md` — end-to-end recipe: new entity type → sync rule → TypeScript transport registration
- [ ] Write `recipes/offline-first.md` — offline queue + resume-LSN reconnect pattern
- [ ] Write `recipes/multi-tenant.md` — JWT claim → parameter_queries → tenant-scoped buckets
- [ ] Write `recipes/tauri-setup.md` — pglite-oxide + Tauri plugin installation and first sync
- [ ] Implement `validators/sync-rule-linter.ts` using `@iarna/toml` — detects missing `parameters`, undefined `bucket_parameters` references, empty `data` sections
- [ ] Implement `validators/security-checker.ts` — detects string template interpolation of JWT claim values into SQL strings
- [ ] Add `examples/valid-rule.toml` and `examples/unsafe-rule.toml` for validator smoke tests
- [ ] Run `agentskills validate prometheus-entity-sync-skill/` — zero warnings
- [ ] Run `pnpm run verify:skills` in `prometheus-entity-sync` repo — passes
- [ ] Publish to agentskills.io under `@prometheus-ags` organization
