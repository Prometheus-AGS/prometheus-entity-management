# Assessment — phase-v3-universal-platform-evolution

**Date:** 2026-06-22  
**Assessor:** kbd-assess  
**Source:** Codebase scan (v2.2.0) + `docs/evolution/STRATEGIC-ROADMAP.md` + `docs/evolution/COMPARATIVE-REIVEW-06222026.md`

---

## Summary

PEM v2.2.0 ships a single React-only package (`@prometheus-ags/prometheus-entity-management`)
with a monolithic build output (412 KB ESM, 427 KB CJS uncompressed) and no framework-agnostic
core extraction. The **entity graph layer (`graph.ts`, `engine.ts`, `adapters/`, `transport/`,
`merge/`, `schema-from-sql.ts`, `graph-actions.ts`, `graph-effects.ts`, `graph-query.ts`) is
already free of React imports** — the separation exists implicitly and just needs to be
formalized into packages. The React boundary is clean and narrow: only the files listed in
§3 below import from `'react'`.

The phase goal is a large but **tractable** multi-phase evolution. The biggest risk is scope
creep and ordering. This assessment scores each goal against current state and proposes an
execution sequence.

---

## 1. Current State Inventory

| Layer | Files | React-free? | Notes |
|-------|-------|-------------|-------|
| Entity graph store | `src/graph.ts` | ✅ Yes | Pure Zustand, no React |
| Fetch engine | `src/engine.ts` | ✅ Yes | No React imports |
| Transport registry | `src/transport/` (3 files) | ✅ Yes | `registry.ts`, `rest.ts`, `types.ts` |
| Adapters | `src/adapters/` (10 files) | ⚠️ Mostly | `electricsql.ts` imports React for `useEffect`; all others are clean |
| Merge strategies | `src/merge/` | ✅ Yes | Pluggable, clean |
| Graph actions/effects/query | `src/graph-actions.ts`, `src/graph-effects.ts`, `src/graph-query.ts` | ✅ Yes | Pure TS |
| AI interop | `src/ai-interop.ts` | ✅ Yes | No React |
| Schema / SQL | `src/schema-from-sql.ts`, `src/schema.tsx` | ⚠️ Partial | `schema.tsx` imports React for components |
| Agent / AG-UI bridge | `src/agent/`, `src/extension/` | ✅ Yes | No React |
| CRUD | `src/crud/use-entity-crud.ts` | ❌ React | Uses `useState`, `useRef`, `useCallback` |
| View layer | `src/view/evaluator.ts`, `src/view/incremental.ts`, `src/view/types.ts`, `src/view/prisma-compile.ts` | ✅ Yes | Pure computation |
| View hooks | `src/view/use-entity-view.ts` | ❌ React | Uses `useState`, `useEffect`, etc. |
| Table engine | `src/table/types.ts`, `faceting.ts`, `row-models.ts`, `selection-store.ts` | ⚠️ Partial | `selection-store.ts`, `use-table.ts`, `use-entity-list-as-table.ts` import React |
| UI components | `src/ui/` (20+ files) | ❌ React | All `.tsx` files are fully React |
| Devtools | `src/devtools.ts` | ❌ React | JSX + React hooks |
| Core hooks (2.0) | `src/hooks/use-entities.ts`, `src/hooks/use-entity-query.ts` | ❌ React | React hooks |
| Legacy hooks | `src/hooks.ts` | ❌ React | React hooks |
| GraphQL hooks | `src/graphql/hooks.ts` | ❌ React | React hooks |
| Local-first runtime | `src/local-first-runtime.ts` | ✅ Yes | No React (`useGraphSyncStatus` hooks are in hooks.ts) |

**Key finding:** The implicit core/react split is ~70% already done. The graph store, engine,
transport layer, adapters (minus electricsql), merge, AI interop, view computation, and
local-first runtime are all React-free. Only 12 files in `src/` actually import React.

