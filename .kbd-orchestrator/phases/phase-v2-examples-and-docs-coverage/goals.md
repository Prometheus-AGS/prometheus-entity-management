# Goals — phase-v2-examples-and-docs-coverage

**Created:** 2026-06-22
**Type:** examples + documentation coverage
**Context:** Following the 2.2.0 "Realtime Fabric Parity" release, the library's public surface (197 exports) has grown well beyond what the two example apps and the docs demonstrate. This phase closes the example/doc coverage gap so every supported capability has a clear, correct usage example.

## Primary goals

1. **Assess the example codebases** — inventory what `examples/vite-app` and `examples/nextjs-app` (and any others) currently demonstrate, and the quality/correctness of those demonstrations against the strict Component → Hook → Store layering rule.

2. **Assess documentation state** — inventory `README.md`, `docs/*`, `ARCHITECTURE.md`, `CHANGELOG.md`, and skill docs; determine which capabilities are documented vs. shipped.

3. **Map capability coverage** — build a matrix of every public capability (the 197 exports / feature areas: transport registry, hooks, view layer, CRUD, realtime adapters incl. Flint/Surreal/Supabase/Electric/Convex, AG-UI ingestion, CRDT MergeStrategy/Loro, local-first/PGlite/Tauri-SQLite, incremental queries, time-travel devtools, graph viz, GraphQL, table engine, presets, ESLint layering) against current example/doc coverage.

4. **Gap analysis** — identify exactly which capabilities have NO example, which have a partial/outdated example, and which docs are missing or stale relative to 2.2.0.

5. **Recommendations to close the gap** — a concrete plan: which new example apps/routes/snippets to build, which docs to write/update, prioritized, so the library has clear examples of proper use in every supported scenario.

## Success criteria

- [ ] A capability→example→doc coverage matrix exists, with every public capability rated covered / partial / missing.
- [ ] Each example app's current scope and layering-compliance is documented.
- [ ] A prioritized, actionable closure plan (new examples + doc updates) is produced.
- [ ] Recommendations respect the non-negotiable Component → Hook → Store rule and the optional-peer-dep posture of 2.2.0 integrations.

## Non-goals (this phase)

- Implementing the new examples/docs themselves (that's the execute stage of THIS or a follow-on phase — this phase is assess → analyze → plan first).
- The separate `phase-v3-universal-platform-evolution` initiative (multi-framework / Flutter / Rust CLI / A2UI / peer sync), which remains a distinct phase on disk for later.
