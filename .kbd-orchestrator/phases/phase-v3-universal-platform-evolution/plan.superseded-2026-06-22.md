# Plan — phase-v3-universal-platform-evolution

**Date:** 2026-06-22  
**Backend:** OpenSpec (`openspec/changes/2026-06-22-v3-universal-platform-evolution/`)  
**Umbrella change:** `v3-0-universal-platform-evolution`  
**Total changes:** 16 (1 umbrella + 15 children)

---

## Answered Decisions (from assessment open questions)

1. **Monorepo:** Plain pnpm workspaces only (no Turborepo) for now. Add `packages/` entries to
   `pnpm-workspace.yaml`. Turborepo can be adopted later when CI caching needs tuning.
2. **npm scoping:** `@prometheus-ags/entity-graph-<target>` (e.g., `entity-graph-svelte`).
   Matches the strategic roadmap naming and avoids collision with generic `@prometheus-ags/svelte`.
3. **Rust CLI distribution:** Ship as a static binary **plus** an npm wrapper
   (`@prometheus-ags/entity-graph-cli`) that downloads the platform binary on postinstall.
   This means `npx @prometheus-ags/entity-graph-cli generate ...` works out of the box.
4. **Flutter naming:** `entity_graph_flutter` (Dart snake_case convention). Acceptable.
5. **A2UI architecture:** `EntityChat` / `EntityCopilot` will be client-side first with a
   **pluggable tool interface** (`EntityToolProvider`). MCP server integration is a progressive
   enhancement (peer dep), not a hard requirement.

---

## Change Dependency Graph

```
v3-0-universal-platform-evolution (umbrella)
│
├─ v3-core-extraction            [P0-A] — FIRST: monorepo + framework-agnostic core package
│
├─ v3-sdl-spec                   [P0-B] — parallel with core extraction: SDL schema + TS parser
│
├─ v3-react-parity               [P0-C, after v3-core-extraction]
│   └─ useVirtualizedEntityList, useEntityQueries, column resizing,
│      dehydrateGraph/rehydrateGraph, placeholderData, per-query staleTime/gcTime,
│      select option, onSettled
│
├─ v3-electricsql-fix            [P0-C, after v3-core-extraction] — extract React from electricsql.ts
│
├─ v3-svelte-bindings            [P1-A, after v3-core-extraction]
│
├─ v3-solid-bindings             [P1-A, after v3-core-extraction, parallel with svelte]
│
├─ v3-lit-webcomponents          [P1-B, after v3-svelte-bindings] — Lit 3 custom elements
│
├─ v3-alpine-plugin              [P1-B, after v3-core-extraction] — Alpine.js plugin
│
├─ v3-htmx-server-adapter        [P1-D, after v3-sdl-spec] — Node.js SSE fragment server
│
├─ v3-yjs-sync-provider          [P1-C, after v3-core-extraction] — Yjs WebRTC + WS providers
│
├─ v3-rust-cli                   [P2-A, after v3-sdl-spec] — Rust CLI binary + npm wrapper
│
├─ v3-mcp-server                 [P2-A, after v3-rust-cli] — MCP server subcommand
│
├─ v3-tauri-plugin               [P2-C, after v3-core-extraction + v3-rust-cli]
│
├─ v3-flutter-package            [P2-B, after v3-core-extraction + v3-sdl-spec]
│
├─ v3-a2ui-react                 [P3-A, after v3-mcp-server + v3-svelte-bindings]
│
└─ v3-a2a-server                 [P2-A, after v3-rust-cli] — A2A v1.0 protocol server
```

---

## Ordered Change List

### Wave 1 — Foundation (can start immediately)

| # | Change ID | Description | Blocking |
|---|-----------|-------------|---------|
| 1 | `v3-core-extraction` | Extract `entity-graph-core` (React-free) + `entity-graph-react` packages; monorepo setup | Svelte, Solid, Lit, Alpine, HTMX, Flutter |
| 2 | `v3-sdl-spec` | Define SDL (`schema.json`) + TypeScript parser/validator | Rust CLI, codegen, HTMX, Flutter |
| 3 | `v3-electricsql-fix` | Extract React hook from `electricsql.ts` into `electricsql-react.ts` | Core cleanliness |

### Wave 2 — React Parity + First Framework (after Wave 1)

