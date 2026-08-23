# Verification: v3-docs-operations-migration

**Date:** 2026-08-23
**Verifier:** `scripts/verify-docs-operations.mjs` (5 lanes) → `evidence/v3-docs-operations-migration/verification.json` — **PASS**

## Acceptance matrix

| Plan acceptance criterion | Evidence | Result |
| ------------------------- | -------- | ------ |
| Migration fixtures compile and test | 6 raw `.ts/.tsx` fixtures under `tests/release/fixtures/upgrade/` type-check against the 12 packed npm packages via the snippet harness's new whole-file mode (`fixtures.json`: 6/6, pack/install/compile pass) | PASS |
| Every breaking change has before/after guidance | Release test asserts 5 canonical 2.x→3.0 and 9 alpha→stable breaking-change pairs (previous + current tokens) appear in the guides, with explicit `**Before**`/`**After**` markers and per-fixture cross-references | PASS |
| Release/rollback/partial-publish procedures match automation | Release test cross-checks the runbook against `publish.yml` (rehearse/stage commands, `npm-rc` environment) and root scripts (`release:rc:plan/rehearse/stage`), plus all 7 journal states, the immutability rule, and corrective-version recovery | PASS |
| Security pages explicitly cover tenant boundaries and secret handling | `operations/security.mdx` sections asserted: tenant boundaries (A2A/A2UI default-deny policies, SSR per-request isolation, Supabase anon-key + RLS, Flint flint-gate auth) and secret handling (client-safe keys only, no secrets in the graph, OIDC publishing, no long-lived npm tokens) | PASS |

## Content delivered

- **Migration (3):** `migration/v2-to-v3` (core store access, React hook import, SSR isolation, sync-status readers, presentation types), `migration/alpha-to-stable` (A2UI `./ag-ui` boundary, official A2A v1 map, binding peer policy, RC versioning), `migration/compatibility-policy` (fixed-group semver, current-plus-next-major deprecation, peer policy, channels).
- **Operations (10):** release-notes, release-runbook (mirrors `release/release-candidate-pipeline.md` + `publish.yml`), security, performance, testing, deployment, troubleshooting, faq, contributing, skills-usage.
- **Wiring:** new `operationsSidebar` (Migration + Operations categories) and an "Operations" navbar item.
- **Harness:** `scripts/verify-skills-snippets.mjs` gains whole-file mode — with `--ext .ts,.tsx` each raw source file is one snippet. This powers the upgrade-validation fixtures without touching the default fence behavior.
- **Gates:** `verify:docs-operations` (5 lanes), release test 12/12, BDD 3 scenarios / 14 steps.

## Defects found and fixed during implementation

1. **Broken cross-links** — `product/overview` and `packages/overview` are `.md`
   files, not `.mdx`; the static-build lane (broken links throw) caught both.
2. **Wrap-sensitive contract token** — "Row Level Security" was split across a
   line break in `security.mdx`, failing the exact-token assertion; rejoined.
3. **Guessed table UI signatures** — first fixture draft used a
   non-existent `actionsColumn(opts)` overload and `EmptyState title` prop;
   rewritten against the real `actionsColumn(ActionItem[])` and
   `EmptyStateConfig` shapes from the React package source before any gate ran.

## Gates run (this session, all green)

- `pnpm run verify:docs-operations` — 5 lanes PASS (snippet-compile 53 fences/30 docs, fixture-compile 6/6, release-gate, static-build, routes)
- `pnpm run test:v3-docs-operations-migration` — 12/12
- `pnpm run bdd:docs-operations-migration` — 3 scenarios / 14 steps
- Regression: docs-foundation 10/10, api-reference 10/10, docs-concepts 8/8, docs-examples 10/10, typecheck 23/23, validate errors [], eslint clean, openspec `--strict` valid

## Retained limits

- The runbook documents and cross-checks the RC pipeline but cannot prove
  external operator configuration (npm trusted-publisher setup, GitHub
  environment reviewers) — those remain human checks, as stated in the
  pipeline contract.
- The codemod recipes are manual recipes plus compilable after-state fixtures;
  no automated codemod binary ships in this change (the plan asks for
  "codemod/manual recipes" — the manual recipe + fixture pair is the delivered
  form, recorded here as the scope decision).
