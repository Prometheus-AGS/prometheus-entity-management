# Design: v3-docs-api-reference

## Candidate reuse decisions

### cand-022 — TypeDoc packages-mode API model

- **Verdict:** adapt
- **Decision:** Use TypeDoc as the authoritative export-derived API model; adapt its output into Docusaurus only after a small proof confirms stable routes and source links.
- **Evidence:**
  - Tier 1: TypeDoc packages mode converts package entry points independently and merges them into one API model. (https://typedoc.org/documents/Options.Package_Options.html)
  - Tier 1: TypeDoc can discover package entry points from exports and supports explicit package-level entry point configuration. (https://typedoc.org/documents/Options.Input.html)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

## Implementation decisions (2026-08-22)

- **D-1 · TypeDoc driver (adapted from packages-mode).** `scripts/generate-api-reference.mjs` runs TypeDoc 0.28.20 (site devDependency; peer range confirms TypeScript 6.0.x support) once per publishable npm package — 12 runs with explicit `--entryPoints <pkg>/src/index.ts` plus secondary entries (`a2ui-react` → `src/ag-ui.ts`, `entity-graph-a2a` → `src/legacy.ts`) — emitting one JSON model per package into a temp dir, then merging them into a single deterministic route tree. This adapts TypeDoc's packages strategy into a driver loop: identical per-package conversion semantics, no `typedoc` metadata sprawl in 12 publishable manifests. A proof run on `entity-graph-core` confirmed the JSON model shape and caught one real ledger-vs-model drift (see D-3).
- **D-2 · Route tree.** One MDX page per package at `site/docs/api/npm/<slug>/index.mdx` containing: install command, peer/runtime matrix (from `package.json`), stability badge (`3.0 RC`), tarball metadata, and every stable export as a deterministic anchor (`#<symbol-name>`) with its TypeDoc signature, doc comment, and source link (`github.com/.../blob/main/packages/<dir>/src/<file>#L<line>`). One page per package keeps routes stable and the build fast; anchors give per-symbol addressability under the Pages base path (all links are relative). Generated docs land in `site/docs/api/` and `site/api-sidebar.generated.json` — both git-ignored, regenerated at `prebuild` so routes are deterministic from source.
- **D-3 · Doc-coverage policy (ratchet).** Stable exports = the 13 export ledgers from `v3-skills-ecosystem`. The generator FAILS when: (a) a ledger export is absent from the TypeDoc/Dart model (vanished export); (b) a ledger export NOT in `site/api-docs-baseline.json` lacks a doc comment (new undocumented export); (c) a baseline entry has become documented (baseline must shrink — ratchet can only tighten). Measured baseline at introduction: 115/123 core exports undocumented (similar ratios elsewhere) — full doc-comment coverage is tracked as follow-up, and the baseline makes any regression a hard failure. The proof already caught one drift: `__resetStoreRegistry` carried a stale `@internal` tag ("NOT re-exported from index.ts") while being re-exported; the tag was removed and a proper doc comment added so the model and ledger agree.
- **D-4 · Dart/Rust artifacts, no duplication.** `dart doc` for `entity_graph_flutter` and `cargo doc --no-deps` for `entity-graph-cli`/`entity-graph-mcp` are generated into `site/static/api/dart/` and `site/static/api/rust/<crate>/` (git-ignored, regenerated at prebuild). Curated Docusaurus pages `docs/api/dart.mdx` and `docs/api/rust.mdx` link into those artifacts and summarize the entry points without copying canonical dartdoc/rustdoc content.
- **D-5 · Package chooser.** The generator also emits `site/docs/packages/<slug>.mdx` chooser pages (install command, peer/runtime matrix, stability badge, dist tarball file/size metadata) plus keeps `docs/packages/overview` as the hand-written index; the API index page asserts every declared artifact — 12 npm + 1 Dart + 2 Rust — appears exactly once. Symbol→concept cross-links come from a small committed map (`site/api-cross-links.json`); package pages always cross-link to the conceptual guides.
- **D-6 · Verification.** `scripts/verify-docs-api-reference.mjs` lanes: (1) `generate` — full regeneration incl. policy enforcement; (2) `dart-rust-artifacts` — dartdoc/rustdoc output exists with index pages; (3) `static-build` — clean `docusaurus build` asserting API routes exist under the Pages base path and the package index lists each artifact exactly once. Release test + BDD follow the `v3-docs-foundation-brand` precedent. Root scripts: `docs:generate-api`, `verify:docs-api-reference`, `test:v3-docs-api-reference`, `bdd:docs-api-reference`.

