# Design: v3-docs-examples-integrations

## Approach

Five dedicated example tutorials plus six integration guides, all
hand-authored committed pages, verified by a release test that treats the
docs as a contract: required sections, valid coverage-scenario IDs, existing
verify commands, existing runnable-source paths, alt text on media, and
explicit demo-vs-live separation for external services.

## Decisions

- **D-1 · Information architecture.** `examplesSidebar` gains two categories:
  **Tutorials** (`site/docs/examples/<slug>.mdx` × 5: vite-react19,
  nextjs-app-router, agentic-a2ui, flutter-riverpod, tauri-universal) and
  **Integrations** (`site/docs/integrations/<slug>.mdx` × 6: flint, supabase,
  websocket, graphql, pglite-loro, a2a-a2ui). `examples/overview.md` stays the
  gallery index and links the tutorials. No generated content in this change.
- **D-2 · Tutorial content contract.** Every tutorial carries, in order:
  front matter (title/description), Architecture, Setup, Feature scenarios
  (annotated with scenario IDs from `examples/shared/scenario-contract.json`),
  Test commands (the example's `verify:*` gate), Deployment/platform notes,
  Troubleshooting. Claims about what the example proves mirror the owning
  change's evidence boundary — no overclaiming publication authority.
- **D-3 · Integration content contract.** Every integration guide separates a
  **deterministic demo mode** (keyless, fixture-backed, CI-safe) from **live
  credentials** (env-gated, operator-supplied), names its adapter/package
  surface, and links the owning verify gate. Flint's auth boundary stays in
  flint-gate per the portable-contracts decision — docs describe, they do not
  reimplement.
- **D-4 · Media accessibility.** Markdown images require non-empty alt text
  (release-test scan); Mermaid diagrams carry a preceding caption sentence.
  No binary screenshots are added in this change.
- **D-5 · Verification wiring.** `scripts/verify-docs-examples.mjs` with
  lanes: snippet-compile (parameterized harness, all 12 packed packages),
  release-gate (`tests/release/v3-docs-examples-integrations.test.mjs`),
  static-build, example-routes (11 built HTML routes). Root scripts
  `verify:docs-examples`, `test:v3-docs-examples-integrations`,
  `bdd:docs-examples-integrations`. BDD: 3 scenarios at tag
  `@v3-docs-examples-integrations`.

## Constraints

- Preserve the repository architecture and package-manager rules.
- Prefer packed/public-artifact evidence over local source aliases.
- Record new decisions or gaps instead of weakening an acceptance criterion.
- ts/tsx snippets compile against packed packages; framework component code
  uses non-compiled fences (`svelte`, `dart`, `html`) where appropriate.
