# Design: v3-docs-concepts-packages

## Approach

Implement this as the independent vertical slice defined by the matching phase-plan section. Treat its listed dependencies as hard entry gates and its acceptance criteria as the archive boundary.

## Constraints

- Preserve the repository architecture and package-manager rules.
- Prefer packed/public-artifact evidence over local source aliases.
- Record new decisions or gaps instead of weakening an acceptance criterion.

## Implementation decisions (2026-08-22)

- **D-1 · Information architecture.** One new sidebar (`guidesSidebar`) with four categories: Quickstart (progressive React 19 path), Concepts (14 guides: normalized entities, ID-only lists, queries-as-instructions, layers/dataflow, graph-patches-lists, engine/SWR/GC/Suspense, views, CRUD/relations, realtime batching, GraphQL/REST, sync/persistence, SDL/codegen, DevTools), Bindings (8 guides: React, Svelte, Solid, Alpine, HTMX, Web Components, Flutter, Tauri), and Practices (recipes, failure modes, performance, security, package-selection decision guide). All are hand-authored, committed pages under `site/docs/guides/` — no generated content in this change.
- **D-2 · Capability coverage map.** `site/capability-map.json` is the committed, curated list of stable public capabilities; each entry maps to `{ concept, api, example }` routes. The release test asserts every referenced route exists (page file or generated API route) and that every guides page is sidebar-reachable (no orphans).
- **D-3 · Docs snippet compilation.** `scripts/verify-skills-snippets.mjs` is parameterized (`--root`, `--ext`, `--skip <regex>`) with byte-identical default behavior for the skills pack. The docs pass compiles every ```ts/```tsx fence in hand-authored site docs against packed tarballs of all 12 npm packages in a temp consumer; generated pages (API signatures, chooser tables) are excluded via `--skip` because their fences are type signatures, not modules. Binding guides tag framework-specific non-TS code with its real language fence (```svelte), which the extractor does not claim to compile.
- **D-4 · Language consistency gate.** The release test scans guides for the AGENTS.md data-flow rules and fails on prose prescribing hooks calling fetch/APIs directly (same scan class as the skills change), and on install instructions using `file:`/`link:`/`workspace:` aliases.
- **D-5 · Verification.** `scripts/verify-docs-concepts.mjs` lanes: (1) snippet-compile (docs pass, packed consumer), (2) capability-map + language release test, (3) static build with the guides sidebar. Root scripts: `verify:docs-snippets`, `verify:docs-concepts`, `test:v3-docs-concepts-packages`, `bdd:docs-concepts-packages`.

