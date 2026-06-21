# Assessment — phase-v2-realtime-fabric-parity

**Project:** `@prometheus-ags/prometheus-entity-management` v2.1.0
**Phase goal:** Survey every comparable framework (TanStack ecosystem + the wider reactive/sync/local-first/agentic landscape), establish exactly where this library stands against each, and define the gap to becoming the best-in-class, ecosystem-agnostic global entity-state layer — with first-class realtime (Flint Realtime Fabric, SurrealDB live, Supabase), local-first (PGlite/SQLite), CRDT/WebRTC sync, and proper interactive devtools.
**Date:** 2026-06-21
**Assessed by:** kbd-assess (Claude)
**KBD prior state:** `idle` — last closed phase `phase-v1-npm-framework` (v1.0 npm release track). This assessment opens the v2 strategic track.

---

## 1. What we are (current architecture, verified from source)

This is **not** a TanStack Query competitor in the narrow sense — it is a **normalized, globally-reactive entity graph store** that sits where Apollo/Relay/urql's normalized cache sits, but transport-agnostic (REST, GraphQL, WS, Supabase, ElectricSQL, SurrealDB, Convex). 19,850 LOC across `src/`, 19 test files.

### Layer 1 — Entity Graph (`src/graph.ts`, 426 lines)
Zustand + Immer store with the canonical separation that is the whole point of the library:
- `entities[type][id]` — server truth (upsert/replace/remove only)
- `patches[type][id]` — UI-only overlay merged at read time
- `lists[queryKey]` — **ordered IDs only**, never row copies → cross-view reactivity
- `entityStates[type:id]` — per-entity fetch lifecycle
- `syncMetadata[type:id]` — `$synced / $origin / $updatedAt` provenance (server/client/optimistic)
- Snapshot cache to satisfy React 19 `useSyncExternalStore` identity stability

This is genuinely strong and architecturally clean. The ID-not-data invariant is correctly enforced everywhere.

### Layer 2 — Engine + Hooks
- `engine.ts` — in-flight dedup (process-global promise map), subscriber ref-counting, SWR staleness, GC. Solid.
- 2.0 **Transport Registry** (`transport/registry.ts`) — one transport per entity type, registered at boot. This is the right modern design (kills the per-call-site `remoteFetch` drift of 1.x).
- Typed errors: `TerminalError` (4xx, no retry) / `TransientError` (5xx/network, backoff). `instanceof`-checkable. Good.
- Hooks: thin `useEntities`, rich `useEntityQuery`, plus legacy `useEntity/useEntityList`, GraphQL hooks, CRUD hook.

### Layer 3 — View / CRUD / UI
- View layer: transport-agnostic `FilterSpec` compiling to REST params / SQL / GraphQL / Prisma where / local JS predicates. `local | remote | hybrid` completeness modes. Binary sorted insertion for realtime. **This is a differentiator nobody else has packaged this cleanly.**
- CRUD: edit-buffer isolation, cascade invalidation via relation registry.
- A whole pure (TanStack-free) table/gallery/list UI engine + preset system. Large surface.

### Realtime + local-first + sync (the v1.3 additions, already shipped)
- `RealtimeManager` with 16ms coalescing flush window.
- Adapters: WebSocket, Supabase Realtime, Convex, GraphQL-WS, **SurrealDB LIVE SELECT** (`surreal-live.ts` — per-channel reconnect/replay state machine, checkpoint store), ElectricSQL, tenant-scoped Electric.
- Local-first runtime: `startLocalFirstGraph`, hydrate/persist, `replayActionWithRetry` with poison-action handling, PGlite persistence adapter, `registerEntityFromSql`.
- AI-interop: `createGraphTool` / `createSchemaGraphTool` / `exportGraphSnapshot` — graph exposed as an LLM tool surface. **This is forward-looking and rare.**

### DevTools (already real, not vaporware)
- `useGraphDevTools` hook — counts, lists, patches, stale, in-flight, subscriber ref-counts.
- `devtools-event-bus.ts` — ring buffer (500), microtask burst coalescing, replay-on-subscribe, multi-store registry.
- `EntityExplorer` panel — portal/inline, tabs: Entities / Patches / Events / Performance (ops/sec + latency).
- **Chrome MV3 extension** scaffold feeding the panel over port messaging.

---

## 2. Competitive landscape (researched 2026-06)

