# Goals — phase-v3-universal-platform-evolution

Evolve `@prometheus-ags/prometheus-entity-management` from a React-only entity graph into
a **cross-platform, multi-framework, AI-native, local-first, peer-syncing, code-generating
ecosystem** — the perfect agentic UI/UX framework for modern application architectures.

Source research: `docs/evolution/STRATEGIC-ROADMAP.md` + `docs/evolution/COMPARATIVE-REIVEW-06222026.md`

---

## P0 — Foundation (must land first)

- Extract `entity-graph-core` (framework-agnostic Zustand store, engine, transports, adapters,
  CRUD relations) with zero React dependencies; migrate existing React bindings to
  `entity-graph-react` as a peer consumer
- Bundle size reduction + tree-shaking (`sideEffects: false`, optional sub-packages for
  `table/`, `view/`, `crud/`)
- List virtualization via `@tanstack/react-virtual` (`useVirtualizedEntityList`)
- Parallel queries hook (`useEntityQueries`)
- Column resizing implementation (unblock stubbed `getResizeHandler`)
- SSR dehydration/rehydration pipeline (`dehydrateGraph()` / `rehydrateGraph()`) compatible
  with Next.js 15+ App Router streaming
- Define Schema Definition Language (SDL) — `schema.json` / `entity-graph.toml` consumed by
  all code generators

## P1 — Multi-Framework Web Bindings

- **Svelte 5** (`entity-graph-svelte`): runes-based (`$state`, `$derived`, `$effect`)
  reactive wrappers around the vanilla Zustand store
- **SolidJS** (`entity-graph-solid`): `createResource`-based bindings with fine-grained
  reactivity
- **Lit / Web Components** (`entity-graph-web-components`): `<entity-list>`, `<entity-detail>`,
  `<entity-form>` custom elements using Lit 3 reactive controllers; framework-agnostic drop-ins
- **Alpine.js** (`entity-graph-alpine`): `Alpine.plugin(entityGraph)` exposing `$entity` and
  `$entityList` Alpine magics
- **HTMX** (`entity-graph-htmx`): server-side reactive fragment adapter — graph on the server
  (Node.js or Rust/Axum), SSE change streams, `hx-ext="sse"` + `idiomorph` morphdom swap

## P1 — Local-First & Peer Sync

- **ElectricSQL + PGlite** integration: `electricSync` adapter consuming Electric HTTP shape
  API; PGlite WASM Postgres for full local SQL in browser
- **Yjs sync provider** for web (`@prometheus-ags/entity-graph-sync/yjs`): map entity graph
  to Y.Map structure; WebRTC + WebSocket providers for P2P and server-mediated sync
- **Automerge sync provider**: JSON-heavy app alternative to Yjs
- **WebRTC P2P provider**: direct browser-to-browser sync with signaling server

## P1 — Rust CLI & Code Generation

- `entity-graph-cli` Rust binary using `clap` + `tera` runtime templates:
  - `generate` subcommand targeting React, Svelte, Solid, Flutter, Rust, Kotlin, HTMX, Lit,
    Alpine
  - `mcp-server` subcommand — exposes entity graph as MCP resources + tools (compatible with
    Claude Desktop, Cursor, etc.)
  - `migrate` subcommand for local-first SQLite/Postgres schema migrations
- Ship as static binary + npm postinstall shim (`@prometheus-ags/entity-graph-cli`)

## P2 — Native & Desktop

- **Tauri** (`@prometheus-ags/entity-graph-tauri`): Tauri plugin bridging Rust backend
  entity graph to JS WebView frontend; `tauri-plugin-sql` SQLite for local-first Tauri apps
- **Flutter / Dart** (`entity_graph_flutter` pub.dev package): entity graph in Dart,
  Riverpod providers, Freezed immutable models, same transport registry pattern as JS
- **Android Kotlin** (`entity-graph-android`): Kotlin Coroutines + Flow, Room/SQLDelight
  local persistence

## P2 — AI-Native Integration

- **AG-UI bridge** (`@prometheus-ags/entity-graph-agui`): expose graph entities as observable
  AG-UI resources; agent can query, mutate, and subscribe to graph changes
- **A2A server** (TypeScript + Rust): expose graph as A2A agent (AgentCard, Task, Artifact)
  per A2A v1.0 protocol; Rust implementation can run standalone or embed in `entity-graph-cli`
- **MCP server** (via Rust CLI `mcp-server` subcommand): resources (`user://{id}`), tools
  (`update_user`, `create_order`), prompts for common entity operations
- TanStack Query parity features: `placeholderData`, per-query `staleTime`/`gcTime`,
  `select` option, `onSettled` mutation lifecycle, `persistGraphToStorage` cache persister

## P3 — A2UI Component Library

- `@prometheus-ags/a2ui-react` + `a2ui-svelte` + `a2ui-flutter`: framework-agnostic AI-native
  component library replacing CopilotKit; components include `EntityChat`, `EntityGenerator`,
  `EntityCopilot`, `EntityStream`, `EntityDiff`, `EntityApproval`
- Every component wired to MCP/A2A tools + entity graph; leverages AG-UI, A2A, and accepted
  standards so there is no ecosystem lock-in
- Vue 3 bindings (`entity-graph-vue`)
- Android native Kotlin package (Maven Central)
- Comprehensive VitePress documentation + interactive StackBlitz/CodeSandbox examples

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Framework bindings | React ✓ + Svelte + Solid + Lit + Alpine + HTMX = 6 |
| Code generation targets | React, Svelte, Solid, Flutter, Rust, Kotlin, HTMX |
| MCP server | Rust CLI `mcp-server` subcommand functional |
| Local-first | ElectricSQL + PGlite (web), SQLite (Tauri + Flutter) |
| Peer sync | Yjs WebRTC + WebSocket providers |
| Flutter package | `entity_graph_flutter` published to pub.dev |
| A2UI library | `EntityChat`, `EntityCopilot`, `EntityStream` shipped in React |
| Bundle (core only) | < 15 KB gzip |

## References

- `docs/evolution/STRATEGIC-ROADMAP.md` — architecture spec and phase definitions
- `docs/evolution/COMPARATIVE-REIVEW-06222026.md` — competitor gap analysis
- Prior phase: `phase-v2-realtime-fabric-parity` (v2.2.0, released 2026-06-21)
