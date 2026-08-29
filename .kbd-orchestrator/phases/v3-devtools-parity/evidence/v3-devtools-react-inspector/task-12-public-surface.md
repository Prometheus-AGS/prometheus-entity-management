# Task 12 public-surface synchronization

Date: 2026-08-29

## Release boundary

- npm `3.0.5` is already published and does not contain the new React
  `./devtools` or `./devtools/auto` entries.
- A Changesets minor record owns the future release. Package/root README,
  Docusaurus guide/examples/generated chooser, and the skills reference label
  the inspector as repository/unreleased until that release.

## Runtime ledger

The React ledger is entry-keyed:

| Entry | Runtime exports |
| --- | ---: |
| `.` | 203 |
| `./devtools` | 21 |
| `./devtools/auto` | 2 |

`scripts/refresh-exports-ledger.mjs` and
`scripts/verify-skills-exports.mjs` already operate from the shared
entry-point registry. The generated API reference flattens entry-keyed ledgers
for its package page while preserving entry identity in the skills ledger.

Repository search found one unrelated verifier that parsed the React ledger
as an array: `scripts/verify-flint-portable-contracts.mjs`. It now accepts the
entry-keyed shape by flattening its arrays before checking the two Flint root
exports. Other search hits either name/hash the file, check its existence, or
use a different package ledger.

## Deterministic checks

- `pnpm --filter @prometheus-ags/prometheus-entity-management run verify:skills` — pass for all 3 entries.
- `node scripts/generate-api-reference.mjs --skip-artifacts` — pass with no new undocumented baseline entries.
- `pnpm --filter @prometheus-ags/entity-graph-docs-site build` — pass; generated API/chooser pages and Docusaurus production build compile.
- `pnpm run docs:check` — pass for the repository's existing website content contract.
