# Verification: v3-skills-ecosystem

**Date:** 2026-08-22
**Evidence boundary:** packed-consumer for the snippet lane (`countsAsPackedPackageEvidence: true` there); built-dist for ledger lanes
**Verifier:** `pnpm run verify:skills-ecosystem` →
`scripts/verify-skills-ecosystem.mjs` → `verification.json` (result: **pass**, 4/4 lanes)

## Acceptance matrix (plan section 20)

| Acceptance criterion | Evidence | Status |
|---|---|---|
| Package-specific export/type/signature ledgers validate | New registry-driven ledgers for core/svelte/solid/alpine/htmx/web-components/sdl join the existing react/sync/a2ui/a2a/tauri/dart ledgers. `pnpm run verify:skills` validates all twelve public npm packages + Dart against built dists. Signature-level validation: every documented API is exercised by the snippet compile against packed `.d.ts` types. | pass |
| Every public snippet compiles against packed packages | `scripts/verify-skills-snippets.mjs`: 19 snippets from 15 docs compiled in a temp consumer with packed tarballs (core, react, sync, a2a, a2ui) + public peers (react 19.2.8, @types/react, @tanstack/react-table, loro-crdt, typescript 6.0.2). Result: OK on first harness run after snippet fixes. | pass |
| Referenced paths exist | Release test scans every skills-pack markdown for backticked repo-relative and plugin-relative paths (placeholders `<...>` and globs handled): zero missing. | pass |
| At least one consumer fixture or requested example backs each supported binding/integration claim | `ecosystem-claims.json` maps 18 claims → evidence paths + gates; release test asserts every path exists and every gate resolves to a root script or explicit command. Bindings are backed by the packed six-binding singleton contract; integrations by their certified examples/verifiers. | pass |
| Replace React-v2-centric skill map | `SKILLS.md` now opens with a package-selection table for all 12 npm packages + Dart + 2 Rust crates; new references `package-selection.md`, `framework-bindings.md`, `sdl-and-rust-tooling.md`, `examples-gallery.md`; Flint guidance indexed via `docs/flint-integration.md`. | pass |
| Correct data-flow language | `SKILLS.md` architecture summary now states "hooks orchestrate store methods; stores/adapters own all I/O"; fixed observed violation in `entity-graph-prisma/CLAUDE.md` ("Components → Hooks → (fetch)"); release test scans for prohibited phrasings. | pass |

## Gates run (all green)

| Gate | Result |
|---|---|
| `pnpm run verify:skills-ecosystem` (ledgers, snippets, release gate, Rust CLI+MCP cargo tests) | pass |
| `pnpm run verify:skills` | 12 npm + Dart ledgers OK |
| `node scripts/verify-skills-snippets.mjs` | 19/19 snippets compile (packed consumer) |
| release test `node --test tests/release/v3-skills-ecosystem.test.mjs` | 7/7 pass |
| BDD `pnpm run bdd:skills-ecosystem` | 3 scenarios / 12 steps pass |
| `pnpm run typecheck` | 23/23 |
| `pnpm run validate` | errors: [] |
| `pnpm run verify:example-coverage` | errors: [] |
| eslint on new/changed scripts + steps | clean |
| `openspec validate v3-skills-ecosystem --strict` | valid |
| Regression: `tests/release/v3-flint-portable-contracts.test.mjs` | 6/6 pass |

## Defects found and fixed during this change

1. **Stale v2 API in `entity-realtime-surreal-live/SKILL.md`** — snippets taught
   nonexistent options (`db`→now `surreal`, `checkpointResume`→`checkpointStore`+
   `checkpointField`, `registerAdapter` removed in favor of
   `getRealtimeManager().register`, `where`/`normalize` dropped from
   `SurrealTableConfig`, generic param removed). Snippets and surrounding prose
   rewritten against the real adapter contract; tenant scoping moved to the
   connection layer; row-shape mapping moved to `register`'s `normalize`.
2. **Non-compiling fragments across the pack** — 14 snippets referenced
   undeclared identifiers or were bare expressions/JSX; all made self-contained
   with real imports, `import type` for erased types, `declare const` for
   app-owned values, and typed function wrappers.
3. **Wrong data-flow arrow** — `entity-graph-prisma/CLAUDE.md` placed `fetch`
   directly in the hook layer; corrected to stores/engine fetchers.
4. **Hypothetical doc path** — `docs/entity-graph.md` referenced as a
   suggestion; de-backticked so the path scanner treats it as prose.
5. **Plugin-relative and placeholder paths** — scanner initially
   false-positive'd plugin-local `scripts/*.sh` references and `<name>`
   placeholders; scanner now resolves against ancestors and skips placeholders.

## Retained limits

- The official agentskills.io `skills-ref` validator is not vendored; external
  marketplace packaging validation remains a manual pre-submission step.
- Rust CLI/MCP evidence is cargo-test level; the crates are not published and
  no packed-crate evidence exists.
- The snippet harness type-checks with `skipLibCheck: true` (consumer-standard);
  it validates snippet↔public-API agreement, not the packages' internal types.
