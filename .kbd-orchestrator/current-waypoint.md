# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 27 of 28 changes
**Current round:** Round 8 (stable publication is the human gate)
**Updated:** 2026-08-23T08:20:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-stable-publication` — **human gate; do not start autonomously.**

## Exact next command

```text
/kbd-apply v3-stable-publication   # requires explicit operator authorization
```

The release-certification change is certified and archived (2026-08-23): new root command `pnpm run release:check` (`scripts/release-check.mjs`) runs 35 mandatory lanes spanning frozen install, lint, typecheck, the full `ci:test` suite (turbo units + release node tests + 129-scenario BDD run), builds, security audit, skills/snippets, packed-consumer contract lanes, sync persistence, A2UI/A2A bridges, Flutter provenance, Dart/Riverpod, Tauri plugin, registry dry runs, Flint contracts, example coverage, all five example gates, and all eight docs verifiers. `--seal` produces a fail-closed SHA-256-hashed evidence manifest bound to one source SHA — missing, failed, drifted, or tampered mandatory lanes seal `incomplete` (proven by unit tests, BDD, and an empty-bundle smoke test). Final clean run against annotated tag `v3.0.0-rc.1` (`55dc8dc`): **verdict complete, 35/35 pass, 1245 s total**. The sweep caught and fixed real cross-change drift: 10 live-DB security advisories dispositioned as time-bounded build-time-only acceptances, stale "planned" assertions across six gates after the Flutter example shipped, ledger output-format drift from the skills generalization, generated-artifact scan false positives, and a cargo registry-cache eviction (re-warmed). Explicit limits recorded in the manifest: Tauri physical-device (platform), first live Pages deploy (manual), npm trusted-publisher config (manual); the tag is annotated but unsigned (no signing key configured). Evidence: `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-certification/` (bundle + verification.md + release-impact.md). **Boundary: `v3-stable-publication` (28) remains the human-gated hand-off — release disposition stays blocked by design until the operator authorizes it.**

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
