# Prometheus Entity Management — Strategic Roadmap & Architecture Specification

> **Version:** 1.0.0-draft  
> **Date:** 2026-07-21  
> **Based on:** Comparative Review of `@prometheus-ags/prometheus-entity-management` vs. TanStack Query v5, Apollo Client v3, RTK Query  
> **Status:** Research-complete → Specification Draft

---

## Executive Summary

`@prometheus-ags/prometheus-entity-management` (PEM) is a normalized, globally reactive entity graph store for React built on Zustand. Its core architectural differentiator is the **normalized entity graph** (Layer 1): queries populate a single graph; the graph is the single source of truth; lists store IDs, not entity copies. This solves data siloing and enables cross-view reactivity that query-level caches (TanStack Query, RTK Query, Apollo Client) cannot match.

This document outlines a **multi-phase strategic roadmap** to expand PEM from a React-focused library into a **cross-platform, multi-framework, AI-native, local-first, peer-syncing, code-generating ecosystem**. The roadmap is grounded in:

- **Comparative analysis** identifying PEM's advantages (normalized graph, typed errors, devtools, local-first runtime) and gaps (no multi-framework support, no code generation, no Flutter, no Rust, no AI UI components, smaller ecosystem).
- **Market research** on 2025–2026 state-of-the-art technologies: HTMX 4, Lit/Web Awesome, Alpine.js, Svelte, Solid, AG-UI, A2A protocol, MCP, Flutter+Riverpod, Rust CLI tooling, Tauri 2.x, ElectricSQL/PGlite, CRDTs (Yjs, Automerge), AI codegen (Vercel Elements).
- **Architecture principles** from `AGENTS.md`: strict Component→Hook→Store→External layering, `pnpm` only, ID-only lists, no direct `useGraphStore` in components.

---

## Table of Contents

