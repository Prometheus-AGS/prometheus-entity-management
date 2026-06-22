EXECUTION: phase-v3-universal-platform-evolution
Project: @prometheus-ags/prometheus-entity-management
Date: 2026-06-22
Selected backend: openspec (driven task-by-task via /kbd-apply — never bare /opsx:apply)
Dispatched to: mixed — claude-code (self) for most; codex (parallel worktrees) eligible for isolated
   greenfield packages; specialist agents named per change (rust-reviewer, ai-engineer, etc.)
Backend rationale: openspec/ exists + the plan emitted an OpenSpec umbrella (v3-0-universal-platform-evolution)
   with 17 children. Spec-backed traceability is required across a large multi-package, multi-language
   evolution. Per the execute protocol, task execution routes through /kbd-apply.
Backend entrypoint: /kbd-apply v3-monorepo-and-tooling  (then per wave order)
OpenSpec available: YES
Source plan: .kbd-orchestrator/phases/phase-v3-universal-platform-evolution/plan.md

MODEL ROUTING NOTE
project.json has no model_policy block. Resolve model class → concrete model with current defaults:
frontier → Opus 4.8 · medium → Sonnet 4.6 · small → Haiku 4.5.

EXECUTION SCOPE (17 changes, 5 waves — see plan.md for full details)

Wave 1 — Foundation
- v3-monorepo-and-tooling — pnpm + Turborepo + Changesets + tsup presets
- v3-core-extraction — entity-graph-core (zero React) + entity-graph-react (re-export shim) [CRITICAL PATH]
- v3-sdl-spec — SDL schema + TS parser/IR [CRITICAL PATH, parallel]
- v3-electricsql-react-extract — move lone React import out of core
Wave 2 — React parity + first frameworks
- v3-react-parity · v3-svelte-bindings (canary) · v3-solid-bindings · v3-sync-providers (Yjs+Loro)
Wave 3 — Web breadth + Rust foundation
- v3-lit-webcomponents · v3-alpine-plugin · v3-htmx-server-adapter · v3-rust-cli
Wave 4 — Native + AI
- v3-mcp-server (rmcp) · v3-a2a-server · v3-tauri-plugin (tauri-specta) · v3-flutter-package (Riverpod 3)
Wave 5 — A2UI
- v3-a2ui-react

DISPATCH CONTRACTS (model class + agent per change)

WAVE 1
- v3-monorepo-and-tooling → claude-code | frontier/Opus 4.8 | agent: architect→code-architect
  Entry: /kbd-apply v3-monorepo-and-tooling
  Rationale: repo-wide tooling decision; gets caching/publish pipeline right once.
- v3-core-extraction → claude-code | frontier/Opus 4.8 | agent: architect→code-architect
  Entry: /kbd-apply v3-core-extraction
  Rationale: the breaking unlock; re-export shim correctness is load-bearing for every consumer.
  Depends on: v3-monorepo-and-tooling
- v3-sdl-spec → claude-code | frontier/Opus 4.8 | agent: architect
  Entry: /kbd-apply v3-sdl-spec   Depends on: v3-monorepo-and-tooling
- v3-electricsql-react-extract → claude-code | small/Haiku 4.5 | agent: build-error-resolver
  Entry: /kbd-apply v3-electricsql-react-extract   Depends on: v3-core-extraction

WAVE 2 (all depend on v3-core-extraction)
- v3-react-parity → claude-code | frontier/Opus 4.8 | code-architect + tdd-guide
- v3-svelte-bindings → claude-code | frontier/Opus 4.8 | code-architect + tdd-guide  (CANARY)
- v3-solid-bindings → codex(worktree)/claude-code | medium/Sonnet 4.6 | code-architect + tdd-guide
- v3-sync-providers → claude-code | frontier/Opus 4.8 | architect→code-architect (CRDT)

WAVE 3
- v3-lit-webcomponents → claude-code | medium/Sonnet 4.6 | code-architect + a11y-architect  (← svelte pattern)
- v3-alpine-plugin → codex/opencode | small/Haiku 4.5 | code-architect
- v3-htmx-server-adapter → claude-code | medium/Sonnet 4.6 | code-architect  (← sdl)
- v3-rust-cli → claude-code | frontier/Opus 4.8 | rust-reviewer + code-architect (rust-build-resolver on fail)  (← sdl)

