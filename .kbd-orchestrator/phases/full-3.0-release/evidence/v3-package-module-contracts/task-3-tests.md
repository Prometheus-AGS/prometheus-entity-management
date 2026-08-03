# Task 3 test evidence — v3 package module contracts

Date: 2026-08-01  
Change: `v3-package-module-contracts`

## Added coverage

- `tests/release/v3-package-module-contracts.test.mjs`
  - 8 Node tests covering all twelve manifests, loader/declaration mutations, tarball allowlists, the Tauri Rust boundary, packed-manifest path leaks, coherent candidate overrides, shared tsup adoption, and fail-closed Lit declaration rewriting.
- `tests/features/release/v3-package-module-contracts.feature`
  - 4 BDD scenarios covering independently valid tarballs, one coherent candidate set, documented/bounded payloads, and shared build invariants.
- `tests/steps/v3-package-module-contracts.steps.ts`
  - 20 executable steps. The first scenario runs the real pack/build/Publint/ATTW/consumer verifier; later scenarios consume that same report rather than substituting workspace-source assertions.
- `scripts/package-contract-validation.mjs`
  - Reusable fail-closed validation seams shared by the production verifier and mutation tests.
- TypeScript Bundler fixture
  - Added to the packed consumer alongside NodeNext and Node16 to match `release/v3-release-contract.json` exactly.

## Green results

| Command | Result |
|---|---|
| `pnpm run test:package-contracts` | PASS — 8/8 tests |
| `pnpm run bdd:package-contracts` | PASS — 4/4 scenarios, 20/20 steps |
| `node scripts/verify-package-contracts.mjs --report .../task-3-package-report.json` | PASS — 12/12 tarballs |
| strict Publint | PASS — 12/12 |
| strict Are The Types Wrong | PASS — 12/12 |
| Node ESM | PASS — one tarball-only candidate set |
| Node CommonJS | PASS — one tarball-only candidate set |
| TypeScript NodeNext | PASS |
| TypeScript Node16 | PASS |
| TypeScript Bundler | PASS |
| `pnpm run lint` | PASS |
| `git diff --check` | PASS |

Machine-readable evidence: `task-3-package-report.json`.

## Feynman check encoded in the suite

The tests distinguish two questions that are easy to confuse:

1. “Can source compile in the monorepo?”
2. “Can a user install and load the exact tarballs we plan to publish?”

Only the second certifies package exports. The consumer manifest therefore overrides every internal package coordinate with its candidate tarball. This prevents the already-published alpha—or workspace aliases—from contaminating the result.

No rendered UI is changed or exercised by this artifact-only task, so visual evidence is not applicable here. Visual certification remains mandatory for the later showcase and documentation changes in the active phase.