1. [Phase 0: Foundation — Close Identified Gaps](#phase-0-foundation)
2. [Phase 1: Multi-Framework Web Support](#phase-1-multi-framework-web)
3. [Phase 2: Native & Desktop (Tauri, Flutter, Android)](#phase-2-native-desktop)
4. [Phase 3: AI-Native Integration (AG-UI, A2A, A2UI, MCP)](#phase-3-ai-native)
5. [Phase 4: Local-First & Peer Sync](#phase-4-local-first)
6. [Phase 5: Developer Experience (Rust CLI, Code Generation)](#phase-5-devx)
7. [Phase 6: A2UI Component Library](#phase-6-a2ui)
8. [Architecture Deep-Dives](#architecture-deep-dives)
9. [Appendix: Research Notes](#appendix-research)

---

<a name="phase-0-foundation"></a>
## Phase 0: Foundation — Close All Identified Gaps

*Priority: Immediate. Duration: 2–3 months.*

Before expanding into new frameworks and platforms, PEM must close the gaps identified in the comparative review. These are **table stakes** for competing with TanStack Query, Apollo Client, and RTK Query.

### 0.1 Core Library Improvements

| # | Gap | Priority | Description | Implementation Notes |
|---|-----|----------|-------------|----------------------|
| 0.1.1 | **Bundle Size Reduction** | P0 | Table engine + view layer + CRUD hooks make PEM significantly larger than TanStack Query. Need tree-shaking improvements and optional feature flags. | Use `package.json` `sideEffects` and `exports` conditions. Make `table/`, `view/`, `crud/` optional sub-packages. |
| 0.1.2 | **Virtualization** | P1 | No built-in list virtualization. Competitors have `react-window`/`react-virtualized` integrations or built-in virtual scrolling. | Add `useVirtualizedEntityList` hook using `@tanstack/react-virtual` or native `IntersectionObserver`. |
| 0.1.3 | **Parallel Queries (`useQueries`)** | P1 | No `useQueries` equivalent for firing multiple independent queries concurrently. | Implement `useEntityQueries` that returns an array of `UseEntityResult` objects, deduped through engine. |
| 0.1.4 | **Column Resizing** | P1 | `getResizeHandler` in `useTable` is stubbed/no-op. | Implement actual column resizing with pointer events and state persistence. |
| 0.1.5 | **SSR Dehydration/Rehydration** | P1 | No SSR pipeline. Next.js example has `GraphHydrationProvider` but no formal dehydration protocol. | Standardize `dehydrateGraph()` / `rehydrateGraph()` with streaming support for Next.js 15+ and Remix. |
| 0.1.6 | **PersistQueryClient Equivalent** | P2 | No built-in persistence adapter for web storage (localStorage, IndexedDB). | Create `persistGraphToStorage` adapter with encryption option and schema versioning. |
| 0.1.7 | **useInfiniteQuery Parity** | P2 | `fetchList` has pagination but no dedicated `useInfiniteEntityList` with `fetchNextPage` / `hasNextPage` ergonomics. | Wrap `useEntityList` with infinite-scroll API surface. |
| 0.1.8 | **Test Utilities** | P2 | No `renderWithGraph` or `createMockTransport` testing helpers. | Export test utilities from `@prometheus-ags/prometheus-entity-management/testing`. |
| 0.1.9 | **Documentation & Ecosystem** | P2 | Smaller community than TanStack Query. Need interactive docs, StackBlitz examples, video tutorials. | Adopt VitePress or Docusaurus for docs. Create CodeSandbox/StackBlitz templates. |

### 0.2 React Ecosystem Parity

| # | Feature | Competitor Reference | PEM Status | Action |
|---|---------|---------------------|------------|--------|
| 0.2.1 | `PersistQueryClient` | TanStack Query | Missing | Implement `persistGraphToStorage` with configurable storage backends |
| 0.2.2 | `useIsFetching` / `useIsMutating` | TanStack Query | Partial (engine has ref counts) | Expose reactive hooks for global loading state |
| 0.2.3 | `QueryClient.clear()` | TanStack Query | Partial | Add `clearGraph()` to evict all entities and lists |
| 0.2.4 | Refetch on window focus | TanStack Query | Partial (engine has this) | Ensure it's on by default and configurable per-query |
| 0.2.5 | `placeholderData` | TanStack Query | Missing | Add `placeholderData` to `useEntityQuery` for smoother UX |
| 0.2.6 | `staleTime` / `gcTime` per query | TanStack Query | Partial (global only) | Support per-query `staleTime` and `gcTime` overrides |
| 0.2.7 | `select` option | TanStack Query | Missing | Add `select` to `useEntityQuery` for derived data without re-render |
| 0.2.8 | `useMutation` state machine | TanStack Query | Partial (CRUD hook has this) | Align `useEntityMutation` state machine with TanStack conventions |
| 0.2.9 | Optimistic updates | TanStack Query | Present (PEM is better) | Maintain and document `applyOptimistic` |
| 0.2.10 | DevTools | TanStack Query | Present (PEM is better) | Add time-travel UI, entity graph inspector, list viewer |

---

<a name="phase-1-multi-framework-web"></a>
## Phase 1: Multi-Framework Web Support

*Priority: High. Duration: 4–6 months. Depends on Phase 0.*

PEM is React-only. The entity graph (Layer 1) is framework-agnostic Zustand. The hooks (Layer 2) and UI components (Layer 3) are React-specific. This phase decouples Layer 1 from React and creates framework-specific bindings.

### 1.1 Architecture: Framework-Agnostic Core

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Framework-Specific UI                                  │
│ React │ Svelte │ Solid │ HTMX │ Lit │ Alpine.js                │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Framework-Specific Hooks/Adapters                      │
│ useEntity │ $entityStore │ createEntityStore │ hx-entity │      │
│ useEntityList │ derived() │ createResource() │ _ │ _          │
├─────────────────────────────────────────────────────────────────┤
│ Layer 1: Framework-Agnostic Entity Graph (Core)                 │
│ Zustand (vanilla) → Extract to standalone package              │
│ entities[type][id] · patches[type][id] · lists[queryKey]       │
│ engine.ts · transport registry · crud relations               │
├─────────────────────────────────────────────────────────────────┤
│ Layer 0: Platform Adapters (Shared)                            │
│ REST │ GraphQL │ WebSocket │ Supabase RT │ ElectricSQL │ Yjs   │
└─────────────────────────────────────────────────────────────────┘
```

**Key Decision:** Extract `src/graph.ts`, `src/engine.ts`, `src/transport/`, `src/crud/relations.ts`, and `src/adapters/` into a new package `@prometheus-ags/entity-graph-core`. This package has **zero React dependencies**. It exports a vanilla Zustand store and imperative APIs.

### 1.2 Framework Bindings

#### 1.2.1 React (Existing — Refactor)
- Move React hooks to `@prometheus-ags/entity-graph-react`
- Depend on `entity-graph-core`
- Keep 100% API compatibility (semver major if breaking)

#### 1.2.2 Svelte
- **Research:** Svelte 5 runes (`$state`, `$derived`, `$effect`) are the new standard. Svelte 4 stores are legacy.
- **Binding:** Create `@prometheus-ags/entity-graph-svelte`
- **API Surface:**
  ```svelte
  <script>
    import { createEntityStore } from '@prometheus-ags/entity-graph-svelte'
    const { entity, list, isLoading, error } = createEntityStore('user', { id: '123' })
  </script>
  {#if $isLoading}Loading...{/if}
  {#if $entity}{$entity.name}{/if}
  ```
- **Reactivity:** Use Svelte 5 runes to subscribe to the vanilla Zustand store. Avoid `svelte/store` wrapper if targeting Svelte 5+.

#### 1.2.3 Solid
- **Research:** SolidJS uses fine-grained reactivity with `createSignal`, `createResource`, `createMemo`. `createResource` is the idiomatic async data primitive.
- **Binding:** Create `@prometheus-ags/entity-graph-solid`
- **API Surface:**
  ```tsx
  import { createEntity } from '@prometheus-ags/entity-graph-solid'
  const [entity, { refetch, isLoading, error }] = createEntity('user', () => ({ id: '123' }))
  ```
- **Reactivity:** Solid's `createResource` expects a fetcher that returns a Promise. Bridge to the engine's `fetchEntity` by wrapping the Promise-based API.

#### 1.2.4 HTMX
- **Research:** HTMX 4 (released 2025) introduces `idiomorph` (morphdom swap), Server-Sent Events (SSE) via `hx-ext="sse"`, and `morph` swap strategy. HTMX is **not** a reactive framework; it uses server-rendered HTML and partial page updates.
- **Binding:** Create `@prometheus-ags/entity-graph-htmx`
- **Approach:**
  - PEM's entity graph runs server-side (Node.js/Axum) and renders HTML fragments via templates (Askama/Tera).
  - HTMX fetches fragments via `hx-get` and swaps them using `morph` or `idiomorph`.
  - The server maintains a reactive graph (via `entity-graph-core` in Node.js or Rust) and streams updates via SSE when entities change.
  - **Key insight:** HTMX + PEM = reactive server-rendered fragments. The graph lives on the server; the client receives HTML diffs. This is a different model from client-side SPA but valuable for HTMX users.
- **API Surface:**
  ```html
  <div hx-get="/users/123" hx-trigger="load" hx-swap="morph"></div>
  <div hx-ext="sse" sse-connect="/users/123/stream" sse-swap="user-card"></div>
  ```

#### 1.2.5 Lit / Web Components
- **Research:** Lit 3.x is the standard for Web Components. Shoelace has rebranded to **Web Awesome** (webawesome.io). Web Components are framework-agnostic and work in any HTML environment.
- **Binding:** Create `@prometheus-ags/entity-graph-web-components`
- **Approach:**
  - Build custom elements (`<entity-list>`, `<entity-detail>`, `<entity-form>`) that wrap `entity-graph-core` internally.
  - Use Lit's reactive controllers (`ReactiveControllerHost`) to subscribe to the Zustand store.
  - These components are framework-agnostic and can be used in React, Vue, Angular, Svelte, or vanilla HTML.
- **API Surface:**
  ```html
  <entity-list type="user" filter="active=true" sort="name"></entity-list>
  <entity-detail type="user" id="123"></entity-detail>
  ```

#### 1.2.6 Alpine.js
- **Research:** Alpine.js is a lightweight, declarative framework (jQuery-like) that operates directly on HTML via `x-data`, `x-init`, `x-for`. It uses a reactive proxy under the hood.
- **Binding:** Create `@prometheus-ags/entity-graph-alpine`
- **Approach:**
  - Provide an Alpine.js plugin (`Alpine.plugin(entityGraph)`) that exposes `$entity(type, id)` and `$entityList(type, query)` magics.
  - The plugin initializes a global `entity-graph-core` instance and wires it to Alpine's reactivity system via `Alpine.effect()`.
- **API Surface:**
  ```html
  <div x-data="{ user: $entity('user', '123') }">
    <span x-text="user?.name"></span>
  </div>
  ```

### 1.3 Package Structure

```
packages/
├── entity-graph-core/          # Vanilla Zustand store, engine, transports, adapters
│   ├── src/graph.ts
│   ├── src/engine.ts
│   ├── src/transport/
│   ├── src/adapters/
│   ├── src/crud/relations.ts
│   └── package.json (no React deps)
├── entity-graph-react/         # React hooks, CRUD, Suspense, DevTools
│   ├── src/hooks.ts
│   ├── src/crud/
│   ├── src/ui/
│   └── package.json (depends on core + react)
├── entity-graph-svelte/        # Svelte 5 runes-based bindings
├── entity-graph-solid/         # SolidJS createResource bindings
├── entity-graph-htmx/          # Server-side fragment rendering + SSE
├── entity-graph-web-components/ # Lit-based custom elements
├── entity-graph-alpine/        # Alpine.js plugin
└── entity-graph-vue/           # Vue 3 Composition API (stretch)
```

---

<a name="phase-2-native-desktop"></a>
## Phase 2: Native & Desktop (Tauri, Flutter, Android)

*Priority: High. Duration: 6–9 months. Parallel with Phase 1 after core extraction.*

### 2.1 Tauri (Desktop + Mobile)

**Research:** Tauri 2.0 (stable Oct 2024) supports desktop (macOS, Linux, Windows) and mobile (iOS, Android). It uses a WebView frontend + Rust backend. The `tauri-plugin-sql` supports SQLite, MySQL, PostgreSQL via `sqlx`. Tauri apps are lightweight (<600KB vs Electron's 100MB+).

**Strategy:**
- Tauri apps are web apps in a WebView. The frontend can use any of the Phase 1 web bindings (React, Svelte, etc.).
- The **Rust backend** can host a local `entity-graph-core` equivalent (see Phase 5) for local-first operations.
- Use `tauri-plugin-sql` with SQLite for local persistence, then sync to cloud via ElectricSQL or custom sync.
- **Package:** `@prometheus-ags/entity-graph-tauri` — a Tauri plugin that bridges the Rust backend to the JS frontend.

```rust
// Rust backend (Tauri plugin)
#[tauri::command]
async fn get_entity(state: State<'_, EntityGraphState>, type: &str, id: &str) -> Result<Entity, Error> {
    state.graph.read_entity(type, id).await
}
```

### 2.2 Flutter

**Research:** Flutter is Google's UI toolkit for mobile, web, and desktop. **Riverpod** is the dominant state management solution (replacing Provider). It uses code generation (`build_runner`, `freezed`, `json_serializable`) for type safety and immutability. Dart 3 has records, patterns, and sealed classes.

**Strategy:**
- Create a **Dart package** `entity_graph_flutter` that implements the entity graph in Dart.
- Use **Riverpod** for reactivity: providers that read from the graph, `StateNotifier`/`AsyncNotifier` for async operations.
- Use **Freezed** for immutable entity models with code generation.
- Implement the same transport registry pattern in Dart.
- **Key challenge:** Dart has no Immer equivalent. Use `freezed` `copyWith` for immutable updates, or accept mutability (Dart classes are mutable by default).
- **Package:** `entity_graph_flutter` (pub.dev)

```dart
// Dart/Flutter API
@riverpod
class UserNotifier extends _$UserNotifier {
  @override
  Future<User> build(String id) async {
    final graph = ref.watch(entityGraphProvider);
    return graph.readEntity('user', id);
  }
}

// Widget usage
class UserProfile extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(userNotifierProvider('123'));
    return user.when(
      data: (u) => Text(u.name),
      loading: () => CircularProgressIndicator(),
      error: (e, _) => Text('Error: $e'),
    );
  }
}
```

### 2.3 Android Native (Kotlin)

**Strategy:**
- Create a **Kotlin library** `entity-graph-android` that implements the entity graph in Kotlin.
- Use **Kotlin Coroutines + Flow** for reactivity (Flow is the Kotlin equivalent of RxJS/Observable).
- Use **Room** or **SQLDelight** for local persistence if local-first is needed.
- Package as a Maven Central artifact.
- **API Surface:**
  ```kotlin
  val userFlow = entityGraph.readEntity("user", "123")
  userFlow.collect { user ->
      println(user.name)
  }
  ```

---

<a name="phase-3-ai-native"></a>
## Phase 3: AI-Native Integration (AG-UI, A2A, A2UI, MCP)

*Priority: High. Duration: 4–6 months. Can start after core extraction (Phase 1).*

This is PEM's **most differentiated opportunity**. TanStack Query, Apollo, and RTK Query have no AI-native integration. PEM can be the first entity management library built for AI agents.

### 3.1 AG-UI (Agent-Graphical User Interface)

**Research:** AG-UI is an emerging standard for agent-to-UI communication. It allows AI agents to interact with UI components programmatically. Related: A2A (Agent-to-Agent) protocol from Google (v1.0, 2025) defines how agents communicate; A2UI extends this to user interfaces.

**Strategy:**
- Create `@prometheus-ags/entity-graph-agui` that exposes PEM entities as **observable resources** to AG-UI agents.
- The agent can:
  - Query the graph (`"Find all users with active status"`)
  - Mutate entities (`"Set user 123's status to inactive"`)
  - Subscribe to changes (`"Notify me when user 123's status changes"`)
- Integrate with **CopilotKit** (existing) and **native AG-UI** components.
- **API Surface:**
  ```ts
  // Expose graph to AG-UI agent
  const agui = createAGUIBridge(entityGraph)
  agui.registerTool('query_users', async (filter: string) => {
    return entityGraph.query('user', { filter })
  })
  ```

### 3.2 A2A Protocol Support

**Research:** A2A (Agent-to-Agent) protocol v1.0 (2025, Google) defines a JSON-RPC-like protocol for agent communication. It includes:
- `AgentCard`: Metadata about an agent's capabilities
- `Task`: A unit of work sent to an agent
- `Artifact`: Output produced by an agent
- `Message`: Communication between agents

**Strategy:**
- Implement an **A2A server** in Rust (see Phase 5) that exposes PEM's entity graph as an A2A agent.
- Other agents can send tasks like: `"Upsert user {id: '123', name: 'Alice'}"` or `"Fetch all orders for user 123"`.
- The A2A server translates these tasks into graph operations and returns artifacts.
- **Package:** `entity-graph-a2a` (TypeScript) and `entity-graph-a2a-server` (Rust)

### 3.3 MCP (Model Context Protocol) Server

**Research:** MCP (Model Context Protocol, Anthropic, v2025-06-18) is a standard for exposing resources and tools to LLMs. An MCP server provides:
- `resources`: Read-only data (e.g., `user://{id}`)
- `tools`: Functions the LLM can call (e.g., `update_user`, `create_order`)
- `prompts`: Pre-built prompts for common tasks

**Strategy:**
- The **Rust CLI** (Phase 5) should be able to run as an **MCP server**.
- It exposes the entity graph as MCP resources and tools.
- Any MCP-compatible client (Claude Desktop, Cursor, etc.) can then interact with the graph.
- **This is the canonical integration point:** PEM becomes the data layer for AI agents.

```json
// MCP server configuration
{
  "mcpServers": {
    "entity-graph": {
      "command": "entity-graph-cli",
      "args": ["mcp-server", "--schema", "./schema.json"]
    }
  }
}
```

### 3.4 AI-Generated UI/UX

**Research:** Vercel AI Elements (2025) is a React component library for AI apps built on shadcn/ui. AI SDK 5 supports React, Vue, Svelte. Other tools: v0 (Vercel), Galileo AI, Cursor.

**Strategy:**
- PEM should be **AI-codegen-friendly**: provide clear schema definitions, predictable API surfaces, and code generation templates.
- The **Rust CLI** (Phase 5) generates full-stack apps from a schema, including:
  - Data models (Freezed, TypeScript, Rust structs)
  - API endpoints (REST, GraphQL)
  - UI components (React, Svelte, Flutter)
  - AI tool definitions (MCP, A2A)
- PEM hooks should be **easy for AI to generate correctly**: simple signatures, clear types, minimal boilerplate.

---

<a name="phase-4-local-first"></a>
## Phase 4: Local-First & Peer Sync

*Priority: High. Duration: 6–9 months. Depends on Phase 0 (core stability).*

### 4.1 Local-First Architecture

**Research:** Local-first software keeps data on the device and syncs to the cloud. Key technologies:
- **ElectricSQL**: Sync engine for Postgres → any client. New version (2025) uses HTTP API + shapes. PGlite is a WASM Postgres embed.
- **PGlite**: Embedded PostgreSQL in WASM/browser. Supports `pglite-sync` for Electric sync. Full SQL dialect, pgvector, etc.
- **SQLite**: Ubiquitous, small, works everywhere. `sql.js` for browser, `tauri-plugin-sql` for Tauri, `sqflite` for Flutter.
- **CRDTs**: Conflict-free Replicated Data Types for automatic merge without server coordination.

**Strategy:**
- PEM already has `local-first-runtime.ts` with persistence, hydration, and offline detection. Expand it:
  - **ElectricSQL Integration**: Use Electric's HTTP shape API to sync from Postgres to the entity graph. PEM's `RealtimeManager` can consume Electric change streams.
  - **PGlite Integration**: For web apps, use PGlite as the local database. PEM can sync to/from PGlite via SQL queries, then use Electric to sync PGlite to cloud Postgres.
  - **SQLite Integration**: For mobile (Tauri, Flutter), use SQLite as the local store. Use `sqlx` (Tauri) or `sqflite` (Flutter).
- **Package:** `@prometheus-ags/entity-graph-local-first`

```ts
// ElectricSQL sync adapter
import { electricSync } from '@prometheus-ags/entity-graph-local-first/electric'

const sync = await electricSync({
  shapeUrl: 'http://localhost:3000/v1/shape',
  table: 'users',
  primaryKey: ['id'],
  onChange: (changes) => {
    changes.forEach(change => {
      graph.upsertEntity('user', change.value)
    })
  }
})
```

### 4.2 Peer Sync (WebRTC, CRDTs, Yjs, Automerge)

**Research:**
- **Yjs**: The most mature CRDT library. Supports text, arrays, maps, XML. WebRTC and WebSocket providers. Rust port (`y-crdt` / `yrs`) for native.
- **Automerge**: CRDT with binary format, WASM support, Rust core. v3.0 (2025) has 10x memory reduction. Better for JSON-heavy apps.
- **Loro**: Rust CRDT library, WASM bindings, fast but not production-ready.
- **WebRTC**: Browser-native P2P. Needs signaling server for initial connection. DataChannel for low-latency sync.

**Strategy:**
- Create `@prometheus-ags/entity-graph-sync` with pluggable sync engines.
- Implement **Yjs provider** for web: map PEM's entity graph to a Yjs document structure. Each entity type = Y.Map, each entity = Y.Map entry. Changes flow both ways.
- Implement **Automerge provider** for JSON-heavy apps.
- Implement **WebRTC provider** for direct P2P sync (good for collaborative apps, local networks).
- **Use case:** Collaborative editing of entity data. Multiple users edit the same entity graph concurrently; CRDTs merge conflicts automatically.

```ts
// Yjs sync provider
import { YjsSyncProvider } from '@prometheus-ags/entity-graph-sync/yjs'

const provider = new YjsSyncProvider(graph, {
  room: 'project-123',
  signaling: ['wss://signaling.example.com'],
  password: 'optional-room-password'
})

provider.on('synced', () => console.log('Graph synced with peers'))
```

### 4.3 Sync Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloud Postgres (Source of Truth)              │
│                         ┌─────────────┐                        │
│                         │  ElectricSQL  │                        │
│                         │   Sync Engine │                        │
│                         └──────┬────────┘                        │
│                                │ Shapes (HTTP/SSE)              │
├────────────────────────────────┼────────────────────────────────┤
│              Web App           │      Mobile App                │
│    ┌─────────────────────┐     │   ┌─────────────────────┐     │
│    │  Browser (React)    │     │   │  Flutter (iOS/Android)│     │
│    │  ┌───────────────┐  │     │   │  ┌───────────────┐  │     │
│    │  │  PGlite (WASM)│  │     │   │  │  SQLite (local)│  │     │
│    │  │  + pglite-sync │  │◄────┘   │  │  + sqflite     │  │     │
│    │  └───────────────┘  │         │  └───────────────┘  │     │
│    │  ┌───────────────┐  │         │  ┌───────────────┐  │     │
│    │  │  PEM Graph    │  │◄────────►│  │  PEM Graph    │  │     │
│    │  │  (Zustand)    │  │   Yjs   │  │  (Riverpod)   │  │     │
│    │  └───────────────┘  │  WebRTC  │  └───────────────┘  │     │
│    └─────────────────────┘   or     └─────────────────────┘     │
│                         WebSocket                               │
│                              │                                  │
│                    ┌─────────▼──────────┐                       │
│                    │  Desktop (Tauri)   │                       │
│                    │  ┌──────────────┐  │                        │
│                    │  │ SQLite (local)│  │                        │
│                    │  │ + tauri-plugin-sql│                       │
│                    │  └──────────────┘  │                        │
│                    │  ┌──────────────┐  │                        │
│                    │  │ PEM Graph    │  │                        │
│                    │  │ (Rust/Zustand)│  │                        │
│                    │  └──────────────┘  │                        │
│                    └────────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

<a name="phase-5-devx"></a>
## Phase 5: Developer Experience — Rust CLI & Code Generation

*Priority: High. Duration: 4–6 months. Can start in parallel with Phase 1.*

### 5.1 Rust CLI (`entity-graph-cli`)

**Research:** Rust CLI tools are fast, portable, and can be compiled to static binaries. Askama (type-safe Jinja-like templates) and Tera (Jinja2 for Rust) are mature template engines. `clap` is the standard CLI framework. `axum` is the dominant Rust web framework.

**Strategy:**
- Build a Rust CLI (`entity-graph-cli`) that:
  1. **Scaffolds projects** from a schema file (`entity-graph.toml` or `schema.json`):
     ```bash
     entity-graph-cli generate --schema schema.json --target react --output ./src
     entity-graph-cli generate --schema schema.json --target flutter --output ./lib
     entity-graph-cli generate --schema schema.json --target rust --output ./src
     ```
  2. **Generates code** for all platforms:
     - TypeScript interfaces + Zustand store + React hooks + REST transport
     - Dart models (Freezed) + Riverpod providers + API client
     - Rust structs + Axum handlers + SQLx queries + MCP server scaffold
     - Kotlin data classes + Flow + Room entities
  3. **Runs as an MCP server** (see Phase 3.3):
     ```bash
     entity-graph-cli mcp-server --schema schema.json --port 8080
     ```
  4. **Manages schema migrations** (for local-first SQLite/Postgres).
  5. **Serves as an A2A server** (see Phase 3.2).

**Template Engine:** Use **Tera** for the CLI because it supports dynamic template loading (from filesystem or embedded), filter functions, and Jinja2 syntax. Askama is compile-time only, which is less flexible for user-defined templates.

### 5.2 Code Generation Targets

| Target | Technology | Codegen Output | Notes |
|--------|-----------|----------------|-------|
| React | TypeScript + Zustand | `types.ts`, `store.ts`, `hooks.ts`, `transport.ts`, `ui-components.tsx` | Uses existing PEM patterns |
| Svelte | TypeScript + Svelte 5 | `types.ts`, `store.ts`, `hooks.svelte.ts`, `ui-components.svelte` | Svelte 5 runes |
| Solid | TypeScript + SolidJS | `types.ts`, `store.ts`, `resources.ts`, `ui-components.tsx` | `createResource` |
| HTMX | HTML + Rust/Node | `handlers.rs`, `templates/*.html`, `htmx-extensions.js` | Server-side rendering |
| Lit | TypeScript + Lit | `types.ts`, `elements.ts`, `styles.css.ts` | Web Components |
| Alpine | TypeScript + Alpine | `plugin.ts`, `types.ts`, `directives.ts` | Alpine magics |
| Flutter | Dart + Riverpod | `models.dart`, `providers.dart`, `api_client.dart`, `widgets.dart` | Freezed codegen |
| Android | Kotlin + Coroutines | `models.kt`, `flow.kt`, `repository.kt`, `viewmodels.kt` | Room/SQLDelight |
| Rust | Rust + Axum | `models.rs`, `handlers.rs`, `db.rs`, `mcp.rs` | SQLx, Askama |

### 5.3 Schema Definition Language (SDL)

Define a common schema format that all generators consume:

```json
// schema.json
{
  "version": "1.0",
  "entities": {
    "user": {
      "fields": {
        "id": { "type": "string", "primary": true },
        "name": { "type": "string", "required": true },
        "email": { "type": "string", "required": true },
        "status": { "type": "enum", "values": ["active", "inactive"], "default": "active" },
        "createdAt": { "type": "datetime", "auto": true }
      },
      "relations": {
        "orders": { "type": "hasMany", "target": "order", "foreignKey": "userId" }
      }
    },
    "order": {
      "fields": {
        "id": { "type": "string", "primary": true },
        "userId": { "type": "string", "required": true },
        "total": { "type": "decimal", "required": true },
        "status": { "type": "enum", "values": ["pending", "paid", "shipped"], "default": "pending" }
      },
      "relations": {
        "user": { "type": "belongsTo", "target": "user", "foreignKey": "userId" }
      }
    }
  },
  "config": {
    "localFirst": { "engine": "pglite", "sync": "electric" },
    "ai": { "mcp": true, "a2a": true }
  }
}
```

---

<a name="phase-6-a2ui"></a>
## Phase 6: A2UI Component Library — Native AI-Integrated Components

*Priority: Medium-High. Duration: 6–9 months. Depends on Phase 3 (AI integration).*)

### 6.1 Vision: The "CopilotKit Alternative"

**CopilotKit** is a React-specific library for adding AI copilots to apps. PEM's A2UI library should be:
- **Framework-agnostic**: Works in React, Svelte, Solid, Flutter, and native Android.
- **Entity-graph-aware**: Components understand PEM's entity graph and can render AI-generated forms, tables, and detail views.
- **AI-native**: Every component has hooks for AI agents to inspect, modify, and generate content.

### 6.2 Component Inventory

| Component | Description | AI Integration |
|-----------|-------------|---------------|
| `EntityChat` | Chat interface for querying entities via natural language | Uses MCP/A2A tools to translate queries to graph operations |
| `EntityGenerator` | AI-generated forms, tables, and views from natural language prompts | Generates schema + UI from prompt |
| `EntityCopilot` | Inline copilot for any entity view (suggest edits, summarize, etc.) | Context-aware suggestions based on entity type |
| `EntityStream` | Streaming AI response component with entity-aware markdown | Renders entity references as live links |
| `EntityDiff` | Show differences between entity versions (for AI-suggested changes) | Integrates with time-travel devtools |
| `EntityApproval` | Approve/reject AI-proposed entity mutations | Writes to graph after approval |

### 6.3 Architecture

```
A2UI Component
    ├── Base UI (framework-specific: React/Svelte/Flutter)
    ├── AI Context (MCP tool definitions, entity schema)
    ├── Graph Bindings (read/write to entity-graph-core)
    └── Agent Interface (A2A messages, AG-UI events)
```

**Example:** `EntityChat` in React
```tsx
import { EntityChat } from '@prometheus-ags/a2ui-react'

<EntityChat
  entityTypes={['user', 'order']}
  mcpServer="entity-graph-mcp"
  onEntityLink={(type, id) => navigate(`/${type}/${id}`)}
/>
```

---

<a name="architecture-deep-dives"></a>
## Architecture Deep-Dives

### A. Core Graph Extraction (Phase 1 Prerequisite)

**Problem:** `src/graph.ts` uses `zustand` which is framework-agnostic (vanilla Zustand exists), but some utilities may assume React.

**Solution:**
1. Audit `src/graph.ts` for React-specific imports. Remove any `react` imports.
2. Use `zustand/vanilla` for the core store.
3. Use `zustand/middleware` for Immer, devtools, persist (these are framework-agnostic).
4. Extract `src/engine.ts`, `src/transport/`, `src/adapters/`, `src/crud/relations.ts` into `entity-graph-core`.
5. Keep React-specific bindings (`useSyncExternalStore` usage, `useRef` for callbacks) in `entity-graph-react`.

### B. Transport Registry Pattern (2.0)

The existing `src/transport/registry.ts` is the correct pattern. All framework bindings should consume the same registry:

```ts
// entity-graph-core/src/transport/registry.ts
export function registerEntityTransport<T>(type: EntityType, transport: EntityTransport<T>): void
export function getEntityTransport<T>(type: EntityType): EntityTransport<T>
```

Each framework binding calls `getEntityTransport` and wraps it in framework-specific reactivity.

### C. Realtime Manager Coalescing

The `RealtimeManager` (16ms flush window) is framework-agnostic. Keep it in `entity-graph-core`. All framework bindings benefit from it automatically.

### D. CRDT Integration Strategy

**CRDTs are for peer sync, not primary storage.** The entity graph remains the primary in-memory store. CRDTs are a sync layer:

```
User edits entity → Graph updates (Zustand) → CRDT document updates → Sync to peers
Peer CRDT update → CRDT document merges → Graph updates (Zustand) → UI re-renders
```

Use **Yjs** for web (mature, fast) and **Yrs** (Rust port) for native/desktop. Use **Automerge** for JSON-heavy apps that need v3's memory efficiency.

### E. Local-First Sync Strategy

**ElectricSQL + PGlite** is the recommended stack for web:
- PGlite provides full Postgres in the browser (WASM).
- Electric syncs shapes from cloud Postgres to PGlite.
- PEM reads from PGlite via SQL queries and writes back to PGlite.
- Electric handles the sync, conflict resolution, and subscription.

**SQLite + Tauri** is the recommended stack for desktop:
- `tauri-plugin-sql` with SQLite for local storage.
- Custom sync adapter to cloud (Electric, Supabase, or custom).

---

<a name="appendix-research"></a>
## Appendix: Research Notes

### A. HTMX 4 (2025)
- `idiomorph` extension for morphdom swaps (preserves focus, scroll)
- SSE via `hx-ext="sse"` with `sse-connect` and `sse-swap`
- `morph` swap strategy for preserving state during updates
- Server-side reactive fragments are the model; PEM fits perfectly as the reactive server store.

### B. Lit / Web Awesome (2025)
- Lit 3.x stable, fast rendering, small bundle.
- Shoelace → Web Awesome: webawesome.io. Web components work everywhere.
- Custom elements are ideal for PEM: `<entity-list type="user">` works in any framework.

### C. Alpine.js (2025)
- Lightweight, declarative, jQuery-like.
- Alpine 3.x uses `x-data`, `x-init`, `x-for`.
- Reactive proxy under the hood. Can be bridged to Zustand via `Alpine.effect`.

### D. AG-UI / A2A / A2UI (2025)
- A2A v1.0 from Google: JSON-RPC-like, AgentCard, Task, Artifact, Message.
- AG-UI: Emerging standard for agent-to-UI communication.
- A2UI: Agent-to-User-Interface, extends A2A to UI components.
- MCP v2025-06-18: Resources, tools, prompts. Standard for LLM integrations.

### E. Flutter + Riverpod (2025)
- Riverpod is the dominant Flutter state management.
- Code generation with `build_runner`, `freezed`, `json_serializable`.
- Dart 3 has records, patterns, sealed classes.
- `AsyncNotifier` is the idiomatic async state primitive.

### F. Rust CLI Tooling (2025)
- `clap` for CLI parsing.
- `askama` for compile-time templates (fast, type-safe).
- `tera` for runtime templates (flexible, Jinja2 syntax).
- `axum` for web framework (async, ergonomic).
- `sqlx` for compile-time checked SQL.
- `tokio` for async runtime.

### G. Tauri 2.x (2024–2025)
- Desktop + mobile (iOS, Android).
- WebView frontend + Rust backend.
- `tauri-plugin-sql` for SQLite/MySQL/PostgreSQL via `sqlx`.
- Plugins for biometrics, push notifications, etc.
- Very small bundle size (<600KB vs Electron 100MB+).

### H. ElectricSQL + PGlite (2025)
- ElectricSQL: Sync engine for Postgres → any client. HTTP shape API.
- PGlite: WASM Postgres. `pglite-sync` for Electric sync. `live` queries.
- `syncShapeToTable` for single-table sync. `syncShapesToTables` for multi-table.
- Alpha status for write sync (local writes to cloud). Read sync is stable.

### I. CRDTs: Yjs, Automerge, Loro (2025–2026)
- **Yjs**: Most mature, JS + Rust (Yrs), WebRTC/WebSocket providers, many editor bindings.
- **Automerge**: v3.0 (2025) 10x memory reduction, binary format, WASM, Rust core. Good for JSON.
- **Loro**: Rust, fast, WASM bindings. Not production-ready.
- **Yrs**: Rust port of Yjs, used by Y-Sweet server. Can be embedded in Tauri Flutter.

### J. Vercel AI Elements (2025)
- React components for AI apps: `Conversation`, `Message`, `PromptInput`, `MessageResponse`, `Reasoning`, `Actions`.
- Built on shadcn/ui. Optimized for streaming.
- AI SDK 5 supports React, Vue, Svelte. `AbstractChat` class for custom integrations.
- Can be used as reference for PEM's A2UI library design.

---

## Prioritized Punch List

### P0 — Must Have (Foundation)
- [ ] 0.1.1 Bundle size reduction + tree-shaking
- [ ] 0.1.2 List virtualization
- [ ] 0.1.3 Parallel queries (`useEntityQueries`)
- [ ] 0.1.4 Column resizing implementation
- [ ] 0.1.5 SSR dehydration/rehydration pipeline
- [ ] 1.1 Extract `entity-graph-core` from React
- [ ] 1.2.1 React bindings refactor to `entity-graph-react`
- [ ] 5.1 Define schema definition language (SDL)
- [ ] 5.2 Rust CLI scaffold (`entity-graph-cli init`)

### P1 — High Priority (Competitive Parity + Growth)
- [ ] 0.1.6 Persist graph to storage
- [ ] 0.1.7 Infinite scroll hook
- [ ] 0.1.8 Test utilities (`renderWithGraph`, `createMockTransport`)
- [ ] 0.2.1–0.2.8 TanStack Query parity features
- [ ] 1.2.2 Svelte 5 bindings
- [ ] 1.2.3 SolidJS bindings
- [ ] 1.2.5 Lit / Web Components bindings
- [ ] 3.3 MCP server implementation (Rust CLI)
- [ ] 4.1 ElectricSQL + PGlite integration
- [ ] 4.2 Yjs sync provider for web
- [ ] 5.2 Code generation for React, Svelte, Solid, Flutter

### P2 — Medium Priority (Differentiation)
- [ ] 1.2.4 HTMX server-side bindings
- [ ] 1.2.6 Alpine.js bindings
- [ ] 2.1 Tauri plugin for Rust backend graph
- [ ] 2.2 Flutter + Riverpod package
- [ ] 3.1 AG-UI bridge
- [ ] 3.2 A2A server implementation
- [ ] 4.2 Automerge sync provider
- [ ] 4.2 WebRTC P2P sync provider
- [ ] 5.3 Code generation for Rust, Kotlin, HTMX
- [ ] 6.1 A2UI component library (React)
- [ ] 6.2 A2UI component library (Svelte)

### P3 — Future (Ecosystem)
- [ ] 1.2.x Vue 3 bindings
- [ ] 2.3 Android native (Kotlin) package
- [ ] 6.2 A2UI component library (Flutter)
- [ ] 6.2 A2UI component library (Android)
- [ ] 0.1.9 Comprehensive documentation + interactive examples
- [ ] Community plugins (VSCode extension, Figma plugin, etc.)

---

## Success Metrics

| Metric | Current | 12-Month Target | 24-Month Target |
|--------|---------|-----------------|-----------------|
| Weekly npm downloads | ~1K | ~10K | ~50K |
| Framework bindings | 1 (React) | 4 (React, Svelte, Solid, Lit) | 8+ |
| GitHub stars | ~100 | ~1K | ~5K |
| AI integration coverage | 0% | MCP server, A2A server | Full A2UI library |
| Code generation targets | 0 | 3 (React, Svelte, Flutter) | 8+ |
| Local-first sync | Partial (runtime exists) | Electric + Yjs | Full peer sync |
| Bundle size (React) | ~50KB | ~25KB (tree-shaken) | ~15KB (core only) |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope too large | High | Phase strictly. Ship Phase 0 before starting Phase 2. Use RFC process for each phase. |
| Breaking changes in core | High | Semantic versioning. `entity-graph-core` v1.0 is stable API. Framework bindings follow. |
| CRDT performance issues | Medium | Start with Yjs (proven). Benchmark before adopting Automerge/Loro. |
| ElectricSQL alpha instability | Medium | Abstract sync behind adapter interface. Can swap to Supabase or custom sync. |
| Flutter/Dart ecosystem lock-in | Low | Dart package is optional. Don't force React devs to care about Flutter. |
| AI protocol churn (A2A/MCP) | Medium | Abstract behind `ai-interop.ts` interface. Protocol adapters are swappable. |
| Rust CLI complexity | Medium | Start with simple codegen. Use Tera for templates. Don't build a full compiler. |

---

*Document generated from comprehensive codebase review, competitor analysis, and 2025–2026 technology research.*
*Maintainers: Update this document after each phase completion. Add ADRs to `docs/architecture/` for major decisions.*
