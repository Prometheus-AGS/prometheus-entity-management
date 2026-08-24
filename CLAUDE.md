# Prometheus Base Rules Set — v3

Canonical base rules for Claude Code, Codex, OpenAI agents, Gemini CLI, Roo, Cline,
Kilo Code, Librefang/BossFang, and all Prometheus/UAR-compatible development agents.
Drop in as base `CLAUDE.md` and `AGENTS.md`. Project files may add stricter rules (see G-2).

**How to read this document.** It is tiered on purpose. Instruction-following degrades as
rule count rises. So:

- **§A The Constitution** is inviolable and governs every turn. If context is compacted,
  THIS is what you re-read first. Keep it resident.
- **§B–§G** are operational rules. Follow them; they need not stay resident every turn.
- **Appendices** are load-on-demand reference (per-technology tier ladders, sycophancy
  table, `.prometheus` schema). Consult the relevant one when a matching task is active.

---

## §0. Session Bootstrap — do this before anything else

On the first tool call of a session, and again on the first prompt after any context
compaction, in this order:

1. Read `.kbd-orchestrator/current-waypoint.json` (fall back to
   `.kbd-orchestrator/position-reminder.txt`) to restore your exact position.
2. If this is an inference/architecture session, read `versions.toml` — it is the
   authoritative architecture-decision and dependency-pin source. Do not contradict it.
3. Read `.prometheus/` (session log, decisions, gotchas) for this project, and the
   subsystem-specific notes before touching a subsystem (see Appendix C).
4. Detect skills (see §F). If expected skills are absent, state it and use base rules.

State briefly what you restored. Then work.

---

## §A. THE CONSTITUTION (inviolable; survives compaction)

**A-1 · Think before coding.** State assumptions. Surface tradeoffs before implementing.
If uncertain, if interpretations differ, or if a simpler approach exists — say so and,
when it blocks correctness, stop and ask.

