# Verification: v3-docs-api-reference

**Date:** 2026-08-22
**Verifier:** `scripts/verify-docs-api-reference.mjs` (4 lanes) → `evidence/v3-docs-api-reference/verification.json` — **PASS**

## Acceptance matrix

| Plan acceptance criterion | Evidence | Result |
| ------------------------- | -------- | ------ |
| API generator fails on undocumented or vanished stable exports according to policy | Policy in `scripts/generate-api-reference.mjs` + `site/api-docs-baseline.json`: vanished exports fail (ledger export absent from TypeDoc/dartdoc model); newly undocumented exports fail; baseline shrinkage is mandatory (ratchet). Lane 1 (`generate`) enforces on every run | PASS |
| Routes are deterministic under the GitHub Pages base path | All generated links are relative; artifact links use `useBaseUrl()`; `static-build` lane builds with default `baseUrl=/prometheus-entity-management/` and passes broken-link throw; generated docs/sidebar are regenerated at `prebuild` from source | PASS |
| All declared npm/Dart/Rust artifacts appear exactly once in the package index | `packageIndex` lane + release test: 12 npm + `entity_graph_flutter` + `entity-graph-cli` + `entity-graph-mcp` each occur exactly once in generated `docs/api/index.mdx` | PASS |

## Plan detail coverage

| Detail | Where |
| ------ | ----- |
| TypeDoc packages-mode-derived API model from the 12 package exports | TypeDoc 0.28.20 (peer range confirms TS 6.0.x), one run per package, explicit entry points incl. secondary (`a2ui-react/src/ag-ui`, `entity-graph-a2a/src/legacy`); design D-1 records the driver-loop adaptation |
| Source links | Every symbol renders a canonical `github.com/.../blob/main/<file>#L<line>` link from TypeDoc `sources` |
| Curated Dart/Rust entry pages, no canonical-doc duplication | `site/docs/api/dart.mdx` + `site/docs/api/rust.mdx` (hand-written, committed) summarize entry points and link to generated artifacts; dartdoc/rustdoc HTML lives under `site/static/api/` (git-ignored, regenerated) |
| Package chooser pages | `site/docs/packages/<slug>.mdx` ×12: install command, peer/runtime matrix, stability badge, published-file count/size |
| Stability badges | `3.0 RC` / `3.0 Prerelease` / `Stable` derived from package version |
| Bundle/tarball information | Chooser runtime matrix lists published files + KiB from `package.json#files` |
| Symbol→concept cross-links | `site/api-cross-links.json` committed map; release test validates targets exist |

## Documentation coverage measured (generation.json)

566 npm stable exports across 12 packages; 357 documented, 209 in the
enforced baseline (core 47, react 119, a2ui 16, a2a 12, tauri 10,
web-components 3, solid 1, sdl 1; sync/svelte/alpine/htmx fully documented).
Dart: 81 declarations all present in the dartdoc index. The ratchet makes any
regression a hard failure; shrinking the baseline is forced whenever a symbol
gains a doc comment.

## Defects found and fixed during implementation

1. **`__resetStoreRegistry` stale `@internal`** (entity-graph-core) — tagged
   `@internal`/“NOT re-exported” while publicly re-exported and ledger-listed;
   vanished from the TypeDoc model. Fixed the doc comment; policy caught it on
   the first run.
2. **`createEntityBinding` / `createListBinding` stale `@internal`**
   (entity-graph-alpine) — same drift class; tags removed (usage note kept as
   prose). Both now documented and present in the model.
3. **YAML front-matter parse failures** — unquoted generated `description:`
   values with colons/em-dashes. Fixed with a `yamlQuote()` helper.
4. **Broken-link checker false positives on static artifacts** — dartdoc /
   rustdoc HTML live outside the route graph; markdown links to them always
   read as broken. Fixed with `useBaseUrl()` JSX anchors (base-path-aware,
   runtime-resolved); verifier asserts the built artifacts exist instead.
5. **Ledger shape variance** — plain lists (most), entry-point-keyed maps
   (a2a/a2ui), runtime/declaration split (tauri), object-with-exports (Dart).
   Added `ledgerNames()` normalizer + dedupe.
6. **Cucumber `/` alternation** — the BDD step text `peer/runtime` needed an
   escaped slash (`peer\\/runtime`).

## Gates run (this session, all green)

- `pnpm run verify:docs-api-reference` — 4 lanes PASS (generate incl. policy,
  static-build, api-routes incl. static artifacts, package-index)
- `pnpm run test:v3-docs-api-reference` — 10/10 (self-regenerates on fresh checkout)
- `pnpm run bdd:docs-api-reference` — 3 scenarios / 14 steps
- Regression: `test:v3-docs-foundation-brand` 10/10, typecheck 23/23,
  validate errors [], eslint clean, openspec `--strict` valid
- Targeted package tests after source comment fixes: core devtools-event-bus
  24/24, alpine 16/16

## Retained limits

- **Dart undocumented coverage:** dartdoc `index.json` carries no comment
  signal; the Dart lane enforces declaration presence only. Recorded in
  `verification.json` → `limits.dartCoverage`.
- **Rust symbol policy:** rustdoc lanes assert artifact existence + index
  pages; symbol-level ratchet applies to npm ledgers only.
- **Baseline debt:** 209 undocumented stable exports ship under the ratchet;
  closing this is content work for `v3-docs-concepts-packages` and beyond,
  not a foundation defect.
