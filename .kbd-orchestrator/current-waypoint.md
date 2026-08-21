# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 18 of 28 changes
**Current round:** Round 5 (next dependency-ready change)
**Updated:** 2026-08-21T09:05:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-flint-portable-contracts`

## Exact next command

```text
/kbd-apply v3-flint-portable-contracts
```

The universal Tauri example is certified and archived (2026-08-21): one React 19/Vite 8 frontend drives desktop and mobile Tauri shells through the certified entity-graph plugin — Rust MockRuntime command E2E 3/3 (round-trip, fail-closed denied webview, offline persist/clear/restore restart), bridge contract tests 5/5, Chromium desktop+mobile viewport lanes 7 scenarios each with clean axe, and compile-level desktop binary, Android APK, and unsigned iOS simulator app receipts (booted-device runs remain retained limits). Nine example-local defects were found and fixed; no library changes. Next: replace local-path skips with portable Flint security and data contracts (issuer/tenant/kid/JWKS/role tests, Forge provisioning docs, no machine-specific paths in default CI). `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
