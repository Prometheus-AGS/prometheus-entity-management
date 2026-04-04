# Phase Reflection: `phase-v1-npm-framework`

**Project:** prometheus-entity-management (`@prometheus-ags/prometheus-entity-management` on npm)  
**Date:** 2026-04-04  
**Phase completion:** **~98%** (registry, verification, and OpenSpec umbrella archive done)  
**Changes completed:** Core release track **complete**; OpenSpec **`/opsx:archive`** run **2026-04-04**

---

## Goals

| Goal | Status | Notes |
|------|--------|--------|
| Ship **`@prometheus-ags/prometheus-entity-management@1.0.0`** as a production-credible npm package | **MET** | Published to public registry **2026-04-04**; `prepublishOnly` ran typecheck, build, test, `verify:skills`. |
| Tests + CI gate quality | **MET** | Vitest smoke tests; GitHub Actions CI for library + example typechecks. |
| Docs + examples aligned to spec | **MET** | README, CLAUDE/AGENTS, `docs/*`, RELEASING, CHANGELOG; Vite + Next examples; TanStack bridge demo. |
| Skills ↔ runtime exports enforcement | **MET** | `library-exports.json` + `verify:skills` in CI and `prepublishOnly`. |
| Scoped package + distribution (`exports`, tsup `index.js` / `index.mjs`) | **MET** | `@prometheus-ags/prometheus-entity-management`; `.npmrc` set `provenance=false` for successful **local** publish (provenance requires CI OIDC). |
| OpenSpec umbrella change fully closed | **MET** | `prometheus-v1-0-release` moved to `openspec/changes/archive/2026-04-04-prometheus-v1-0-release/` (`/opsx:archive`, **2026-04-04**). |
| Git tag **`v1.0.0`** on remote | **PARTIAL / verify** | Maintainer should confirm `git tag` + `git push origin v1.0.0` on the release commit. |

**Overall:** Immutable **npm** outcome **MET**. OpenSpec archive **MET**. Remote tag **PARTIAL** until maintainer confirms `v1.0.0` on `origin`.

---

## Delivered Changes

- **`prometheus-v1-0-release` (OpenSpec umbrella)** — v1.0 spec, proposal, tasks, verification checklist; manual sign-off **2026-04-04**; **archived** same day under `openspec/changes/archive/2026-04-04-prometheus-v1-0-release/`.
- **Scoped npm package** — `package.json` name, `exports`, `tsup` CJS/ESM outputs; examples + docs imports (by: Cursor Agent + maintainer).
- **`.npmrc`** — `provenance=false` so local `pnpm publish` does not fail with `provider: null` (by: Cursor Agent).
- **KBD artifacts** — `progress.json`, `current-waypoint.md`, execution/plan/assessment alignment (by: Cursor Agent + maintainer).

---

## Technical Debt

- **OpenSpec:** *(resolved)* Umbrella change **archived** — no active change under `openspec/changes/` for v1.0 umbrella.
- **Provenance:** Registry publishes from **laptop** have **no** npm provenance attestation; future **GitHub Actions** release job could use `npm publish --provenance` + `id-token: write` if desired (`RELEASING.md` notes this).
- **Assessment table (historical):** Older rows mentioned “publish pending” / doc contradictions (Suspense, GC); **spot-check** that `CLAUDE.md` / `AGENTS.md` limitation bullets match current `src/` (optional cleanup PR).
- **Entity graph GC / Suspense:** Library may expose more than early “limitations” lines stated — **docs debt** if still inconsistent (see assessment §implementation status).

*(No intentional architecture violations introduced for graph layering in this phase.)*

---

## Architecture Integrity

- **AGENTS.md violations:** **NONE** observed for this phase’s edits (components → hooks → stores layering preserved in examples).
- **Constraint violations:** **N/A** — `.kbd-orchestrator/constraints.md` not present; rules taken from `AGENTS.md` / `CLAUDE.md`.

---

## Cross-Tool Coordination Notes

- **Progress tracking:** **RELIABLE** — `progress.json` updated through publish and post-publish doc ticks.
- **Handoff quality:** **CLEAR** — `execution.md` and `current-waypoint.md` separated automatable gates from maintainer npm auth.
- **Recommendations:** After each release, **commit** KBD + OpenSpec markdown in the same PR as version bump to avoid drift; run **`/opsx:archive`** when the umbrella change is complete.

---

## Lessons Learned

- **`pnpm publish` + `provenance=true` in `.npmrc`** breaks **local** publishes (`Automatic provenance generation not supported for provider: null`); scope provenance to **CI** or set `provenance=false` for developer machines.
- **`ERR_PNPM_GIT_UNCLEAN`** is a feature — commit release artifacts before publish so the tag matches tarball contents.
- **Scoped package** requires updating **path aliases, plugin keywords, and every doc import example** — worth a single scripted grep or CI check for stray unscoped names.
- **`verify:skills` in `prepublishOnly`** catches export drift before anything hits the registry.

---

## Next Phase Focus

**Suggested phase name:** `phase-v1-post-release-hardening` *(or run `/kbd-assess` without a preset name)*  

**Top priorities:**

1. **Git:** Ensure **`v1.0.0`** tag exists on **`origin`** at the published commit.
2. **Optional:** Add **`npm publish` in GitHub Actions** (OIDC) with **provenance**; keep local `.npmrc` safe for maintainers.
3. **Optional:** **Bundle/size** guardrail (`size-limit` or similar), broader tests (pagination, realtime, SSR), ElectricSQL doc pins per assessment seeds.

---

## Context for Next Phase

Use this file as prior context for the next **`/kbd-assess`** invocation.

**Trigger (per KBD skill):** `[kbd] Reflection complete — advance to next phase with /kbd-new-phase` *(or `/kbd-assess` to define the next milestone).*

---

## Historical narrative (retained)

### Outcomes achieved (codebase)

- Vitest smoke tests; GitHub Actions CI (typecheck, build, test, `verify:skills`, example typechecks).
- Canonical docs (README map, bundle methodology, `docs/tanstack-query-and-table.md`, `docs/advanced.md`, `RELEASING.md`, `CHANGELOG` **[1.0.0]**).
- Vite **`/tanstack-bridge`** demo (TanStack Query → `upsertEntity`); example READMEs.
- **`skills/_shared/references/library-exports.json`** + `verify:skills` / `refresh:exports`; immutable rule in `AGENTS.md` / `CLAUDE.md`.
- KBD **plan** / **assessment** updated for Zustand-only graph and migration framing.

### Registry release

- **`@prometheus-ags/prometheus-entity-management@1.0.0`** published to the public npm registry (**2026-04-04**).
