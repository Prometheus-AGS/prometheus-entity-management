# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 23 of 28 changes
**Current round:** Round 6 (next dependency-ready change)
**Updated:** 2026-08-22T13:40:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-docs-examples-integrations`

## Exact next command

```text
/kbd-apply v3-docs-examples-integrations
```

The concepts/packages docs change is certified and archived (2026-08-22): 27 hand-authored guide pages (quickstart, 13 concepts, 8 bindings, 5 practices) under `site/docs/guides/`, wired into a new `guidesSidebar` + "Guides" navbar section, with `site/capability-map.json` mapping 26 stable capabilities to concept/API/example routes. The snippet harness (`scripts/verify-skills-snippets.mjs`) is parameterized (`--root/--ext/--skip/--all-packages`) and now packs all 12 npm packages with `pnpm.overrides` pinning internal deps to tarballs — 40 guide snippets compile in the packed consumer. The release test (8/8) enforces the content contract (title/description, sidebar reachability, capability-map routes, data-flow language gate, registry-only installs). Gates: verifier 4/4 lanes (snippet-compile, release-gate, static-build, guide-routes), BDD 3/13, typecheck 23/23, validate errors [], foundation + api-reference regressions green, skills default lane unchanged (19/15). The evidence loop fixed ten authoring defects (wrong hook fields, async renderFragment, readRelations arity, Solid JSX pragma, Alpine typing, packed-consumer overrides). Next: example and integration docs (`v3-docs-examples-integrations`). `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
