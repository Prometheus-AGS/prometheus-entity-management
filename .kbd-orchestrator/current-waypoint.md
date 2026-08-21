# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 19 of 28 changes
**Current round:** Round 5 (next dependency-ready change)
**Updated:** 2026-08-21T10:45:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-skills-ecosystem`

## Exact next command

```text
/kbd-apply v3-skills-ecosystem
```

The Flint portable contracts change is certified and archived (2026-08-21): default CI now runs the watch/mutate wire contract against a checked fixture with zero machine-specific paths and no silent skips; the live SDK lane is env-gated (`FLINT_EM_MODULE`/`FLINT_SDK_MODULE`) and verified fail-closed when unavailable; seam security (tenant/channel propagation, per-channel+consumer checkpoint key separation, fail-closed decode) is pinned by tests; and the flint-gate/flint-forge issuer/tenant/kid/JWKS/role/key-separation contract plus Forge provisioning, RLS, audit, restart, and strict-JWK caveat are pinned as a checked claims fixture + `docs/flint-integration.md` with release-gate consistency and examples secret scans. Gates: verifier 4/4 lanes, core suite 182+1 todo, release test 6/6, BDD 3/15, typecheck 23/23, validate + coverage errors []. Next: update skills to the complete 3.0 package and framework surface (`v3-skills-ecosystem`). `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
