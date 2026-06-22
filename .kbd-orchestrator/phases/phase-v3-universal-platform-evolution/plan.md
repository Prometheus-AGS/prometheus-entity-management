PLAN: phase-v3-universal-platform-evolution
Project: @prometheus-ags/prometheus-entity-management
Date: 2026-06-22
Model gate: Opus 4.8 (frontier) — kbd-plan frontier requirement satisfied
Backend: OpenSpec (openspec/changes/v3-0-universal-platform-evolution/ umbrella + children)
Inputs: assessment.md (React-import map + goal-gap matrix), docs/evolution/STRATEGIC-ROADMAP.md,
        docs/evolution/COMPARATIVE-REIVEW-06222026.md, fresh 2026 web research (sources at end)
Supersedes: plan.superseded-2026-06-22.md (prior plan — kept for diff/audit)
Changes to implement: 18 (1 umbrella + 17 children) across 5 waves

═══════════════════════════════════════════════════════════════════════════
WHY THIS PLAN DIFFERS FROM THE SUPERSEDED ONE (research-driven corrections)
═══════════════════════════════════════════════════════════════════════════
The prior plan was directionally right (core extraction first → bindings → CLI →
AI → A2UI). Fresh research changed five load-bearing decisions, and the 2.2.0
release added assets the prior plan ignored:

1. MONOREPO TOOLING — prior: "plain pnpm workspaces, no Turborepo." Corrected:
   2026 consensus for publishing many packages is **pnpm + Turborepo + Changesets
   + tsup**. Turborepo's task graph + caching is worth it the moment you publish
   >3 packages (we'll publish ~12). Changesets gives per-package semver + changelogs.
   [src: turbo.build/repo/docs/guides/publishing-libraries; viadreams monorepo-tools-2026]

2. MCP — prior: "build an MCP server" (unspecified). Corrected: use the OFFICIAL
   **`rmcp` Rust SDK** (v0.16, 4.7M downloads) rather than hand-rolling JSON-RPC;
   support **Streamable HTTP** transport (now standard, SEP-2243 headers) AND stdio.
   A new MCP spec lands 2026-07-28 — pin to 2025-06-18 spec, design for the RC.
   [src: github.com/modelcontextprotocol/rust-sdk; blog.modelcontextprotocol.io 2026-07-28 RC]
   (Cross-check: project's own `mcp-server` skill = Axum+JSON-RPC dual-transport;
    rmcp can sit under that same shape.)

3. FLUTTER — prior: "Riverpod" (generic). Corrected: **Riverpod 3.0** (Sept 2025)
   made `@riverpod` codegen + `Notifier`/`AsyncNotifier` the standard and demoted
   `StateNotifier`/`StateProvider` to legacy. Target Riverpod 3 codegen + Freezed.
   [src: riverpod.dev/docs/whats_new; codewithandrea async-notifier]

4. TAURI — prior: "Tauri plugin" (untyped bridge). Corrected: use **tauri-specta v2**
   to generate end-to-end-typed TS bindings from Rust commands+events — no hand-
   duplicated types across the FFI boundary. Mobile (iOS Swift / Android Kotlin)
   plugin init via `plugin android init` / `plugin ios init`.
   [src: specta-rs/tauri-specta; v2.tauri.app/develop/plugins/develop-mobile]

5. CRDT — prior: "Yjs provider" only. Corrected: Yjs remains the production default
   (~920K wk dl) AND we ALREADY SHIP `createLoroMergeStrategy` (2.2.0). So the sync
   package exposes a pluggable provider interface with **Yjs as the default** and
   **Loro as a first-class option that reuses the existing 2.2.0 merge seam** — not
   a from-scratch second engine. [src: pkgpulse yjs-vs-loro-2026; in-repo src/merge/loro.ts]

Additional 2.2.0 assets the prior plan under-credited (reduce effort):
  - `IncrementalView` (sub-linear queries) — feeds the framework bindings' list APIs.
  - True time-travel devtools — the A2UI `EntityDiff`/`EntityApproval` reuse it.
  - Tauri SQLite persistence adapter — the Tauri plugin extends it, doesn't replace it.
  - AG-UI ingestion bridge — A2UI chat/copilot build ON it, not beside it.

═══════════════════════════════════════════════════════════════════════════
ANSWERED DECISIONS (assessment §7 open questions → resolved with evidence)
═══════════════════════════════════════════════════════════════════════════
Q1 Monorepo structure → **pnpm workspaces + Turborepo + Changesets** (research #1).
   Migration is GRADUAL: `entity-graph-core` + `entity-graph-react` extracted first
   behind a re-export shim so the published `@prometheus-ags/prometheus-entity-management`
   path keeps working (no consumer break until both are stable). RISK-mitigated, not big-bang.
Q2 npm scoping → `@prometheus-ags/entity-graph-<target>` (matches roadmap; avoids
   collision with a flat `@prometheus-ags/<framework>`).
Q3 Rust CLI distribution → static binary + npm wrapper `@prometheus-ags/entity-graph-cli`
   with postinstall platform-binary download → `npx … generate` works out of the box.
Q4 Flutter naming → `entity_graph_flutter` (pub.dev snake_case). Confirmed acceptable.
Q5 A2UI architecture → client-first with a pluggable `EntityToolProvider`; MCP/A2A is a
   progressive-enhancement peer dep, NOT a hard dependency (lets A2UI ship before the CLI MCP).

NEW decision (forced by research #1): adopt Changesets now (Wave 1) so every
subsequent package gets independent semver from day one.

═══════════════════════════════════════════════════════════════════════════
NON-NEGOTIABLE CONSTRAINTS (from CLAUDE.md / AGENTS.md — apply to ALL changes)
═══════════════════════════════════════════════════════════════════════════
- Component → Hook → Store layering in every binding (the ESLint rule from 2.2.0
  `prometheusEntityLayeringRule` must be extended per-framework or re-expressed).
- ID-only lists; entities live once; no entity copies — preserved across ALL bindings.
- `pnpm` only. Files ≤ 800 lines (≤ 500 for the Rust crates per flint-style rules).
- Skills↔exports immutable gate (`refresh:exports` + `verify:skills`) for every change
  that touches a published package's public surface.
- Optional-peer-dep posture (established in 2.2.0) continues for every new integration.

───────────────────────────────────────────────────────────────────────────
CHANGE LIST (ordered by dependency, then customer value)
───────────────────────────────────────────────────────────────────────────

WAVE 1 — FOUNDATION (start immediately; unblocks everything)

1. v3-monorepo-and-tooling
   - Scope: repo (pnpm workspaces + Turborepo pipeline + Changesets + shared tsconfig/tsup presets)
   - Depends on: NONE
   - Agent: architect → code-architect
   - Complexity: M · score High · model: frontier
   - Customer value: LOW (enabler) but BLOCKING for all package work
   - Details: Add `packages/`, `turbo.json` (build/test/lint/typecheck pipelines with caching),
     `.changeset/`, root tooling presets. No code moves yet — pure scaffolding so #2 lands clean.
     Skill: workspace-structure.

2. v3-core-extraction  ★ critical path
   - library: existing in-repo React-free modules (assessment §3 map — ~70% already React-free)
   - Scope: packages (entity-graph-core [zero React] + entity-graph-react [shim re-export])
   - Depends on: v3-monorepo-and-tooling
   - Agent: architect → code-architect
   - Complexity: L · score High · model: frontier
   - Customer value: HIGH (unlocks every framework + native target)
   - Details: Move the 12-file React boundary (assessment §3) into entity-graph-react; everything
     else into entity-graph-core on `zustand/vanilla`. Publish `@prometheus-ags/prometheus-entity-management`
     as a thin re-export of entity-graph-react so NO consumer breaks. Sub-path exports
     (`./core`, `./react`, `./table`, `./view`, `./crud`) + `sideEffects:false`.

3. v3-sdl-spec  ★ critical path (parallel with #2)
   - Scope: spec + TS parser/validator (schema.json / entity-graph.toml → typed IR)
   - Depends on: v3-monorepo-and-tooling
   - Agent: architect (schema design, no UI)
   - Complexity: M · score Medium · model: frontier
   - Customer value: MEDIUM (blocks ALL codegen: Rust CLI, Flutter, HTMX)
   - Details: Define the canonical entity SDL (roadmap §5.3) + a `@prometheus-ags/entity-graph-sdl`
     parser producing a stable IR every generator consumes. Lock the format BEFORE any codegen.

4. v3-electricsql-react-extract
   - Scope: core cleanliness (move the lone React import out of adapters/electricsql.ts)
   - Depends on: v3-core-extraction
   - Agent: build-error-resolver (surgical)
   - Complexity: S · score Low · model: small
   - Details: Split the React hook in electricsql.ts into electricsql-react.ts so the adapter is
     fully React-free in core (assessment flagged this as the only non-clean adapter).

WAVE 2 — REACT PARITY + FIRST FRAMEWORKS (after Wave 1; validates the core API surface)

5. v3-react-parity
   - library: @tanstack/react-virtual (already a dep); IncrementalView (2.2.0)
   - Scope: entity-graph-react (useVirtualizedEntityList, useEntityQueries, column resizing,
     dehydrateGraph/rehydrateGraph, placeholderData, per-query staleTime/gcTime, select, onSettled,
     useInfiniteEntityList, persistGraphToStorage, test utils renderWithGraph/createMockTransport)
   - Depends on: v3-core-extraction
   - Agent: code-architect + tdd-guide
   - Complexity: L · score High · model: frontier
   - Customer value: HIGH (closes the TanStack Query parity gaps from the comparative review)
   - Details: Wire useVirtualizedEntityList over IncrementalView so virtualization + sub-linear
     updates compose. SSR dehydrate/rehydrate finalized for Next.js 15+/Remix.

6. v3-svelte-bindings  (Svelte 5 runes)
   - Scope: package @prometheus-ags/entity-graph-svelte
   - Depends on: v3-core-extraction
   - Agent: code-architect + tdd-guide
   - Complexity: M · score Medium · model: frontier
   - Customer value: HIGH (first proof the core API is truly framework-agnostic)
   - Details: Subscribe vanilla store via Svelte 5 `$state`/`$derived`/`$effect` (NOT legacy
     svelte/store). `createEntityStore` / `createEntityList`. This is the canary — if the core
     surface is wrong, it shows here first, before Solid/Lit/Alpine copy the pattern.

7. v3-solid-bindings  (parallel with #6)
   - Scope: package @prometheus-ags/entity-graph-solid
   - Depends on: v3-core-extraction
   - Agent: code-architect + tdd-guide
   - Complexity: M · score Medium · model: frontier
   - Details: `createEntity`/`createEntityList` over Solid `createResource` + `createStore`,
     bridging the engine's promise API. Fine-grained reactivity from the same vanilla store.

8. v3-sync-providers  (Yjs default + Loro option)
   - library: yjs (new); loro-crdt (REUSE 2.2.0 createLoroMergeStrategy)
   - Scope: package @prometheus-ags/entity-graph-sync (pluggable provider interface)
   - Depends on: v3-core-extraction
   - Agent: architect → code-architect (CRDT care)
   - Complexity: L · score High · model: frontier
   - Customer value: MEDIUM-HIGH (peer/collab sync — a category competitors lack)
   - Details: SyncProvider interface; Yjs provider (WebRTC + WebSocket/Hocuspocus) as default;
     Loro provider reusing the existing merge seam. Benchmark 10k entities before default-on
     (per risk register). Skills: entity-realtime-setup, entity-realtime-local-first.

WAVE 3 — WEB BREADTH + RUST FOUNDATION (after Wave 2; reuse the proven binding pattern)

9. v3-lit-webcomponents  (after #6 — mirrors the validated binding pattern)
   - Scope: package @prometheus-ags/entity-graph-web-components (Lit 3 + ReactiveController)
   - Depends on: v3-svelte-bindings (pattern), v3-core-extraction
   - Agent: code-architect + a11y-architect
   - Complexity: M · score Medium · model: medium
   - Details: `<entity-list>`/`<entity-detail>`/`<entity-form>` custom elements; framework-agnostic
     by construction. Skill: htmx-alpine-lit.

10. v3-alpine-plugin
    - Scope: package @prometheus-ags/entity-graph-alpine (Alpine plugin, $entity/$entityList magics)
    - Depends on: v3-core-extraction
    - Agent: code-architect
    - Complexity: S · score Low · model: small
    - Details: simplest binding; `Alpine.effect()` ↔ vanilla store. Skill: htmx-alpine-lit.

11. v3-htmx-server-adapter
    - Scope: package @prometheus-ags/entity-graph-htmx (Node SSE fragment server reference)
    - Depends on: v3-sdl-spec
    - Agent: code-architect
    - Complexity: M · score Medium · model: medium
    - Details: server-side graph + HTML fragments over SSE (HTMX 4 idiomorph/morph swaps).
      Different paradigm — scope to a Node reference server first (Rust HTMX = later, via CLI).
      Skill: htmx-alpine-lit.

12. v3-rust-cli  ★ blocks MCP/A2A/codegen
    - library: clap, tera (runtime templates), tokio; tauri-specta-style typed output
    - Scope: crate entity-graph-cli + npm wrapper @prometheus-ags/entity-graph-cli
    - Depends on: v3-sdl-spec
    - Agent: rust-reviewer + code-architect (rust-build-resolver on failures)
    - Complexity: L · score High · model: frontier
    - Details: `init` + `generate --target react|svelte|solid|flutter|rust` (react first), reading
      the SDL IR. npm wrapper downloads the platform binary on postinstall. ≤500-line Rust files.
      Skills: rust-patterns, golang-... n/a; axum-patterns (for serve subcommands later).

WAVE 4 — NATIVE + AI + DESKTOP (after Wave 3)

13. v3-mcp-server  (rmcp + Streamable HTTP/stdio)
    - library: rmcp 0.16 (official Rust MCP SDK)
    - Scope: entity-graph-cli `mcp-server` subcommand (resources = entities, tools = mutations)
    - Depends on: v3-rust-cli
    - Agent: ai-engineer + rust-reviewer
    - Complexity: L · score High · model: frontier
    - Details: Expose the graph as MCP resources (`entity://{type}/{id}`) + tools (upsert/query/
      subscribe). Dual transport: Streamable HTTP (SEP-2243 headers) + stdio for Claude Desktop.
      Pin MCP spec 2025-06-18; design for the 2026-07-28 RC. Skill: mcp-server (project canonical
      Axum+JSON-RPC dual-transport pattern). Forbidden: tools in call not in list; panics in handlers.

14. v3-a2a-server  (Agent2Agent v1.0)
    - Scope: A2A server (AgentCard/Task/Artifact/Message) exposing graph ops; TS + Rust embed
    - Depends on: v3-rust-cli
    - Agent: ai-engineer + code-architect
    - Complexity: L · score High · model: frontier
    - Details: A2A = agent↔agent collaboration (complementary to MCP's agent↔tools). AgentCard
      advertises graph capabilities; Tasks map to graph mutations; Artifacts return results.

15. v3-tauri-plugin  (tauri-specta typed)
    - library: tauri-specta v2; REUSE 2.2.0 tauri-sql-persistence adapter
    - Scope: crate/plugin @prometheus-ags/entity-graph-tauri (desktop + iOS/Android)
    - Depends on: v3-core-extraction, v3-rust-cli
    - Agent: code-architect + rust-reviewer
    - Complexity: L · score High · model: frontier
    - Details: Rust-side graph commands + events with tauri-specta-generated TS bindings (no hand-
      duplicated types). Extends the existing Tauri SQLite adapter; mobile via plugin ios/android init.
      Skill: tauri-react-vite.

16. v3-flutter-package  (Riverpod 3 + Freezed)
    - Scope: pub.dev package entity_graph_flutter (Dart graph mirror)
    - Depends on: v3-core-extraction (design parity), v3-sdl-spec (codegen target)
    - Agent: code-architect (Dart greenfield)
    - Complexity: L · score High · model: frontier
    - Details: Dart entity graph; Riverpod 3 `@riverpod` Notifier/AsyncNotifier (NOT legacy
      StateNotifier); Freezed immutables; transport registry mirrored. SDL is the shared contract
      (CLI generates Dart models). Skills: dart-flutter-patterns, flutter-rust-ffi (if sharing Rust core).

WAVE 5 — A2UI LIBRARY (after Wave 4)

17. v3-a2ui-react
    - library: REUSE 2.2.0 AG-UI bridge + time-travel devtools; Vercel AI Elements as reference
    - Scope: package @prometheus-ags/a2ui-react (EntityChat, EntityCopilot, EntityStream,
      EntityDiff, EntityApproval)
    - Depends on: v3-react-parity; v3-mcp-server (progressive-enhancement peer) ; AG-UI bridge (2.2.0)
    - Agent: code-architect + ui-ux-designer + ai-engineer
    - Complexity: L · score High · model: frontier
    - Customer value: HIGH (the CopilotKit-alternative differentiator)
    - Details: Client-first via pluggable `EntityToolProvider`; MCP server is optional enhancement.
      EntityDiff/EntityApproval reuse the 2.2.0 time-travel + graph snapshot APIs. EntityChat/Copilot
      build ON the AG-UI ingestion bridge already shipped, not beside it.

───────────────────────────────────────────────────────────────────────────
EXECUTION ROUND ORDER (waves; within a wave, items run in parallel)
───────────────────────────────────────────────────────────────────────────
Wave 1 (foundation):    v3-monorepo-and-tooling → { v3-core-extraction, v3-sdl-spec } → v3-electricsql-react-extract
Wave 2 (parity+canary): v3-react-parity, v3-svelte-bindings, v3-solid-bindings, v3-sync-providers   (all ← core-extraction)
Wave 3 (breadth+rust):  v3-lit-webcomponents (← svelte), v3-alpine-plugin, v3-htmx-server-adapter (← sdl), v3-rust-cli (← sdl)
Wave 4 (native+ai):     v3-mcp-server (← cli), v3-a2a-server (← cli), v3-tauri-plugin (← core+cli), v3-flutter-package (← core+sdl)
Wave 5 (a2ui):          v3-a2ui-react (← react-parity + mcp-server + AG-UI bridge)

Critical path: monorepo → core-extraction → { svelte canary, react-parity } and (sdl → rust-cli → mcp/a2a).
Two longest chains run in parallel: the FRAMEWORK chain and the SDL→RUST chain.

───────────────────────────────────────────────────────────────────────────
VERSION / RELEASE TARGETS (Changesets-driven, per-package semver)
───────────────────────────────────────────────────────────────────────────
- Wave 1–2  → v3.0.0  (core extraction = breaking monorepo restructure; published umbrella stays
                       a working re-export shim so apps upgrade with a one-line import change at most)
- Wave 3    → v3.1.0  (web framework breadth + Rust CLI)
- Wave 4    → v3.2.0  (native + AI: Tauri, Flutter, MCP, A2A)
- Wave 5    → v3.3.0  (A2UI library)
Each new package gets its own 0.x → 1.0 track via Changesets, independent of the umbrella.

───────────────────────────────────────────────────────────────────────────
RISK REGISTER (delta from assessment §6 + new research risks)
───────────────────────────────────────────────────────────────────────────
- Core extraction breaks consumers → re-export shim + Changesets canary release; keep npm path stable.
- Turborepo adoption overhead → start with build/test/lint/typecheck tasks only; tune caching later.
- MCP spec churn (2026-07-28 RC) → pin 2025-06-18; isolate behind the project mcp-server pattern; rmcp upgrades absorb it.
- CRDT perf at scale → Yjs default (proven); Loro opt-in; 10k-entity benchmark gate before default-on.
- Rust CLI scope bloat → ship init + generate --target react FIRST; gate other targets on demand.
- Flutter divergence from JS core → SDL is the single shared contract; CLI generates Dart from it.
- A2UI depending on unfinished CLI → client-first EntityToolProvider; MCP is progressive enhancement (Q5).

───────────────────────────────────────────────────────────────────────────
COMMANDS TO RUN (OpenSpec)
───────────────────────────────────────────────────────────────────────────
/opsx:new v3-0-universal-platform-evolution   (umbrella)
/opsx:new v3-monorepo-and-tooling
/opsx:new v3-core-extraction
/opsx:new v3-sdl-spec
/opsx:new v3-electricsql-react-extract
/opsx:new v3-react-parity
/opsx:new v3-svelte-bindings
/opsx:new v3-solid-bindings
/opsx:new v3-sync-providers
/opsx:new v3-lit-webcomponents
/opsx:new v3-alpine-plugin
/opsx:new v3-htmx-server-adapter
/opsx:new v3-rust-cli
/opsx:new v3-mcp-server
/opsx:new v3-a2a-server
/opsx:new v3-tauri-plugin
/opsx:new v3-flutter-package
/opsx:new v3-a2ui-react

───────────────────────────────────────────────────────────────────────────
SYCOPHANCY SELF-CHECK
───────────────────────────────────────────────────────────────────────────
- S-02 (grounding): Every decision change cites a 2026 source OR an in-repo 2.2.0 asset; the
  Riverpod/Turborepo/rmcp/tauri-specta/Loro corrections are evidence-backed, not preference.
- S-07 (scope creep): 17 children map 1:1 to roadmap phases/assessment goals. Vue/Android/Automerge/
  WebRTC-standalone are explicitly DEFERRED (roadmap P3) — not silently added. No new scope invented.
- S-03 (caveats): Core extraction is flagged as the only breaking change (shim mitigates); CRDT
  default-on gated on a benchmark; MCP spec RC churn called out; Rust CLI scoped to one target first.

───────────────────────────────────────────────────────────────────────────
RESEARCH SOURCES (2026)
───────────────────────────────────────────────────────────────────────────
- Monorepo: turbo.build/repo/docs/guides/publishing-libraries; viadreams.cc monorepo-tools-2026; dev.to pnpm+Turborepo+Changesets
- MCP: github.com/modelcontextprotocol/rust-sdk (rmcp 0.16); blog.modelcontextprotocol.io 2026-07-28 RC; modelcontextprotocol.io/specification/2025-06-18; systemprompt.io build-mcp-server-rust
- A2A: zylos.ai 2026 agent-interoperability MCP/A2A/ACP convergence
- CRDT: pkgpulse.com yjs-vs-automerge-vs-loro-2026; in-repo src/merge/loro.ts (2.2.0)
- Flutter: riverpod.dev/docs/whats_new (3.0); codewithandrea async-notifier; flutterstudio riverpod-3-migration
- Tauri: specta-rs/tauri-specta v2; v2.tauri.app/develop/plugins/develop-mobile
- Svelte/Solid/framework-agnostic: robinwieruch react-libraries-2026; piccalil.li framework-agnostic design systems

PLAN COMPLETE