| # | Change ID | Description | Blocking |
|---|-----------|-------------|---------|
| 4 | `v3-react-parity` | `useVirtualizedEntityList`, `useEntityQueries`, column resizing, SSR dehydration, `placeholderData`, `select`, `onSettled` | — |
| 5 | `v3-svelte-bindings` | `@prometheus-ags/entity-graph-svelte` (Svelte 5 runes) | Lit, A2UI Svelte |
| 6 | `v3-solid-bindings` | `@prometheus-ags/entity-graph-solid` (createResource) | — |
| 7 | `v3-yjs-sync-provider` | `@prometheus-ags/entity-graph-sync/yjs` WebRTC + WebSocket | Automerge, WebRTC |

### Wave 3 — Web Breadth + Rust Foundation (after Wave 2)

| # | Change ID | Description | Blocking |
|---|-----------|-------------|---------|
| 8 | `v3-lit-webcomponents` | `@prometheus-ags/entity-graph-web-components` Lit 3 custom elements | — |
| 9 | `v3-alpine-plugin` | `@prometheus-ags/entity-graph-alpine` Alpine.js plugin | — |
| 10 | `v3-htmx-server-adapter` | `@prometheus-ags/entity-graph-htmx` Node.js SSE reference server | — |
| 11 | `v3-rust-cli` | `entity-graph-cli` Rust binary + npm wrapper; `generate --target react` first | MCP, A2A, Flutter codegen |

### Wave 4 — Native + AI + Sync (after Wave 3)

| # | Change ID | Description | Blocking |
|---|-----------|-------------|---------|
| 12 | `v3-mcp-server` | `entity-graph-cli mcp-server` subcommand (resources + tools) | A2UI |
| 13 | `v3-a2a-server` | A2A v1.0 protocol server (TypeScript + Rust embed) | — |
| 14 | `v3-tauri-plugin` | `@prometheus-ags/entity-graph-tauri` Tauri Rust plugin | — |
| 15 | `v3-flutter-package` | `entity_graph_flutter` pub.dev Dart/Riverpod package | A2UI Flutter |

### Wave 5 — A2UI Library (after Wave 4)

| # | Change ID | Description | Blocking |
|---|-----------|-------------|---------|
| 16 | `v3-a2ui-react` | `@prometheus-ags/a2ui-react`: `EntityChat`, `EntityCopilot`, `EntityStream`, `EntityDiff`, `EntityApproval` | A2UI Svelte/Flutter (future) |

---

## Recommended Agent Per Change

| Change | Recommended Agent |
|--------|------------------|
| `v3-core-extraction` | `architect` then `code-architect` — monorepo layout decision first |
| `v3-sdl-spec` | `architect` — pure schema design, no code |
| `v3-electricsql-fix` | `build-error-resolver` or direct edit — surgical 5-line fix |
| `v3-react-parity` | `code-architect` — multiple hooks, one coherent package surface |
| `v3-svelte-bindings` | `code-architect` + `tdd-guide` — greenfield package with tests |
| `v3-solid-bindings` | `code-architect` + `tdd-guide` |
| `v3-yjs-sync-provider` | `architect` then `code-architect` — CRDT design requires care |
| `v3-lit-webcomponents` | `code-architect` + `a11y-architect` (web components + accessibility) |
| `v3-alpine-plugin` | `code-architect` |
| `v3-htmx-server-adapter` | `code-architect` — server-side, different from all others |
| `v3-rust-cli` | `rust-reviewer` + `code-architect` — greenfield Rust |
| `v3-mcp-server` | `ai-engineer` + `code-architect` — MCP protocol expert needed |
| `v3-a2a-server` | `ai-engineer` + `code-architect` |
| `v3-tauri-plugin` | `code-architect` + `rust-reviewer` |
| `v3-flutter-package` | `code-architect` — Dart/Flutter greenfield |
| `v3-a2ui-react` | `code-architect` + `ui-ux-designer` + `ai-engineer` |

---

## OpenSpec Change Locations

All changes live under:
`openspec/changes/2026-06-22-v3-universal-platform-evolution/<change-id>/`

- `proposal.md` — what + why + non-goals + success criteria
- `tasks.md` — ordered, checkboxed implementation tasks

---

## Version Targets

| Wave | Target npm version | Notes |
|------|--------------------|-------|
| Wave 1–2 | v3.0.0 | Core extraction is a breaking monorepo restructure — semver major |
| Wave 3 | v3.1.0 | Additional web framework packages |
| Wave 4 | v3.2.0 | Native + CLI + sync |
| Wave 5 | v3.3.0 | A2UI library |