### Bundle size context
- Current dist: ESM 412 KB, CJS 427 KB (pre-gzip, single entry point)
- All peer deps (react, zustand, immer, @tanstack/react-table) are externalized — the raw JS
  is PEM code only. 412 KB is large but table/ui components account for much of it.
- No sub-path exports (`"./core"`, `"./table"`, etc.) — consumers must import everything.

---

## 2. Goal Gap Analysis

### P0 — Foundation

| Goal | Status | Gap | Effort |
|------|--------|-----|--------|
| Extract `entity-graph-core` (React-free package) | 🔴 Not started | No `packages/` dir, monolithic build, no sub-path exports | High — monorepo restructure + build config changes |
| Bundle reduction + tree-shaking sub-paths | 🔴 Not started | Single entry `src/index.ts`, no `exports` sub-paths in `package.json` | Medium — add `exports` conditions + tsup multi-entry |
| List virtualization (`useVirtualizedEntityList`) | 🟡 Dep present | `@tanstack/react-virtual` is already a `dependency` (v3.13.26) but no hook exposes it | Low — write the hook |
| Parallel queries (`useEntityQueries`) | 🔴 Not started | No `useQueries` equivalent | Low-Medium — thin orchestration layer |
| Column resizing (unblock `getResizeHandler`) | 🔴 Stubbed | `src/table/use-table.ts` `getResizeHandler` is a no-op comment | Medium |
| SSR dehydration/rehydration pipeline | 🟡 Partial | `initialIds`/`initialTotal` seeding exists; no formal `dehydrateGraph()` / `rehydrateGraph()` | Medium |
| Schema Definition Language (SDL) | 🔴 Not started | No `schema.json` / `entity-graph.toml` format defined | Medium — spec + parser |

### P1 — Multi-Framework Web Bindings

| Goal | Status | Gap | Effort |
|------|--------|-----|--------|
| Svelte 5 bindings | 🔴 Not started | No `.svelte` files anywhere | High — new package |
| SolidJS bindings | 🔴 Not started | No Solid code anywhere | High — new package |
| Lit / Web Components | 🔴 Not started | No custom elements | High — new package |
| Alpine.js plugin | 🔴 Not started | No Alpine code | Medium — simpler than full framework |
| HTMX server-side adapter | 🔴 Not started | No HTMX or SSE templates | High — different paradigm (server-side) |

### P1 — Local-First & Peer Sync

| Goal | Status | Gap | Effort |
|------|--------|-----|--------|
| ElectricSQL + PGlite | 🟡 Partial | `src/adapters/electricsql.ts` exists + `electricsql-tenant.ts`; BUT has React import in `electricsql.ts:1` | Low-Medium — extract React hook to separate file |
| Yjs sync provider | 🔴 Not started | No Yjs code | High |
| Automerge sync provider | 🔴 Not started | No Automerge code | High |
| WebRTC P2P provider | 🔴 Not started | No WebRTC code | High |

### P1 — Rust CLI

| Goal | Status | Gap | Effort |
|------|--------|-----|--------|
| `entity-graph-cli` Rust binary | 🔴 Not started | No `Cargo.toml`, no Rust source | Very High — greenfield |
| `generate` subcommand | 🔴 Not started | — | Very High |
| `mcp-server` subcommand | 🔴 Not started | — | High |
| `migrate` subcommand | 🔴 Not started | — | High |

### P2 — Native & Desktop

| Goal | Status | Gap | Effort |
|------|--------|-----|--------|
| Tauri plugin | 🟡 Partial | `src/adapters/tauri-sql-persistence.ts` exists (Tauri SQLite); no full Tauri Rust plugin | Medium — adapter exists, need Rust plugin |
| Flutter / Dart package | 🔴 Not started | No `.dart` files | Very High — greenfield |
| Android Kotlin | 🔴 Not started | No Kotlin files | Very High — greenfield |

### P2 — AI-Native Integration

