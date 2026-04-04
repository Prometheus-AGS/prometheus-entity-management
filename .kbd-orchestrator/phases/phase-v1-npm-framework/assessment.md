# ASSESSMENT: phase-v1-npm-framework

**Project:** @prometheus-ags/prometheus-entity-management  
**Date:** 2026-04-04  
**Codebase baseline:** Mature TypeScript library with Zustand entity graph, engine (dedupe/SWR/GC), hooks (including Suspense), GraphQL/CRUD/view layers, realtime adapters, ElectricSQL/PGlite-oriented `SyncAdapter`, optional `@tanstack/react-table` UI. **As of 2026-04 follow-up:** Vitest smoke tests, GitHub Actions CI, `CLAUDE.md` / `AGENTS.md` / README aligned with implementation, `docs/tanstack-query-and-table.md` + `docs/advanced.md`, Vite `/tanstack-bridge` demo, `verify:skills` + `library-exports.json`, package **1.0.0** ready; **npm publish** is the remaining maintainer action.

**Cross-tool progress:** none — first KBD orchestrator run for this repo.

---

## IMPLEMENTATION STATUS

| Area | Status | Detail |
|------|--------|--------|
| Core graph (`entities` / `patches` / `lists`) | **DONE** | Canonical normalization model matches stated architecture. |
| Engine (dedupe, subscribers, stale-while-revalidate, GC) | **DONE** | `configureEngine`, `startGarbageCollector`, `defaultGcTime` — contradicts older “no GC” notes in `CLAUDE.md` / `AGENTS.md`. |
| REST hooks (`useEntity`, `useEntityList`, mutations, augment) | **DONE** | Primary developer surface. |
| Suspense hooks | **DONE** | `useSuspenseEntity`, `useSuspenseEntityList` in `src/hooks.ts` — contradicts `CLAUDE.md` / `AGENTS.md` “no Suspense yet”. |
| View layer (filters, completeness modes, local/remote/hybrid) | **DONE** | `useEntityView`, evaluators, transport compilers. |
| CRUD + relation registry + cascade invalidation | **DONE** | `useEntityCRUD`, `registerSchema`, `cascadeInvalidation`. |
| GraphQL hooks | **DONE** | Per `src/index.ts` exports. |
| Realtime adapters + coalescing manager | **DONE** | WebSocket/Supabase-style patterns; 16ms batching. |
| ElectricSQL / PGlite path | **PARTIAL** | `createElectricAdapter`, `useLocalFirst`, `usePGliteQuery` — minimal surface types to avoid hard deps; production apps still integrate `@electric-sql/*` themselves. |
| DevTools | **PARTIAL** | `useGraphDevTools` exported — scope/UX vs Redux DevTools not assessed here. |
| TanStack React Table integration | **PARTIAL** | Peer-optional; `EntityTable` / column builders exist; not the “data owning” layer — **by design** lists are IDs + graph joins. |
| npm publish readiness | **READY (publish pending)** | `1.0.0`, `prepublishOnly` = typecheck + build + test + `verify:skills`; README bundle section documents unminified `dist` + measurement; registry upload is maintainer-only. |
| Automated tests | **DONE** | Vitest: `src/graph.test.ts`, `src/engine.test.ts`, `src/realtime-manager.test.ts`; CI runs `pnpm run test`. |
| WebRTC / multi-device P2P sync | **MISSING** | Not a first-class adapter; industry uses RxDB WebRTC plugin, Yjs, Gun, etc. — would be **integration layer** on top of graph or PGlite, not duplicate inside core. |

---

## CROSS-TOOL PROGRESS

**NONE** — no prior `progress.json` from other tools.

---

## SPEC GAP SUMMARY

### Repo docs vs code

- **Resolved:** `CLAUDE.md` / `AGENTS.md` / README now describe Suspense hooks, GC, DevTools, and Vitest consistently with `src/`.

### Positioning vs TanStack Query & TanStack Table

- **TanStack Query** is *server-state*: query-key–scoped cache, excellent fetch lifecycle, `setQueryData` / invalidation at **key** granularity. Community pain (e.g. GitHub discussions) matches the library’s thesis: **nested entities duplicated across infinite queries**, updating shared entities requires touching multiple caches or normalization elsewhere.
- **@prometheus-ags/prometheus-entity-management** is an **entity-centric view model**: one graph keyed by `(type, id)`, lists hold **IDs**, realtime/mutations upsert **once**. It overlaps *problems* with “TanStack Query + normalized store” and with **TanStack DB** (emerging TanStack stack for normalized local storage + live queries). Differentiation for v1 docs: **explicit entity graph + patches + list projection + adapters** in one package, Zustand-native, optional table UI.
- **TanStack Table** is **headless UI** (sorting/pagination APIs), not an entity cache. This library correctly sits **under** or **beside** it: table rows should read **derived** row models from graph + list IDs, not own entity copies.

### Industry landscape (Tavily-backed, 2024–2026)

- **Hybrid pattern is mainstream**: TanStack Query for fetch/orchestration + **normalized local store** (or TanStack DB) for ID-keyed data. Medium/writeups describe wiring Query `onSuccess` → upsert into normalized collections; Electric’s own docs increasingly reference **TanStack DB + PGlite** for web/mobile local-first.
- **TanStack Query** adoption remains very high (State of JS/React surveys cited in research synthesis); **Zustand** is widely adopted as the lightweight global store (multiple 2025 articles / surveys in search results).
- **ElectricSQL + PGlite**: PGlite sync plugin is still evolving (alpha docs: shape sync into tables; advanced write-path/conflict stories vary by version). **Competition**: Zero, PowerSync, InstantDB, Triplit (acquired by Supabase per community lists) — v1 should **not** claim to replace those engines; claim **integration** via adapters + graph writes.
- **WebRTC P2P entity sync**: niche; RxDB documents WebRTC replication; Yjs/CRDT stacks for collaboration. A **credible v1** treats WebRTC as: *optional recipe* (feed `ChangeSet` into `RealtimeManager` from a P2P layer), not a built-in second sync engine.

