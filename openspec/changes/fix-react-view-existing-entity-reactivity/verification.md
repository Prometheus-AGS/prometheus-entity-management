# Verification

| Requirement | Command | Observed result | Limit |
|---|---|---|---|
| Unchanged-ID negative control | `pnpm --filter @prometheus-ags/prometheus-entity-management exec vitest run src/view/use-entity-view.test.tsx --reporter verbose` before implementation | 2 tests failed: both hooks retained `Before` instead of `After` | Focused React projection control |
| Focused projection behavior | Same focused command after implementation and again after versioning | 1 file passed, 2 tests passed, 0 failed | Both public view hooks |
| React package suite | `pnpm --filter @prometheus-ags/prometheus-entity-management test` | 9 files passed, 58 tests passed, 0 failed | React package |
| Publish-facing package gate | `pnpm --filter @prometheus-ags/prometheus-entity-management prepublishOnly` | Typecheck/build/tests passed; 203 runtime exports matched the ledger | React package at `3.0.0-rc.2` |
| Fixed prerelease version | `pnpm changeset version` | All 12 fixed npm packages advanced from `3.0.0-rc.1` to `3.0.0-rc.2` | Versioned only; no registry publication |
| Downstream UAR browser | `CI=1 pnpm exec playwright test -c tests/bdd/playwright.config.ts tests/bdd/.features-gen/features/local-first-resilience.feature.spec.js --grep 'embedded SSE connection'` | 1 test passed in 24.2 seconds | UAR embedded SSE scenario only |
