# Verification: v3-docs-examples-integrations

**Date:** 2026-08-22
**Verifier:** `scripts/verify-docs-examples.mjs` (4 lanes) → `evidence/v3-docs-examples-integrations/verification.json` — **PASS**

## Acceptance matrix

| Plan acceptance criterion | Evidence | Result |
| ------------------------- | -------- | ------ |
| Each requested example has a start-to-finish path and full feature matrix | 5 tutorials (`site/docs/examples/<slug>.mdx`) with the enforced section contract: Architecture / Setup / Feature scenarios / Test commands / Deployment & platform notes / Troubleshooting. Feature matrices annotate shared coverage scenario IDs, validated against `examples/shared/scenario-contract.json` (unknown IDs fail the release test) | PASS |
| Commands are exercised in CI | Release test asserts every tutorial's `verify:*` gate exists as a root script and that `ci.yml` runs the `ci:test` gate covering the release suite; example suites run under `ci:build`/`ci:test`, Tauri plugin lane in `tauri-plugin-platform.yml` | PASS |
| Screenshots/diagrams have alt text | Alt-text scan over examples/integrations docs (no bare `![](...)`) | PASS |
| External-service sections separate deterministic demo mode from live credentials | All 6 integration guides carry the demo/live split; release test asserts the markers. Supabase: anon-key-only + RLS as the boundary. Flint: fixture-backed default CI, env-gated live lane, auth in flint-gate. A2A/A2UI: in-page keyless agent; HTTPS/loopback-only external endpoints | PASS |
| Verified links to runnable source and coverage scenario IDs | Tutorials link `examples/<dir>` on GitHub; the release test asserts the directories exist and are runnable (`package.json`/`pubspec.yaml`) | PASS |

## Content delivered

- **Tutorials (5):** vite-react19, nextjs-app-router, agentic-a2ui, flutter-riverpod, tauri-universal — each grounded in its owning change's certified evidence boundary (no publication-authority overclaiming; Flutter retains its compile-level-only limit, Tauri lists its receipts).
- **Integrations (6):** websocket, supabase, graphql, pglite-loro, a2a-a2ui, flint — adapter snippets compile against the packed core package.
- **Wiring:** `examplesSidebar` gains Tutorials + Integrations categories; `examples/overview.md` links each tutorial and the integration set.
- **Gates:** `verify:docs-examples` (4 lanes), release test 10/10, BDD 3/13.

## Defects found and fixed during implementation

1. **Supabase client type mismatch** — the real `SupabaseClient` channel API is
   broader than the adapter's deliberately minimal structural type; the snippet
   adapts once at the boundary with an explained cast. Added
   `@supabase/supabase-js` to the consumer deps so the guide compiles against
   the real package.
2. **GraphQL subscription config drift** — first draft used `{ query }`; the
   real `GQLSubscriptionConfig` is `{ type, document, getPayload }`. Rewritten
   to the verified shape.

## Gates run (this session, all green)

- `pnpm run verify:docs-examples` — 4 lanes PASS (snippet-compile 45/27 docs,
  release-gate, static-build, example-routes)
- `pnpm run test:v3-docs-examples-integrations` — 10/10
- `pnpm run bdd:docs-examples-integrations` — 3 scenarios / 13 steps
- Regression: docs-concepts 8/8, foundation 10/10, api-reference 10/10,
  typecheck 23/23, validate errors [], eslint clean, openspec `--strict` valid

## Retained limits

- **Commands exercised in CI** is satisfied via the shared `ci:test`/`ci:build`
  gates and the per-change certification verifiers; there is no dedicated
  per-example CI workflow for the four web examples (the Tauri plugin lane is
  the exception). Adding per-example workflows is CI capacity work, not a docs
  defect.
- **No binary screenshots** ship in this change; the alt-text rule is enforced
  so future media additions are accessible by construction.