### Bundle / publish artifacts

- `tsup` builds **~296 KB** ESM unminified (single entry re-exports large surface). README documents **how to measure** gzip and avoids a single misleading marketing number.

---

## BUILD HEALTH

| Check | Result |
|-------|--------|
| `pnpm run typecheck` | **PASS** |
| `pnpm run build` (tsup) | **PASS** |
| `pnpm run test` (Vitest) | **PASS** (CI) |
| `pnpm run verify:skills` | **PASS** (CI) |
| Known doc violations vs `src/` | **None** (canonical docs refreshed) |

---

## CONSTRAINT CHECK

- **AGENTS.md layering (Components → Hooks → Stores)**: No violation detected in intent; verify example apps do not bypass hooks in components (spot-check only — not exhaustive this pass).
- **pnpm-only**: Respected in scripts.
- **constraints.md**: N/A (file not present).

---

## GOAL PROGRESS (phase: v1 npm framework)

| Goal | Status | Reason |
|------|--------|--------|
| Clear positioning vs TanStack Query / Table | **MET** | `docs/tanstack-query-and-table.md` + README migration section + Vite `/tanstack-bridge`. |
| Publishable npm package | **READY** | Semver `1.0.0`, `CHANGELOG`, `RELEASING.md`, tests + CI + `prepublishOnly`; **npm publish** outstanding. |
| Realtime cross-app consistency | **MET** (core) | Adapters + graph; app-specific wiring required. |
| Advanced PGlite + Electric + future WebRTC | **PARTIAL** | Electric adapter path exists; WebRTC/P2P remains a **recipe** (`ChangeSet` → `RealtimeManager`), not core. |

---

## REDUX, MOBX, OR ZUSTAND ONLY?

### Recommendation for v1: **Zustand-first; no first-class Redux/MobX backends**

| Option | Assessment |
|--------|------------|
| **Zustand** | Already the graph implementation; tiny API; excellent React integration; `immer` aligns with graph mutations; **ship v1 here**. |
| **Redux Toolkit** | `createEntityAdapter` solves similar normalization; teams on RTK often pair **RTK Query** — overlapping mental model with TanStack Query. Supporting Redux as an **alternate graph backend** would duplicate the entire store API and multiply maintenance **without** expanding addressable market proportionally (greenfield React skews Zustand/Jotai). |
| **MobX** | Observable model differs from Zustand’s `useSyncExternalStore` pattern; bridging would be non-trivial. Low priority unless enterprise sponsor. |
| **Jotai / Recoil / Legend** | Interesting for atom-per-entity patterns; **out of scope for v1** unless offering a thin “selector facade” later. |

**Interoperability without multi-backend support (Zustand-only):** **`useGraphStore.getState()`** is for effects, workers, adapters, and **non-React** modules, and for **hook modules** that orchestrate bridges (e.g. TanStack Query → `upsertEntity` — see Vite `/tanstack-bridge`). **React components** stay on **hooks only** per `AGENTS.md` (`useEntity`, `useEntityList`, …); do not subscribe to `useGraphStore` in `*.tsx` files. **No** first-class Redux/MobX graph backends in v1 (see spec non-goals). Migration **from** Redux in a consumer app remains a valid narrative in skills as **source** context, not as a supported backend for this library’s graph.

---

## V1 GAP CLOSURE (PRIORITIZED)

**Status:** P0–P1 items below are **implemented** unless noted.

### P0 — Ship credibility

1. **Docs aligned** with code (`CLAUDE.md` / `AGENTS.md` / README).
2. **Publishing:** `CHANGELOG`, `RELEASING.md`, bundle methodology in README.
3. **TanStack coexistence:** `docs/tanstack-query-and-table.md` + `/tanstack-bridge` example.

### P1 — Trust & adoption

4. **Smoke tests** (Vitest) + **CI** (typecheck, build, test, `verify:skills`, example typechecks).
5. *(ElectricSQL example pin — optional follow-up; adapter APIs evolve upstream.)*

### P2 — Differentiation

6. **WebRTC / P2P:** Documented as adapter/`ChangeSet` pattern in `docs/advanced.md` (not a core engine).
7. **TanStack Table:** Positioned in coexistence doc; `EntityTable` + column builders remain the library’s optional UI path.

### P3 — Ecosystem

8. Watch **TanStack DB** releases; position as complementary where relevant.

---

## Orchestration and immutable completion (plan iteration)

- **KBD + OpenSpec:** Use [.kbd-orchestrator/phases/phase-v1-npm-framework/plan.md](plan.md) together with **OpenSpec** — bootstrap **`openspec/specs/v1-0.md`** (v1.0 functional completeness) and an umbrella change via `openspec new change`. Implementation and **openspec-verify-change** (or equivalent) must pass before release.
- **Immutable outcome:** The only acceptable finish for this development round is **`@prometheus-ags/prometheus-entity-management@1.0.0` published to npm** for **production** use by waiting projects, with behavior and quality matching the **locked v1.0 spec**.

---

## ASSESSMENT COMPLETE

Structured gap analysis against npm/framework goals; industry context from Tavily research + targeted searches; build verified locally. Execution follows the **KBD plan** + **OpenSpec** umbrella; see [plan.md](plan.md) and [current-waypoint.md](../../current-waypoint.md).
