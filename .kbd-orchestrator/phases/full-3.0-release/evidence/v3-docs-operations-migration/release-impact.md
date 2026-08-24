# Release impact: v3-docs-operations-migration

## Surface added

- 13 documentation pages: `site/docs/migration/{v2-to-v3,alpha-to-stable,compatibility-policy}.mdx`
  and `site/docs/operations/{release-notes,release-runbook,security,performance,testing,deployment,troubleshooting,faq,contributing,skills-usage}.mdx`.
- New `operationsSidebar` + "Operations" navbar item in the docs site.
- 6 upgrade-validation fixtures under `tests/release/fixtures/upgrade/`.
- `scripts/verify-docs-operations.mjs` (5-lane certification verifier),
  `tests/release/v3-docs-operations-migration.test.mjs` (12 assertions),
  `tests/features/release/v3-docs-operations-migration.feature` +
  `tests/steps/v3-docs-operations-migration.steps.ts` (3 scenarios / 14 steps).
- Root scripts: `verify:docs-operations`, `test:v3-docs-operations-migration`,
  `bdd:docs-operations-migration`.

## Harness change

`scripts/verify-skills-snippets.mjs` now treats files matched with `--ext
.ts,.tsx` as whole-file snippets. The default behavior (`--ext .md`, fence
extraction over `prometheus-entity-skills/`) is unchanged; the skills default
lane and the `verify:docs-snippets` docs lane are unaffected (both ran green
inside their respective verifiers during regression).

## Publication authority

None. This change ships documentation and test infrastructure only; it does
not move any release contract, coverage ledger, or registry pointer. The
`v3-release-certification` and `v3-stable-publication` gates remain the
publication boundary.

## Dependencies for later changes

`v3-docs-github-pages` depends on this change and can now reference the
migration/operations routes in its route probes and quality gates.
