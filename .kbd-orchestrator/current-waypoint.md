# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 24 of 28 changes
**Current round:** Round 6 (next dependency-ready change)
**Updated:** 2026-08-22T15:20:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-docs-operations-migration`

## Exact next command

```text
/kbd-apply v3-docs-operations-migration
```

The examples/integrations docs change is certified and archived (2026-08-22): 5 tutorials (`site/docs/examples/`: vite-react19, nextjs-app-router, agentic-a2ui, flutter-riverpod, tauri-universal) with an enforced section contract and feature matrices validated against `examples/shared/scenario-contract.json`, plus 6 integration guides (`site/docs/integrations/`: websocket, supabase, graphql, pglite-loro, a2a-a2ui, flint) each carrying the demo-mode/live-credentials split. `examplesSidebar` gains Tutorials + Integrations categories; the release test (10/10) enforces the content contract (tutorial sections, scenario IDs, example dir reachability, demo/live markers, alt text, CI gate references). The snippet lane compiles 45 fences from 27 docs; `@supabase/supabase-js` joined the consumer deps and two harness-caught defects were fixed (Supabase client boundary cast, GQLSubscriptionConfig shape drift). Gates: verifier 4/4 lanes, BDD 3/13, typecheck 23/23, validate errors [], concepts + foundation + api-reference regressions green. Next: operations and migration docs (`v3-docs-operations-migration`). `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
