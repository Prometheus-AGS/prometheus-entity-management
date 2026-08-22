# Verification: v3-docs-concepts-packages

**Date:** 2026-08-22
**Verifier:** `scripts/verify-docs-concepts.mjs` (4 lanes) → `evidence/v3-docs-concepts-packages/verification.json` — **PASS**

## Acceptance matrix

| Plan acceptance criterion | Evidence | Result |
| ------------------------- | -------- | ------ |
| Every stable capability has a concept guide reachable from the docs sidebar | `site/capability-map.json` (26 capabilities) maps each stable capability to concept + API + example routes; release test asserts every route has a source page and every one of the 27 guide pages is referenced by a capability (no orphans) and appears in `guidesSidebar` | PASS |
| Docs snippets compile against the packed packages | `snippet-compile` lane: 40 ts/tsx fences from 22 docs compile in a temp consumer project against all 12 packed npm tarballs (`--all-packages`); `pnpm.overrides` pins internal deps to the tarballs so nothing resolves from the registry | PASS |
| Guides teach the architecture rules (no data-flow violations) | Language gate in `tests/release/v3-docs-concepts-packages.test.mjs`: prohibition-aware line scan rejects "hooks call the API"-style prescriptions and `Hooks → fetch` diagrams across all guide pages | PASS |
| Install instructions use pnpm from the registry only | Bash-fence scan fails on `npm install`/`yarn add` and on `pnpm add` with `file:`/`link:`/`workspace:` protocols; prose prohibitions remain allowed | PASS |

## Content delivered

- **Quickstart** (1): `guides/quickstart-react` — install → query → list → CRUD in five steps.
- **Concepts** (13): normalized entities, ID-only lists, queries-as-instructions, layers/dataflow, graph-patches-lists, engine/SWR/GC/Suspense, views/filtering, CRUD/relations, realtime batching, GraphQL/REST, sync/persistence, SDL/codegen, DevTools.
- **Bindings** (8): React, Svelte, Solid, Alpine, HTMX, Web Components, Flutter, Tauri — each with a registry `pnpm add` block and a compiling snippet against the real package surface.
- **Practices** (5): recipes, failure modes, performance, security, package-selection decision guide.
- **Wiring:** `guidesSidebar` in `site/sidebars.js` (static, committed pages), "Guides" navbar item, root scripts `verify:docs-snippets` / `verify:docs-concepts` / `test:v3-docs-concepts-packages` / `bdd:docs-concepts-packages`.

## Defects found and fixed during implementation

1. **Packed-consumer install failure** (`verify-skills-snippets.mjs`) — packed tarballs rewrite `workspace:*`/`workspace:^` to registry ranges (`3.0.0-rc.1` / `^3.0.0-rc.1`); pnpm resolved a transitive internal dep from the registry and failed on the unpublished version. Fixed with `pnpm.overrides` mapping every packed package to its tarball in the consumer manifest.
2. **Wrong hook result fields in pre-existing pages** — quickstart used `entity`/`entities`; the real fields are `data`/`items`. Fixed; the snippet gate caught both.
3. **`loadMore` does not exist on React list results** — the React hook exposes `fetchNextPage`; `loadMore` is the Svelte/Solid/Alpine surface. Fixed in the React guide and recipes prose.
4. **`renderFragment` is async** — HTMX snippet now awaits and null-guards.
5. **`readRelations` arity** — the export takes `(type, entity)`; schema lookup is registry-driven. Fixed the CRUD guide snippet.
6. **Solid JSX vs project `jsx: react-jsx`** — per-file `/** @jsxImportSource solid-js */` pragma in the two Solid snippets.
7. **Alpine plugin typing** — `@types/alpinejs` magic-callback types differ from the plugin's structural `AlpineInstance`; the registration snippet adapts with an explicit cast and an explanatory comment. Also added `@types/alpinejs` to the consumer deps (alpinejs ships no types).
8. **Web Components element API** — elements configure via `configure(opts)`, not attributes; corrected the HTML example.
9. **Tauri top-level await** — non-module snippet gained `export {}`.
10. **Broken link** — `id-only-lists` pointed at `/docs/guides/recipes`; fixed to `/docs/guides/practices/recipes` (caught by the static-build lane's broken-link throw).

## Gates run (this session, all green)

- `pnpm run verify:docs-concepts` — 4 lanes PASS (snippet-compile, release-gate, static-build, guide-routes)
- `pnpm run test:v3-docs-concepts-packages` — 8/8 (self-regenerates generated API pages on fresh checkout)
- `pnpm run bdd:docs-concepts-packages` — 3 scenarios / 13 steps
- Regression: `test:v3-docs-foundation-brand` and `test:v3-docs-api-reference` green (sidebar/config changed); skills snippet default run still 19/15; typecheck 23/23; validate errors []; eslint clean on new/changed scripts and tests; `openspec validate v3-docs-concepts-packages --strict` valid

## Retained limits

- **Generated signature pages are excluded from snippet compilation** (`--skip` on `site/docs/api/npm/`, `api/index.mdx`, chooser pages): their fences are TypeDoc signature excerpts, not runnable programs. Hand-written pages (`api/dart.mdx`, `api/rust.mdx`, `packages/overview.md`) carry no ts fences, so nothing compilable is skipped.
- **Guide depth varies by surface maturity** — Flutter/Tauri guides cover bootstrap and one flow; deeper platform recipes remain follow-up content work, not a gate failure.
