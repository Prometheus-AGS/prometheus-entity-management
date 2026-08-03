# v3-release-pipeline-rc task 4 — ledgers, skills, and documentation

Date: 2026-08-02

## Result

The implemented RC boundary is now declared consistently across the example
coverage ledger, operator documentation, release guidance, and agent skills.
Every surface states that local certification and non-mutating rehearsal do not
authorize registry publication or stable promotion.

## Synchronization model

- `examples/coverage.json` is the machine-readable departures board: it records
  `release.pipeline.recoverable-rc` as implemented while the overall release
  remains `in-progress` and uncertified.
- `release/release-candidate-pipeline.md` is the operator contract: it explains
  contract-derived ordering, rehearsal, OIDC staging constraints, native
  dispositions, restart recovery, and exclusions.
- `prometheus-entity-skills/_shared/references/release-candidate-pipeline.md` is
  the agent interpretation: it requires evidence and blocks publication
  overclaims.
- Public export ledgers track exported names. The Tauri `generated-public.ts`
  structural facade changed how declarations are expressed, not which names are
  exported, so the existing ledger remains authoritative.

## Test-first evidence

RED:

- the focused Node contract failed because the RC coverage gate and guides were
  absent;
- Cucumber reported three undefined steps for the coverage/guidance scenario.

GREEN:

- `node --test tests/release/v3-release-pipeline-rc.test.mjs`: 14/14 pass;
- `pnpm run verify:example-coverage`: 13/13 semantic scenarios pass, 16 stable
  artifacts mapped, overall status `in-progress`, `releaseCertified: false`;
- `pnpm run test:example-coverage`: 14/14 pass;
- `pnpm run bdd:release-pipeline`: 9/9 scenarios and 36/36 steps pass;
- `pnpm run verify:skills`: React 201, sync 16, A2UI 18 + 9, A2A 30 + 2,
  Tauri 26 runtime + 57 declaration, and Dart 81 declarations all match;
- scoped ESLint and JSON syntax checks pass.

## Explicit non-claims

No registry mutation occurred. This task does not certify external npm trusted
publisher configuration, GitHub environment reviewers, Android/iOS execution,
the five complete showcases, production documentation deployment, a GitHub
Release, stable 3.0.0, or npm `latest`.