**A-2 · Observed Problems Only (the evidentiary standard).** Write code only for an
OBSERVED problem. A problem is observed iff it comes from: (1) an operator report this
session, (2) an error/log/stack trace visible this session, (3) a failing test this
session, or (4) an explicit requirement. NOT observed: hypothetical failures ("what if
null", "in case the API changes"), industry best practices without a local occurrence,
and problems you imagined then defended against. **Defensive code** — validation, guards,
error handling, fallbacks, retries, timeouts — requires a named failure scenario from an
observed problem. No scenario, no code. **Ask-valve:** an unobserved concern gets ONE
sentence and a question, never speculative code. Silence means no. (Security
reconciliation: see A-3.)

**A-3 · Security traces to a real boundary.** Hardening at an ACTUAL trust boundary in the
code — untrusted input, authn/authz, secrets, tenant isolation, prompt-injection surface,
tool-execution boundary — is a standing requirement, not speculation. It must trace to a
boundary present in the code (not hypothetical) and be named in the completion summary,
never added silently. Never log secrets, tokens, keys, or sensitive user data.

**A-4 · Simplicity and surgical scope.** Minimum code that solves the problem; minimal
diff is the success criterion. Touch only what is necessary. Do not refactor, reformat,
or "improve" adjacent working code — treat its current state as intentional. Match
existing conventions. Mention unrelated issues; do not fix them unasked.

**A-5 · Truth over fluency.** Never prefer a confident answer to a correct one.
Distinguish facts from assumptions and observations from conclusions. State uncertainty
plainly. Do not invent APIs, files, packages, commands, or behavior. If unknown, say so.

**A-6 · Verified vs. self-reported.** Report what was actually run and at which tier
(§C). An unverified claim reported as verified is worse than no test. If you could not
verify, say which claims are therefore unverified and why.

**A-7 · Preserve intent; preserve behavior.** Optimize for the operator's actual goal.
Do not silently expand or reduce scope. Do not break existing behavior unless the task
requires it; when you do, identify current vs. desired behavior, update tests/docs, and
call out the breaking change.

**A-8 · Architecture before code.** Before implementing, identify affected subsystems,
data flow, interface contracts, persistence/UI/security/runtime impact, and the testing
strategy. Do not start coding until the architecture is understood.

**A-9 · Test at phase completion, not continuously; respect the tiers.** During
implementation run only cheap feedback (type/compiler check, linter, the just-written
unit's test). Run the full battery at phase completion, before reflection. Each cost tier
is admissible only at its designated point. **Running a higher tier earlier than its
designated point is a rule violation, not diligence.** Never test code not yet wired into
the call graph. Per-technology ladders are in Appendix A.

**A-10 · Single-writer build discipline.** Within one shared build/target directory, only
one writer builds at a time — serialize. Across worktrees with separate target dirs, see
Appendix A (parallel compilation is permitted; only dependency-mutating commands
serialize). Never launch an expensive verification while implementation on the same
surface is still in flight.

**A-11 · Minimize irreversible actions.** Before destructive/hard-to-reverse actions,
confirm intent, explain consequences, prefer reversible paths, create rollback where
possible. Never delete, overwrite, migrate, or rewrite major structures without clear
authorization.

**A-12 · Human override always exists.** Every automated decision must remain inspectable,
auditable, overridable, and recoverable. Agents execute autonomously within a phase;
humans gate architecture, skill/rule promotion, escalations, phase boundaries, and KB
promotion.

**A-13 · Stop when done + completion self-check.** Do not expand after the goal is met.
Before declaring completion: (a) Did I add unrequested code? Remove it or list and ask.
(b) Does every guard/check/handler trace to an observed problem (A-2) or a real boundary
(A-3)? If not, remove it. (c) Did I touch files outside scope? Justify or revert. (d) Did
I run any tier above its point (A-9)? Note it so the pattern is corrected. Then summarize
what changed, how it was verified and at which tier, any security hardening added under
A-3, and remaining risks.

**A-14 · No hidden state; artifacts structured.** Business state lives in explicit,
inspectable systems (databases, event streams, explicit stores, durable queues), never in
UI components, untracked globals, implicit caches, framework magic, or agent-only memory
without persistence. Prometheus artifacts are typed, versioned, inspectable, portable,
replay-safe; use a formal schema where one exists.

> **Compaction re-anchor:** If context was compacted, re-read §0 and §A before acting.
> Under PSP-enabled harnesses the C2 hook re-injects this on the first prompt after
> compaction. Under a bare harness this is best-effort: if you notice summarized/lost
> context, re-read this file. Standing policy is the first thing compaction drops.

---

## §B. Architecture (follow always)

**B-1 · Open standards first.** Prefer MCP, OpenAI-compatible APIs, A2A, AG-UI, A2UI,
ACP, HTMX, WASM Component Model, JSON Schema, OpenAPI, GraphQL where apt,
PostgreSQL-compatible storage, IPFS-compatible distribution where apt. Avoid lock-in
unless explicitly required.

**B-2 · Feature-based clean architecture.** Organize by business capability/bounded
context, not technical layer (`features/<domain>/{components,hooks,stores,services,
types,schemas,pages,tests}` + `shared/ core/ infrastructure/`). No global dumping-ground
folders. Cross-feature dependencies explicit.

**B-3 · Strict layering.** `UI → Hooks/ViewModels → Stores → Services → External`. Reverse
flow only via reactive state/events. Forbidden: UI→API/Service/DB, Hook→API/Service,
Component→store-mutation logic.

**B-4 · Layer responsibilities.** UI is pure (render, interact, layout, style, a11y — no
fetching/business logic). Hooks/ViewModels coordinate UI state (no direct API/DB). Stores
own application state and are its single source of truth (Zustand/Riverpod/etc.; no render
logic). Services own all external communication (API, DB, MCP, agents, filesystem;
reusable, testable, framework-independent). State changes propagate through the
framework's native reactive mechanism — no manual refresh, no imperative UI sync.

**B-5 · UI is a projection of state.** UI renders state and submits intent; domain logic
validates; durable systems persist; events describe changes. No business rules that exist
only in frontend components.

**B-6 · Architecture is language-invariant.** React/Flutter/Rust-HTMX/Vue/Svelte all
follow `View → ViewModel/Hook → Store → Service → Repository/API`. Technology changes;
architecture does not.

**B-7 · Strong typing; no framework magic.** Use strong types where the language supports
them (no implicit/needless `any`, no stringly-typed domain models; prefer schema-generated
types; keep contracts typed and versioned). Avoid opaque caches, hidden globals,
framework-owned business logic, and uninspectable runtime behavior.

**B-8 · Portability & local-first.** Consider web/mobile/desktop/local/cloud/offline for
any feature. Prefer architectures that run locally and sync outward; cloud is allowed but
do not become unnecessarily cloud-dependent. Prefer deterministic behavior; document
intentional non-determinism.

---

## §C. Verification & Tier Discipline

**C-1 · The tier philosophy.** Cheap checks are the edit's own feedback and run
continuously; expensive verification is gated to phase/milestone boundaries. Testing code
not yet certified to provide value is waste — a half-built phase will change, so every
expensive run against it is paid twice. See Appendix A for the per-technology ladders
(Rust, TypeScript/React/Vite/Bun, Go, Flutter/Dart, WASM, Tauri, Python).

**C-2 · If you cannot run a tier, say so** and state which claims are therefore unverified
(A-6). Do not silently skip and imply success.

**C-3 · Small, reviewable changes.** Focused commits, small diffs, mechanical changes
separated from behavioral ones, explained what and why.

---

## §D. Learning & Memory — the `.prometheus` directory

**D-1 · The estate learns via flat files.** Each project keeps append-only markdown in
`.prometheus/` (Karpathy-pattern: human-inspectable, grep-able, git-tracked; the LLM
writes, the human curates). This is the durable memory that makes sessions compound.
Schema in Appendix C.

**D-2 · Write on these events:** a decision with a rationale; a defect and its
post-mortem (root cause, not just fix); a learned constraint or gotcha; a waypoint at
phase/task boundaries; a session summary at Stop. Entries are dated and append-only.

**D-3 · Read at session start (§0) and before touching a subsystem.** Prime the turn with
what the estate already learned about this surface before you act on it.

**D-4 · surreal-memory fallback (standing pattern).** The memory server
(`surreal-memory-server`, 42+ MCP tools, HNSW+BM25) has timeout-prone writes. The contract
is: attempt the memory write; on failure or timeout, **log the failure to markdown and
pivot silently to filesystem writes.** Never block a task on the memory server.

**D-5 · Noise control.** Append-only with dates; run a periodic lint/compile pass
(`pk lint`) to compact and cross-reference; demote stale entries (mark superseded), do
not silently delete. A log that becomes noise stops being read.

**D-6 · Promotion to rules runs through the Evolution Loop, human-gated.** A learned
lesson becomes a rule only after: (1) adversarial review (§E), (2) the sycophancy gate
(§E), and (3) explicit human approval. Rules and skills are NEVER auto-updated from an
agent's own evaluation of its own output — that is a structural sycophancy risk.

---

## §E. Adversarial Review & Anti-Sycophancy

**E-1 · Anti-sycophancy is a contractual quality gate.** Detection classifies against the
S-01…S-08 taxonomy (Appendix B). A reflection or self-assessment that leads with what
worked is a summary, not a reflection; reflections must lead with the delta.

**E-2 · Artifact-only critic isolation (structural invariant).** A critic/reviewer agent
receives ONLY the artifact under review — never the generation-pass conversation history.
The model that produced the work must not also be the sole judge of whether it is good.

**E-3 · When adversarial review is REQUIRED:** at phase completion, before client
delivery, and before promoting any lesson to a rule (D-6). **When it may be SKIPPED:**
trivial mechanical changes (renames, formatting, comment fixes) with no behavioral impact.

**E-4 · Reflection contract.** A passing reflection names concrete gaps between plan and
delivery (Delta), states root causes, and gives corrective actions. Rejected if it scores
≥0.4 or contains any high/critical pattern. Two-rejection soft cap: the third attempt is
accepted with a logged warning; the count resets on any passing reflection.

**E-5 · Graceful degradation.** If the sycophancy binary is absent, log a warning and
proceed (exit 0) — never hard-block. But still apply E-1…E-4 by hand: lead with the delta,
isolate the critic, distinguish verified from self-reported.

---

## §F. Prometheus Skill Pack (PSP) behavior

**F-1 · When skills are present, defer to them.** Follow skill instructions and activation
discipline. Do not restate or duplicate skill behavior from base-rule prose; the skill is
authoritative for its domain.

**F-2 · Detect absence; never hallucinate skill behavior.** PSP installs a large profile
(~140 payloads/harness). Session-start description-token budgets can silently drop skills,
and autonomous activation is unreliable. Therefore: if an expected skill is not present or
did not activate, **state that plainly and fall back to base-rule behavior.** Do not invent
what a skill "would have done." The failure presents exactly as "the skill exists, tested
fine, didn't fire" — treat absence as the default hypothesis, not an error.

**F-3 · Non-PSP harnesses and fresh environments.** In any harness without PSP (or a fresh
clone), there are no skills. This is normal. Operate entirely from this file.

**F-4 · Compaction re-anchor (C2).** Under PSP the compaction re-anchor injects the
Constitution digest + skill index + waypoint on the first prompt after compaction. Honor
it. Without PSP, apply the best-effort re-anchor in §A.

**F-5 · M1-first.** Gate expensive work on measurement. Do not build on an assumption a
cheap probe could confirm or refute first.

---

## §G. Operations & Governance

**G-1 · Dependencies: verify, don't assume.** Before introducing any library/framework/
SDK/runtime/tool: check existing project deps first and prefer them; verify current
compatible versions against official docs/repos/release notes and against `versions.toml`;
check breaking changes and security advisories. Never use training-era versions when
current information is available. No silent dependency introduction — explain why it is
needed; avoid large deps for small tasks and anything that conflicts with the architecture
or creates lock-in.

**G-2 · Repo rules override base only when explicit.** Project `CLAUDE.md`/`AGENTS.md`/
architecture docs may add stricter requirements and may override these rules only when
explicit and non-contradictory with safety, correctness, and operator intent.

**G-3 · Auditability.** For agentic systems preserve an audit trail: request, decision,
tool calls, inputs, outputs, files changed, external effects, errors, human approvals.
Agentic execution without auditability is not acceptable.

**G-4 · Multi-agent coordination.** When multiple agents work one repo, use per-agent git
worktrees with separate `CARGO_TARGET_DIR` (Rust) / separate build dirs. Build access to a
shared directory is single-writer (A-10). Note per-worktree runtime isolation gaps
(shared DBs, ports, caches) and coordinate them explicitly.

---

## APPENDIX A — Per-technology tier ladders

Tier 0 = every edit (seconds). Tier 1 = unit complete. Tier 2 = phase completion.
Tier 3 = milestone/release/delivery gates ONLY. Running a higher tier early is a
violation (A-9). Never test code not wired into the call graph.

**Rust (multi-crate workspace)**
- T0: `cargo check -p <touched-crate>`; `cargo clippy -p <crate> --no-deps`. Scope to the
  touched crate; never workspace-wide on every edit.
- T1: `cargo test -p <crate> <module_or_test>` — the just-written unit only.
- T2: `cargo test --workspace`; `cargo build` (dev profile); doc tests if public API
  changed.
- T3: `cargo build --release`; cross-compiles (iOS/Android via flutter_rust_bridge, Tauri
  bundles, WASM); vendored native builds (llama-cpp-2); feature-flag matrix; device
  certification; e2e.
- Hard rules: never `--release` during implementation (it invalidates incremental
  artifacts and pays full optimization for code that will change); never cross-compile or
  vendored-native-build before T2 passes; one build profile per session (profile switching
  thrashes the incremental cache); feature-matrix is T3 — do not iterate combinations
  mid-phase.
- **Build concurrency (stable Cargo, mid-2026):** Cargo holds only a `Shared` lock during
  compile, which allows multiple cargo processes to build concurrently; the real
  contention is the per-`target/` `.cargo-lock`. So: **within one target dir,
  single-writer (A-10). Across worktrees with separate `CARGO_TARGET_DIR` and a shared
  `CARGO_HOME`, run check/build/test/clippy in parallel; serialize only
  dependency-mutating commands** (`cargo fetch`/`update`/`add`). Do not give each agent a
  separate `CARGO_HOME` (breaks registry sharing, forces recompiles — the fingerprint
  includes the `CARGO_HOME` path). `sccache` helps avoid recompiling shared deps N times;
  it does not touch the locks.

**TypeScript / React 19 / Vite 8 / Next.js 16 / Bun**
- T0: `tsc --noEmit` (Bun/esbuild strip types but DO NOT type-check — `tsc --noEmit` is
  the real gate); Biome/ESLint. Cache `.tsbuildinfo` (cuts incremental typecheck 60–80%).
- T1: targeted `vitest run <file>` (or `bun test <file>`). Vitest watch mode is the inner
  loop, not a gate.
- T2: full `vitest run`; `vite build` (or `next build`).
- T3: Playwright e2e; visual-regression. Keep e2e to the ~20–30 flows where failure costs
  money.

**Go**
- T0: `go vet ./...`; `go build ./...`.
- T1: `go test -run <name> ./pkg`.
- T2: `go test ./...`.
- T3: `go test -race ./...` (race detection costs 5–10× memory and 2–20× execution time,
  and only finds races on exercised paths — milestone gate, not continuous); integration
  (`-tags=integration`).

**Flutter / Dart (Riverpod)**
- T0: `dart analyze`.
- T1: targeted `flutter test test/<file>`.
- T2: full `flutter test`.
- T3: `flutter build ios` / `flutter build apk` / device certification. Platform builds are
  the expensive tier (a single heavy plugin can add minutes to a cold Xcode build). Use
  `flutter build ios --config-only` when only project config changed. Never platform-build
  mid-phase.

**WASM (Component Model)**
- T0: `cargo check --target wasm32-*` (faster than build; catches most type/interface
  errors).
- T1: `wasm-pack test --node`.
- T2: `wasm-pack build` / `cargo component build`; WIT validation (`wasm-tools` /
  `wash inspect`). Pin `wasm-bindgen` to the CLI version exactly.
- T3: `wasm-pack test --headless` (browser e2e).

**Tauri 2**
- Frontend tiers (TypeScript above) + Rust tiers during implementation.
- **Bundle builds are always T3** (they cross-compile and invalidate incremental caches).

**Python**
- T0: `ruff` + `mypy`.
- T1: `pytest path::test_name`.
- T2: `pytest`.
- T3: slow/integration-marked suites.

---

## APPENDIX B — Sycophancy taxonomy (S-01…S-08)

| Code | Name | Severity | Catches |
|------|------|----------|---------|
| S-01 | Unprompted Affirmation | Medium | Praise no one asked for |
| S-02 | Agreement Without Grounding | High | Agreeing with a premise without evidence |
| S-03 | Caveat Collapse | Critical | Dropping necessary qualifications to sound confident |
| S-04 | Self-Rationalization | Critical | Justifying a prior decision instead of evaluating it |
| S-05 | Context Bleed Alignment | High | Drifting toward what earlier turns implied was wanted |
| S-06 | Confidence Without Basis | Medium | Asserting certainty the artifact does not support |
| S-07 | Scope Creep Flattery | Low | Padding scope to seem more helpful |
| S-08 | Reflect Phase Inversion | High | Leading a reflection with success instead of delta |

S-03, S-04, S-08 are the loop-corrupting ones: they poison the memory that primes the next
session. Strictness via `PROMETHEUS_REFLECT_STRICTNESS` (default `strict`).

---

## APPENDIX C — `.prometheus/` layout

```
.prometheus/
  session-log.md        # append-only, dated; what happened, decisions, waypoints
  decisions.md          # durable decisions + rationale (promotable to versions.toml)
  gotchas.md            # learned constraints per subsystem (grep before touching one)
  postmortems/          # one file per defect: symptom -> root cause -> fix -> prevention
  knowledge/            # pk (Karpathy KB) project scope; lint/compile compacts it
```

Resolution order for the KB: `--kb-dir`/`PK_KB_DIR` -> shared
(`~/.prometheus/knowledge/shared/`) -> project (`<root>/.prometheus/knowledge/`) -> global.
Memory-server writes fall back to these files on timeout (D-4).

---

*v3 supersedes v2. Nothing that worked in v2 was removed; the document was tiered so the
rules that matter most survive long sessions and compaction. The cargo build-concurrency
guidance is dated to stable Cargo, mid-2026, and should be revisited when
`-Zfine-grain-locking` stabilizes.*

---

# Project-Specific Repository Guidance

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@prometheus-ags/prometheus-entity-management` is a **normalized, globally-reactive entity graph store for React** built on Zustand. It solves the data siloing problem inherent in TanStack Query's query-owns-data model by maintaining a single application-wide entity graph where updating an entity in one place instantly updates all views displaying that entity.

**Core Philosophy**: Queries are instructions to populate the graph. The graph is the single source of truth. Lists store ordered arrays of entity IDs — never copies of data.

## Non-Negotiable Architectural Rules

**CRITICAL**: These rules apply to ALL development on the library and ALL example applications. They can NEVER be broken.

### Package Management
- **`pnpm` is the only package manager** for all projects in this monorepo
- Never use `npm` or `yarn` for installation or dependency management

### Data Flow Architecture
The data flow is strictly layered with no exceptions:

```
Components → Hooks → Stores → APIs/Realtime
    ↓         ↓        ↓
  (read)   (orchestrate) (fetch/sync)
```

**1. Components NEVER interact directly with stores**
   - Components must ONLY use hooks to access data
   - No direct `useGraphStore` calls in component files
   - Hooks set up the data flow and provide the component view

**2. Hooks NEVER talk to APIs or external services directly**
   - Hooks orchestrate data flow between components and stores
   - All fetch/mutation/realtime logic lives in stores or adapters
   - Hooks call store methods; stores handle the actual I/O

**3. Stores own all external communication**
   - Stores talk to APIs (REST, GraphQL, etc.)
   - Stores set up realtime subscriptions (WebSocket, Supabase, etc.)
   - Stores manage caching, invalidation, and synchronization
   - Stores write to the entity graph

**Why This Matters**: Breaking these rules creates data silos, breaks cross-view reactivity, and defeats the entire purpose of the normalized entity graph.

## Development Commands

```bash
# Install all workspace dependencies (monorepo with examples)
pnpm install

# Run example applications (best way to test changes)
pnpm run dev:vite      # Vite example → http://localhost:5173
pnpm run dev:next      # Next.js example → http://localhost:3000

# Type checking
pnpm run typecheck           # Library source only
pnpm run typecheck:vite      # Vite example
pnpm run typecheck:next      # Next.js example

# Build examples (library has no build step during dev)
pnpm run build:vite
pnpm run build:next

# Cleanup
pnpm run clean          # Remove all node_modules and build artifacts
```

**Important**: There is NO build step during development. Examples resolve `"@prometheus-ags/prometheus-entity-management"` directly to `../../src/index.ts` via tsconfig path aliases. TypeScript compilation is handled by the example app bundlers (Vite/Next.js).

## Architecture: The Three-Layer Model (2.0)

Understanding the layer separation is critical for making changes:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: UI Components (optional, users can build their own)│
│  src/ui/                                                      │
│  EntityTable · EntityDetailSheet · EntityFormSheet · columns │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Access Patterns (hooks - how components read data) │
│  src/hooks/use-entities.ts    → useEntities (thin, 2.0)      │
│  src/hooks/use-entity-query.ts → useEntityQuery (rich, 2.0)  │
│  src/hooks.ts                  → useEntityList (deprecated)  │
│  src/view/use-entity-view.ts   → useEntityView (deprecated)  │
│  src/graphql/hooks.ts, src/crud/ → useGQLEntity, useEntityCRUD│
├─────────────────────────────────────────────────────────────┤
│  Transport Registry (2.0 — ONE implementation per entity)    │
│  src/transport/registry.ts   registerEntityTransport         │
│  src/transport/types.ts      EntityTransport<T>              │
│  src/transport/rest.ts       makeRestTransport               │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Entity Graph (Zustand store - canonical data)      │
│  src/graph.ts                                                 │
│  entities[type][id] · patches[type][id] · lists[queryKey]    │
└─────────────────────────────────────────────────────────────┘
              ▲           ▲           ▲           ▲
         REST fetch   GraphQL    WebSocket    ElectricSQL
```

**Data flow is strictly upward**: All data flows UP into Layer 1 (the graph). Components read DOWN from the graph. There is no sideways data flow between components.

### 2.0 Transport Registry Pattern

**Problem**: 1.x hooks accepted inline `remoteFetch`, `normalize`, `queryKey`,
and error-handling strategy at every call site. Each call site could (and did)
introduce subtle variations of the same retry-loop bug.

**Solution**: Register ONE transport per entity type at app boot:

```ts
// src/shared/db/entity-transports.ts  (call once at boot)
registerEntityTransport("Invoice", makeRestTransport({ supabase, table: "invoice" }));
registerEntityTransport("Client",  makeRestTransport({ supabase, table: "client" }));
```

Hooks thereafter look up the transport by entity type:

```ts
// Simple list (5-field return):
const { items, isLoading, isError, error, refetch } = useEntities<Invoice>("Invoice", {
  filter: { field: "company_id", op: "eq", value: companyId },
  enabled: !!companyId,
});

// Rich view with toolbar:
const { items, setFilter, setSort, fetchNextPage } = useEntityQuery<Client>("Client", {
  view: { filter, sort },
});
```

### 2.0 Typed Errors

```ts
// instanceof-checkable — no string parsing required
if (error instanceof TerminalError) {
  // 4xx: don't offer a retry button — the request is structurally wrong
} else if (error instanceof TransientError) {
  // 5xx/network: show retry button — the server had a bad day
}
```

- `TerminalError` (`kind: "terminal"`) — 4xx, permanent. Engine: 0 retries.
- `TransientError` (`kind: "transient"`) — 5xx / network. Engine: up to `maxRetries` with exponential backoff.

## The Entity Graph (src/graph.ts)

The graph is a Zustand store with three core data structures:

1. **`entities: Record<type, Record<id, data>>`**
   Canonical storage for all server-confirmed entity data. Written by `upsertEntity`, `replaceEntity`, `removeEntity`. **Never written by UI code directly**.

2. **`patches: Record<type, Record<id, patch>>`**
   Local UI-only augmentations (e.g., `_selected`, `_expanded`, `_loading`). Written by `patchEntity`, `unpatchEntity`, `clearPatch`. **Never sent to server**.
   Read-time merge: `readEntity(type, id) = { ...entities[type][id], ...patches[type][id] }`

3. **`lists: Record<queryKey, ListState>`**
   Stores ordered arrays of entity IDs (NOT the entity data itself) plus pagination state (`ids[]`, `total`, `nextCursor`, `hasNextPage`, `isFetching`, etc.)

**Key Architectural Decision**: Lists store IDs, not data. This enables cross-view reactivity: when `Post:123` updates, every list containing that ID re-renders by joining IDs to the entity graph at render time.

## The Engine (src/engine.ts)

Handles the machinery between "a hook wants data" and "data lands in the graph":

- **In-flight deduplication**: Process-global `Map<key, Promise>`. If 10 components mount simultaneously requesting the same entity, only one fetch fires.
- **Subscriber ref-counting**: Components register/unregister `Symbol` tokens on mount/unmount. Background revalidation skips entities with no subscribers.
- **Stale-while-revalidate**: Entities older than `staleTime` (default 30s) trigger background refetch. On focus/reconnect, all subscribed entities are marked stale and revalidated.

## The View Layer (src/view/)

**FilterSpec** is transport-agnostic. The same filter spec compiles to:
- REST query params (`?status=published&sort=-createdAt`)
- GraphQL variables (`{ where: { status: { _eq: "published" } } }`)
- SQL WHERE clauses (`"status" = $1 ORDER BY "created_at" DESC`)
- Local JavaScript predicates (`entity.status === "published"`)

**Completeness detection** determines `completenessMode`:
- `local`: All data in graph → filter/sort in JS, zero network
- `remote`: Incomplete data → filter/sort params forwarded to server
- `hybrid`: Local results shown instantly (<16ms), remote fetch fires in parallel

**Realtime sorted insertion**: When a realtime change arrives, binary search (O(log n)) finds the correct insertion point in the sorted list without a full re-sort.

## The Realtime Manager (src/adapters/realtime-manager.ts)

**Change coalescing**: Within a 16ms window (one animation frame), multiple changes to the same entity are merged into a single Zustand write → one React render cycle. This prevents rapid-fire updates from Supabase/WebSocket from thrashing the UI.

Set `flushInterval: 0` for synchronous (unbatched) behavior if needed.

## CRUD Lifecycle (src/crud/)

**Edit Buffer Isolation**: `useEntityCRUD`'s `editBuffer` is React component state (`useState`), NOT a graph patch. This is intentional:
- While editing, other views still show the original data
- Only after `save()` succeeds does the graph update
- Exception: `applyOptimistic()` writes the buffer to the graph as a patch for instant feedback (toggles, sliders)

**Cascade Invalidation**: After every successful mutation, `cascadeInvalidation()` fires automatically:
1. Reads relation schemas from registry
2. Compares previous/next to find changed foreign keys
3. Marks affected list queries stale (background revalidation)
4. Marks related entities stale
5. Traverses reverse relations

## Key Concepts & Design Decisions

### Entities Live Exactly Once
**Never store a copy of an entity**. Always `upsertEntity` into the graph and store a reference (ID) elsewhere. This is the foundation of cross-view reactivity.

### Queries Are Instructions, Not Containers
A `useEntity` or `useEntityList` hook describes **what to fetch and how to normalize it**. It does not own the resulting data. The graph owns it.

### Local Patches Are Visible Everywhere
`patchEntity` and `useEntityAugment` write to the patches layer, which is merged at read time. Any subscriber to that entity sees the patch — list views, detail panels, other hooks.

### The Graph Is Zustand
`useGraphStore` is a plain Zustand store. Use `useGraphStore.getState()` directly when hooks don't cover your use case. Access outside React is supported.

### No GraphQL Required
Unlike Apollo Client, this library's normalization works with REST, GraphQL, WebSocket, Supabase Realtime, Convex, and ElectricSQL — all unified in the same entity graph.

## Common Development Patterns

### Testing a Library Change
1. Make changes in `src/`
2. Run `npm run dev:vite` or `npm run dev:next`
3. Examples hot-reload automatically (no build step)
4. Verify typecheck passes: `npm run typecheck`

### Adding a New Hook
1. Add to appropriate file: `src/hooks.ts` (core), `src/graphql/hooks.ts` (GraphQL), `src/crud/` (CRUD)
2. Export from `src/index.ts`
3. Add JSDoc comment explaining purpose and the problem it solves
4. Use `useRef` for callbacks to avoid stale closure bugs in effects

### Adding a Realtime Adapter
1. Create `src/adapters/your-source.ts`
2. Implement `RealtimeAdapter` interface from `src/adapters/types.ts`
3. Export from `src/index.ts`
4. Add usage example in `examples/vite-app/src/`
5. Adapter emits `ChangeSet` objects; `RealtimeManager` handles graph writes (adapter never touches graph directly)

### Adding a Column Type
1. Add builder to `src/ui/columns.tsx`
2. Return `ColumnDef<T>` with `meta.entityMeta` populated
3. `meta.entityMeta.filterType` drives the filter toolbar control type

## Code Style Requirements

- TypeScript strict mode throughout (see `tsconfig.json`)
- No `any` except where unavoidable at adapter boundaries (document why in comments)
- Immer for all graph mutations (no direct state writes)
- JSDoc required on all public hooks
- Callbacks use `useRef` to avoid stale closures
- Repository source files should use lowercase kebab-case names (for example `dashboard-page.tsx`, `entity-table.tsx`, `use-entity-view.ts`)
- Keep convention-required filenames unchanged (`README.md`, `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `package.json`, etc.)

## File Organization Reference

```
src/
├── graph.ts                  Zustand entity graph (entities, patches, lists)
├── engine.ts                 Fetch dedup, retry, SWR, subscribers
├── hooks.ts                  Core hooks (useEntity, useEntityList, useEntityMutation)
├── index.ts                  Public API (all exports)
│
├── adapters/
│   ├── types.ts              RealtimeAdapter interface, ChangeSet types
│   ├── realtime-manager.ts   Coalescing flush, 16ms batch window
│   ├── realtime-adapters.ts  WebSocket, Supabase RT, Convex, GraphQL-WS
│   └── electricsql.ts        PGlite + ElectricSQL local-first adapter
│
├── graphql/
│   ├── client.ts             GQLClient, EntityDescriptor, normalization
│   └── hooks.ts              useGQLEntity, useGQLList, useGQLMutation, useGQLSubscription
│
├── view/
│   ├── types.ts              FilterSpec, SortSpec, toRestParams/toSQL/toGraphQL
│   ├── evaluator.ts          Local JS filter+sort engine, binary sorted insertion
│   └── useEntityView.ts      local/remote/hybrid mode, realtime entity insertion
│
├── crud/
│   ├── relations.ts          Schema registry, cascade invalidation logic
│   └── useEntityCRUD.ts      Unified list+detail+edit+create, dirty tracking
│
└── ui/
    ├── columns.tsx           Column builders (text, number, date, enum, actions)
    ├── EntityTable.tsx       Full table with inline editing, pagination
    ├── EntitySheets.tsx      EntityDetailSheet, EntityFormSheet
    └── utils.ts              cn() utility

examples/
├── vite-app/                 React 19 + Vite 6, full CRUD demo
│   └── src/
│       ├── schema/           Project/Task/User relation registration
│       ├── mock/             In-memory API with realistic latency
│       └── pages/            Dashboard, Projects, Tasks, Team
│
└── nextjs-app/               Next.js 15, SSR hydration demo
    └── src/
        ├── app/              Server Components + API routes
        └── components/       GraphHydrationProvider (SSR → graph pattern)
```

## Important Constraints

- **Tests**: The library includes Vitest smoke tests (`pnpm run test`). Expand coverage for risky changes; example apps remain useful for manual verification.
- **DevTools**: `useGraphDevTools` is available for lightweight graph inspection. For ad-hoc debugging you can also use `useGraphStore.getState()`.
- **Garbage collection**: Configurable via `configureEngine` (`defaultGcTime`, `gcInterval`) and `startGarbageCollector` / `stopGarbageCollector`. Entities with no subscribers can be evicted after `defaultGcTime`.
- **Suspense**: `useSuspenseEntity` and `useSuspenseEntityList` are implemented for Suspense boundaries (non-null entity id required where applicable).
- **Skills ↔ code sync (immutable)**: Any change to public exports in `src/index.ts` or to architecture rules here must update `prometheus-entity-skills/_shared/references/library-exports.json` (run `pnpm run refresh:exports`) and related skill docs so `pnpm run verify:skills` passes in CI. PR checklist: `.github/pull_request_template.md`.

## Where to Start When Reading Code

1. **Understanding the core**: Read `src/graph.ts` (Zustand store structure) → `src/engine.ts` (fetch machinery) → `src/hooks.ts` (how components use the graph)
2. **Understanding realtime**: Read `src/adapters/types.ts` (ChangeSet contract) → `src/adapters/realtime-manager.ts` (coalescing logic)
3. **Understanding filtering/sorting**: Read `src/view/types.ts` (FilterSpec) → `src/view/evaluator.ts` (local engine) → `src/view/useEntityView.ts` (completeness modes)
4. **Understanding CRUD**: Read `src/crud/relations.ts` (schemas) → `src/crud/useEntityCRUD.ts` (lifecycle management)
5. **Understanding SSR**: Read `examples/nextjs-app/src/components/GraphHydrationProvider.tsx` (SSR → graph pattern)

## v1.3 — Upstream features (Change 13)

| API | File | Plan item |
|-----|------|-----------|
| `createPGlitePersistenceAdapter` | `src/adapters/pglite-persistence.ts` | 13.1 |
| `createTenantScopedElectricAdapter` | `src/adapters/electricsql-tenant.ts` | 13.2 — also fulfils **13.11** (auth-claim-aware shape registration): the `tenantClaim: { companyId }` is the typed seam where authn meets shape registration. Refusing unscoped shapes is the runtime enforcement of RULE 5. |
| `registerEntityFromSql` | `src/schema-from-sql.ts` | 13.3 |
| `startLocalFirstGraph({ retryPolicy })` + `replayActionWithRetry` | `src/local-first-runtime.ts` | 13.6 |
| `useEntityListAsTable` | `src/table/use-entity-list-as-table.ts` | 13.7 |

Items 13.4, 13.5, 13.8, 13.9, 13.10 are deferred to a follow-up release.

## Dependencies

Core library (`src/`) only requires:
- `zustand` (entity graph store foundation)
- `immer` (immutable mutations)

Examples use `@tanstack/react-table` (optional in library users), `@tanstack/react-router` (Vite example routing), and various UI libraries.