| Goal | Status | Gap | Effort |
|------|--------|-----|--------|
| AG-UI bridge | 🟢 Present | `src/extension/ag-ui-bridge.ts` + `src/agent/ag-ui-bridge.ts` — AG-UI snapshot/delta ingestion works | Minor expansion only |
| A2A server | 🔴 Not started | No A2A server code | High |
| MCP server (via Rust CLI) | 🔴 Not started | Blocked on Rust CLI | Very High |
| TanStack Query parity features | 🟡 Partial | `placeholderData`, per-query `staleTime`/`gcTime`, `select`, `onSettled` all missing | Medium |

### P3 — A2UI Component Library

| Goal | Status | Gap | Effort |
|------|--------|-----|--------|
| `EntityChat`, `EntityCopilot`, `EntityStream` (React) | 🔴 Not started | No A2UI components exist | Very High — design + build |
| A2UI for Svelte/Flutter | 🔴 Not started | Blocked on P1 framework bindings | Deferred |
| Vue 3 bindings | 🔴 Not started | — | High |

---

## 3. React Import Map (Exact Extraction Boundary)

These 12 `src/` files import React and belong in `entity-graph-react` (or its sub-packages):

```
src/hooks.ts                               ← legacy hooks (useEntity, useEntityList, useEntityMutation)
src/hooks/use-entities.ts                  ← 2.0 hook
src/hooks/use-entity-query.ts              ← 2.0 hook
src/graphql/hooks.ts                       ← GQL hooks
src/crud/use-entity-crud.ts                ← CRUD lifecycle
src/view/use-entity-view.ts                ← view hook
src/table/use-table.ts                     ← table hook
src/table/use-entity-list-as-table.ts      ← table/TanStack bridge
src/table/selection-store.ts               ← uses useSyncExternalStore (React 18+)
src/table/presets/use-table-presets.ts     ← presets hook
src/table/presets/table-storage-provider.tsx ← React provider
src/ui/**/*.tsx                            ← all 20+ UI components
src/devtools.ts                            ← React DevTools panel
src/schema.tsx                             ← schema UI components (MarkdownFieldRenderer etc.)
src/adapters/electricsql.ts (line 1)       ← React hook in adapter — move to separate file
```

Everything else (`graph.ts`, `engine.ts`, `transport/`, `adapters/` (minus electricsql), `merge/`,
`ai-interop.ts`, `graph-actions.ts`, `graph-effects.ts`, `graph-query.ts`, `local-first-runtime.ts`,
`schema-from-sql.ts`, `agent/`, `extension/`, `view/evaluator.ts`, `view/incremental.ts`,
`view/types.ts`, `view/prisma-compile.ts`, `table/types.ts`, `table/faceting.ts`,
`table/row-models.ts`) is **already React-free** and goes into `entity-graph-core` as-is.

---

## 4. Key Dependencies Already Present

| Dependency | Purpose | Phase Goal |
|-----------|---------|------------|
| `@tanstack/react-virtual ^3.13.26` | Virtualization | Unblock `useVirtualizedEntityList` — hook just needs to be written |
| `zustand >=5` | Core store | Sub-path `zustand/vanilla` enables framework-agnostic store in core |
| `immer >=11` | Immutable mutations | Already framework-agnostic |
| `@ag-ui/core >=0.0.30` (optional peer) | AG-UI events | AG-UI bridge already exists; expansion is minor |
| `@tauri-apps/plugin-sql >=2.0.0` (optional peer) | Tauri SQLite | Adapter exists; Rust plugin is the next step |

---

## 5. Execution Order Recommendation

The goals have hard dependencies. The recommended sequence is:

```
P0-A: entity-graph-core extraction
  └─► Enables: ALL framework bindings (Svelte, Solid, Lit, Alpine, HTMX)
  └─► Enables: Flutter/Dart (can mirror the core design)
  └─► Enables: Rust CLI (can model the Rust types on core SDL)

P0-B (parallel with P0-A): SDL design + Rust CLI skeleton
  └─► SDL schema.json spec (no code, just format definition)
  └─► Rust workspace init, clap CLI skeleton, `entity-graph-cli init` command

P0-C (after P0-A): React ecosystem parity + quick wins
  └─► useVirtualizedEntityList (dep already present)
  └─► useEntityQueries
  └─► Column resizing
  └─► dehydrateGraph / rehydrateGraph
  └─► persistGraphToStorage cache persister
  └─► placeholderData, per-query staleTime/gcTime, select, onSettled

P1-A (after P0-A): Svelte 5 + SolidJS bindings
  └─► Both are "subscribe to vanilla Zustand store" problems
  └─► Validate the core API surface before Lit/Alpine

P1-B (after P1-A): Lit / Web Components + Alpine.js
  └─► Web Components are lower risk; Alpine is simplest of all

P1-C (after P0-A): ElectricSQL fix + Yjs sync provider
  └─► electricsql.ts React import is a 5-line fix
  └─► Yjs provider is the highest-value sync addition

P1-D (parallel): HTMX server-side adapter
  └─► Requires Rust/Node server-side context; semi-independent

P2-A (after P0-B): Rust CLI generate + MCP server
  └─► template generation for React first, then other targets
  └─► MCP server subcommand

P2-B (after P0-A + P2-A): Flutter/Dart package
  └─► Mirror entity-graph-core design; use Riverpod

P2-C (after P1-A): Tauri full plugin
  └─► JS side uses Svelte/React adapter; Rust side expands tauri-sql adapter

P3-A (after P2-A): A2UI React components
  └─► EntityChat, EntityCopilot, EntityStream require MCP/A2A tools working
```

---

## 6. Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Core extraction breaks consumers before bindings are ready | High | Maintain `entity-graph-react` re-export shim; keep npm package path unchanged until both packages are stable |
| HTMX adapter requires separate server implementation (Rust/Node) | High | Scope HTMX to a Node.js reference server first; Rust HTMX is a separate deliverable |
| Flutter/Dart package divergence from JS core | Medium | Define SDL schema as the shared contract; auto-generate Dart types from SDL |
| Rust CLI complexity bloat | Medium | Ship minimal `init` + `generate --target react` first; gate other targets on demand |
| Yjs/Automerge CRDT performance at scale | Medium | Benchmark with 10K entities before shipping; provide opt-in, not default |
| A2A/MCP protocol churn | Medium | Abstract behind `ai-interop.ts` interface layer; protocol adapters are swappable |
| ElectricSQL alpha write-sync instability | Low | Clearly document read-only sync status; write sync is opt-in |

---

## 7. Open Questions for Plan Stage

1. **Monorepo structure:** Turborepo + pnpm workspaces vs. simple pnpm workspaces only?
   The comparative review mentions no existing `packages/` dir — should we do a gradual in-repo
   split or a hard monorepo restructure before anything else?
2. **npm scoping strategy:** Should framework bindings be `@prometheus-ags/entity-graph-svelte`
   (matches the roadmap) or a flat name like `@prometheus-ags/svelte`? Naming affects all
   `package.json` changes going forward.
3. **Rust CLI distribution:** Ship as a standalone binary only, or also as an npm wrapper
   (`npx entity-graph-cli`) via a postinstall download shim?
4. **Flutter package naming:** pub.dev requires `entity_graph_flutter` (snake_case Dart style).
   Confirm this is acceptable before publishing.
5. **A2UI priority:** Should `EntityChat` depend on the Rust MCP server, or can it be
   implemented purely client-side with a pluggable tool interface for early iteration?

---

## 8. Assessment Verdict

**Readiness:** ✅ Ready to plan

The codebase has an implicit React/core split that needs to be formalized — this is the
central unlock for the entire phase. The dependency graph is clear. The Rust CLI and
Flutter package are greenfield but well-specified. The phased execution order is
unambiguous. Recommend proceeding directly to `/kbd-plan`.

**Top 3 actions for plan:**
1. Define monorepo structure and monorepo migration path (P0-A)
2. Lock SDL schema format (P0-B, needed before all codegen)
3. Svelte 5 bindings as the first multi-framework proof-of-concept after core extraction (P1-A)