WAVE 4
- v3-mcp-server → claude-code | frontier/Opus 4.8 | ai-engineer + rust-reviewer  (← rust-cli; skill: mcp-server, rmcp 0.16)
- v3-a2a-server → claude-code | frontier/Opus 4.8 | ai-engineer + code-architect  (← rust-cli)
- v3-tauri-plugin → claude-code | frontier/Opus 4.8 | code-architect + rust-reviewer (tauri-specta v2)  (← core+cli)
- v3-flutter-package → claude-code | frontier/Opus 4.8 | code-architect (Riverpod 3 + Freezed)  (← core+sdl)

WAVE 5
- v3-a2ui-react → claude-code | frontier/Opus 4.8 | code-architect + ui-ux-designer + ai-engineer  (← react-parity + mcp + AG-UI bridge)

EXECUTION ROUND ORDER
Wave 1 → Wave 2 → Wave 3 → Wave 4 → Wave 5 (within each wave, items run in parallel where deps allow).
Two long chains run concurrently: FRAMEWORK (core→svelte/react→lit) and SDL→RUST (sdl→cli→mcp/a2a).

APPROVAL GATES (must clear before /kbd-apply writes code)
- BRANCH GATE: cut feat/v3-universal-platform-evolution off main before any apply. v3 is large + breaking.
- BREAKING-CHANGE GATE (v3-core-extraction): this is a monorepo restructure → semver MAJOR (3.0.0). The
  published @prometheus-ags/prometheus-entity-management MUST remain a working re-export shim; verify
  consumer import paths before release. Do NOT publish 3.0.0 until both core + react packages are stable.
- GREENFIELD-LANGUAGE GATE: v3-rust-cli, v3-mcp-server, v3-a2a-server, v3-tauri-plugin add Rust crates;
  v3-flutter-package adds Dart. These need their own toolchains (cargo, dart/flutter) present in the
  apply environment — confirm before dispatching, else mark BLOCKED with the missing-toolchain reason.
- TURBOREPO-NOW GATE: plan recommends adopting Turborepo in Wave 1 — confirm with operator (reversible).
- RELEASE-SHIM GATE: confirm v3.0.0 ships as the re-export shim (open question from plan handoff).

FALLBACK CONDITIONS
- If /kbd-apply cannot drive a change task-by-task with inspectable progress → stay on openspec, execute
  manually, document why.
- If a greenfield toolchain (cargo/flutter) is absent → mark that change BLOCKED (not failed); continue
  with the TS/JS waves that don't need it. The framework chain (Waves 1–3 minus rust-cli) is fully
  achievable in a pure-Node environment; the Rust/Dart chain is gated on toolchains.
- If a parallel tool (codex) can't keep scope bounded → reassign to claude-code (self).

VERIFICATION REQUIREMENTS
- Per TS/JS change: pnpm typecheck + pnpm test (per package via Turborepo).
- Export-touching changes: refresh:exports + verify:skills (skills↔exports immutable gate).
- Rust crates: cargo build + cargo test + clippy -D warnings (≤500-line files).
- Flutter: dart analyze + flutter test + build_runner (Freezed/Riverpod codegen).
- Cross-package: turbo run build test lint typecheck (cached).
- Pre-release per package: Changesets version + publish dry-run.

PER-CHANGE QA GATE (artifact-refiner)
After each change → DONE: /refine-validate "<change-id>" before archive. Skip when <3 files or docs-only.

PROGRESS LEDGER (initial — all PENDING)
[PENDING] v3-monorepo-and-tooling · v3-core-extraction · v3-sdl-spec · v3-electricsql-react-extract
[PENDING] v3-react-parity · v3-svelte-bindings · v3-solid-bindings · v3-sync-providers
[PENDING] v3-lit-webcomponents · v3-alpine-plugin · v3-htmx-server-adapter · v3-rust-cli
[PENDING] v3-mcp-server · v3-a2a-server · v3-tauri-plugin · v3-flutter-package
[PENDING] v3-a2ui-react

OUTPUTS
- A pnpm+Turborepo monorepo with ~12 publishable packages + Rust crate(s) + a Dart package.
- entity-graph-core/react split; 5 web framework bindings; Yjs/Loro sync; Rust CLI + MCP + A2A;
  Tauri plugin; Flutter package; A2UI React library.

BLOCKERS (anticipated)
- Greenfield Rust/Dart toolchains may be absent in the apply environment (see GREENFIELD-LANGUAGE GATE).
- v3.0.0 breaking restructure requires the release-shim decision confirmed.

REFLECTION HANDOFF
- kbd-reflect should consume: per-change DONE/BLOCKED; whether the core re-export shim held consumers
  harmless; CRDT default-on benchmark result (Yjs vs Loro at 10k); which greenfield targets shipped vs
  were toolchain-blocked; and the per-package Changesets version state.

EXECUTION READY