| Framework | Niche it owns | What it does that we don't | What we do that it doesn't |
|---|---|---|---|
| **TanStack Query** | Async server-state, per-query cache | Massive adoption, mature | Normalized cross-view graph; TanStack Query has no normalization (data silos by design — our raison d'être) |
| **TanStack DB** (→1.0 Dec 2025) | Client-first store w/ **differential dataflow** (d2ts) live queries; normalized collections; sub-ms incremental query updates | **Incremental query recomputation** — updating 1 row in a sorted 100k collection ≈ 0.7ms; collection/live-query model; optimistic-by-default | Transport-agnostic registry; SurrealDB/Electric/Convex adapters; AI tool surface; richer realtime adapter set; cross-ecosystem (not TanStack-locked) |
| **Apollo / Relay / urql graphcache** | GraphQL normalized cache | Battle-tested normalization, schema-aware cache | GraphQL-optional; works with REST/WS/SQL; local-first; realtime adapters; devtools beyond GraphQL |
| **Zero (Rocicorp)** | Most complete sync engine; query-driven server sync | Real sync protocol + server; slickest collaborative sync in 2026 | No server/protocol lock-in; pluggable into existing backends incl. Flint |
| **LiveStore** | Event-sourced SQLite-on-client w/ deterministic mutation log | Event-sourcing + reactive SQLite | We have action log + replay but not full event-sourcing semantics |
| **ElectricSQL / PowerSync** | Postgres→client sync | Production Postgres sync, shapes | We *consume* Electric as an adapter (already) |
| **Convex / InstantDB / Jazz** | Hosted reactive DB / batteries-included local-first | Turnkey backend, GA reliability | Backend-agnostic; no vendor lock |
| **AG-UI (CopilotKit)** | Agent↔UI protocol: state snapshots + JSON-Patch deltas over SSE/protobuf; bidirectional shared agent state | **Standardized agent-state sync protocol** adopted by Google/LangChain/AWS/MS/Mastra/PydanticAI | We have a graph + AI tool export, but **no AG-UI / A2A / A2UI ingestion** |
| **Redux DevTools** | Time-travel debugging gold standard | **Time-travel, action diff, import/export state, pin-to-substate** | Live entity/graph-shaped inspector, subscriber ref-counts, realtime event stream, multi-store, Chrome ext |

**Verdict:** Architecturally we are competitive-to-leading on *normalization + transport-agnosticism + realtime adapter breadth + AI surface*. We are **behind** on three axes that the 2026 frontier has moved to: (1) **incremental/differential query evaluation**, (2) **a real sync protocol / CRDT merge story**, and (3) **time-travel-grade devtools**. And we have a **named strategic gap**: deep integration with Flint Realtime Fabric and the agent protocols (AG-UI/A2A/A2UI) it carries.

---

## 3. Gap analysis — where we are vs. "absolute best"

### GAP-1 — Flint Realtime Fabric integration **[CRITICAL — named priority]**
- **Now:** No `frf-*` adapter. Flint's own plan (`sdks/entity-management/`) expects a *thin `RealtimeAdapter` on the TS SDK* — but the TS SDK (`frf-wasm`/Connect-ES) is itself pre-freeze (Flint is at Phase 0). Our `RealtimeAdapter`/`SyncAdapter` contracts exist and SurrealDB/Supabase adapters prove the shape works.
- **Gap:** (a) a `createFlintAdapter` consuming the Flint TS SDK once proto-v1 freezes; (b) handling Flint's CRDT sync (Loro/automerge — undecided in Flint) and WebRTC signaling envelopes; (c) Tauri (desktop) + web parity — our adapters assume browser/WS; need transport abstraction that works over Tauri IPC and Connect-ES WS mux.
- **Coupling risk:** Flint proto is **not frozen**. We must design the adapter against our stable `RealtimeAdapter` contract and a small Flint-envelope shim, not against unfrozen proto types.

### GAP-2 — CRDT / conflict resolution **[HIGH]**
- **Now:** `syncMetadata.origin` (server/client/optimistic) + last-write-wins implied by upsert merge + offline action replay with retry/poison. No actual CRDT merge.
- **Gap:** No Loro/Automerge/Yjs integration. Concurrent edits resolve by last-writer. For Flint (CRDT-backed) and real collaborative/agentic multi-writer scenarios this is insufficient. Need a pluggable `MergeStrategy` seam at `upsertEntity` and a CRDT adapter.

### GAP-3 — Incremental / differential query evaluation **[HIGH]**
- **Now:** `view/evaluator.ts` re-filters/re-sorts; binary insertion only on realtime single-entity inserts. A list re-derivation is O(n) on change.
- **Gap:** TanStack DB's d2ts gives sub-ms incremental query results at 100k rows. For large agentic dashboards our re-derivation will be the bottleneck. Need either incremental view maintenance or a documented scale ceiling + virtualization story (we already ship `@tanstack/react-virtual`).

### GAP-4 — Agent protocol ingestion (AG-UI / A2A / A2UI) **[HIGH — named priority]**
- **Now:** Graph→LLM export (`createGraphTool`, `exportGraphSnapshot`). One direction only.
- **Gap:** No ingestion of AG-UI state snapshots / JSON-Patch deltas into the graph. The killer feature for "non-trivial agentic applications" is: **agent emits AG-UI state delta → lands in the entity graph → every view updates**. We have the graph and the patch layer (`patchEntity` is literally JSON-Patch-shaped); we need an `applyAgUiDelta(graph, event)` bridge and an `frf-agentproto`-aligned `ContentBlock`/A2UI mapping. This is a *low-effort, high-differentiation* win because the substrate already exists.

### GAP-5 — Time-travel & richer DevTools **[MEDIUM]**
- **Now:** Live inspector (entities/patches/events/perf), event ring buffer, Chrome ext, subscriber counts. Genuinely good for live observation.
- **Gap vs Redux DevTools / TanStack DevTools:** no **time-travel** (jump to prior graph state), no **action/diff timeline** with state-before/after, no **import/export snapshot** from the panel, no **pin-to-entity** watch, no relation/graph **visualization** (we store a graph but never *draw* it). No unified docked "dev window" comparable to TanStack DevTools. The action log (`graph-actions.ts`) + snapshot export are the raw materials for time-travel — they're not yet wired into the panel.

### GAP-6 — SQLite (non-PGlite) / on-device parity **[MEDIUM]**
- **Now:** PGlite persistence adapter; Electric. Flint uses **redb** on-device (Rust) and SQLite is named in the request.
- **Gap:** No `better-sqlite3` / `op-sqlite` / `expo-sqlite` / Tauri-SQL persistence adapter. For Tauri desktop the natural local store is SQLite or redb-over-IPC, not PGlite-wasm. Need a `GraphPersistenceAdapter` for SQLite and a Tauri-IPC variant.

### GAP-7 — Strict layering enforcement (Components→Hooks→Stores) **[LOW-MEDIUM]**
- **Now:** Convention documented in CLAUDE.md; hooks are the public read path; `useGraphStore` is exported (escape hatch).
- **Gap:** No lint rule / ESLint plugin enforcing "no `useGraphStore` in component files." For "larger applications" the user wants this to be *enforced*, not just documented. Cheap to add as a shippable `eslint-plugin-prometheus-entity` with one rule.

### GAP-8 — WebRTC / P2P **[LOW for now]**
- **Now:** None. Flint carries WebRTC signaling (str0m/LiveKit) at the fabric layer.
- **Gap:** No direct P2P entity sync. Likely correct to **defer** — let Flint own WebRTC and surface it through the Flint adapter rather than re-implementing in the entity layer. Flag as "owned by fabric, consumed via adapter."

---

## 4. Strengths to protect (do not regress)
1. ID-not-data normalization invariant + cross-view reactivity — the core moat.
2. Transport-agnosticism via the 2.0 registry — the thing TanStack DB / Apollo can't claim.
3. Breadth of realtime adapters already shipped (Supabase, SurrealDB live, Electric, Convex, WS, GraphQL-WS).
4. AI tool surface (`createGraphTool`) — ahead of the field.
5. `syncMetadata` provenance + offline replay+poison handling — real local-first plumbing.
6. Already-shipped live DevTools + Chrome extension — a head start most libraries lack.

## 5. Open questions for analyze/plan
- **Q1 (sequencing):** Is Flint proto-v1 freeze a hard dependency for GAP-1, or do we build against a stable shim now? (Recommend: shim now.)
- **Q2 (CRDT engine):** Mirror Flint's eventual Loro-vs-Automerge decision, or stay engine-agnostic via a `MergeStrategy` port? (Recommend: port + ship one reference impl.)
- **Q3 (incremental queries):** Build differential view maintenance ourselves, adopt d2ts, or document a scale ceiling + lean on virtualization for v2.0? (Recommend: ceiling + virtualization for v2.0, differential as v2.x research spike.)
- **Q4 (AG-UI scope):** Full AG-UI client, or just the state-snapshot/JSON-Patch ingestion bridge into the graph? (Recommend: ingestion bridge first — highest leverage, smallest surface.)
- **Q5 (devtools):** Extend the existing EntityExplorer to time-travel, or align to the new unified TanStack DevTools host? (Recommend: extend ours; add graph-visualization tab.)

## 6. Recommended phase shape (for plan stage)
1. **Track A — Agent + Fabric (the named, highest-leverage work):** AG-UI/A2UI ingestion bridge (GAP-4) → Flint adapter against stable contract (GAP-1) → CRDT `MergeStrategy` port (GAP-2).
2. **Track B — Local-first parity:** SQLite + Tauri-IPC persistence adapters (GAP-6).
3. **Track C — DevTools to best-in-class:** time-travel + diff timeline + graph-visualization + snapshot import/export (GAP-5).
4. **Track D — Scale + discipline:** incremental-query spike or documented ceiling (GAP-3); ESLint layering plugin (GAP-7).
5. **Defer:** direct WebRTC/P2P (GAP-8) — owned by Flint.

---

### Stage handoff
Key gaps: no Flint adapter, no CRDT merge, no AG-UI ingestion (despite patch layer being JSON-Patch-shaped — low-effort win), no time-travel devtools, no SQLite/Tauri persistence, no incremental query eval, layering unenforced. Core normalization + transport-registry + realtime-adapter breadth + AI surface are competitive-to-leading. Biggest leverage: AG-UI ingestion bridge (substrate already exists) and a Flint adapter built against the stable `RealtimeAdapter` contract + envelope shim (NOT unfrozen proto). Open questions Q1–Q5 above need decisions before plan.
