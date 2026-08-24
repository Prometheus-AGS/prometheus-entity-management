# v3-release-contract task 3 test evidence

**Result:** PASS

## Red phase

`pnpm run test:release-contract` failed with `ERR_MODULE_NOT_FOUND` for `scripts/validate-v3-release-contract.mjs`. The negative tests existed before the reusable validator.

## Implemented checks

- JSON Schema validation through Ajv 8.20.0.
- Semver range and major-version validation through semver 7.8.5.
- Live comparison against every public npm workspace manifest, the Dart pubspec, and all three Cargo manifests.
- Duplicate artifact ID and ecosystem/package coordinate rejection.
- Exact 16-artifact and 12-npm-package enforcement.
- Fixed npm group, artifact path, manifest identity, A2UI maturity, Flutter genui maturity, required registry, and npm `latest` approval checks.
- Seven negative/positive Node unit tests plus the four-scenario Cucumber contract suite.

## Green verification

```text
pnpm run test:release-contract       7/7 tests passed
pnpm run validate:release-contract   0 errors; 16 artifacts / 12 npm / 1 Dart / 3 Rust
pnpm run bdd:release-contract        4 scenarios / 26 steps passed
openspec validate ... --strict       PASS
git diff --check                     PASS
```

Retries are disabled and no scenario or unit test is skipped.
