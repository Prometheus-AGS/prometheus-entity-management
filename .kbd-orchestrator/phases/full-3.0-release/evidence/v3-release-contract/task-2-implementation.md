# v3-release-contract task 2 implementation evidence

**Result:** PASS

## Implemented

- Added `release/v3-release-contract.json` with exactly 12 npm packages, one Dart package, and three Rust crates.
- Recorded owners, registry decisions, fixed/aligned version policies, stability, compatibility, module formats, singleton behavior, protocol maturity, security boundaries, promotion gates, recovery, rollback, deprecation, and explicit exclusions.
- Added a JSON Schema and a human release-contract guide.
- Replaced the active project specification paths and v1 umbrella pointer with the v3 contract/change. The historical v1 spec remains available solely for archived links.
- Expanded the OpenSpec delta into explicit, testable requirements.
- Added Cucumber 13.2.0 with TypeScript steps through Node's supported `--import tsx` path and retries disabled.

## BDD lifecycle

- Red: 4 scenarios and 26 steps were undefined before implementation.
- Green: 4 scenarios and 26 steps passed after implementation.
- The scenarios compare the contract inventory to real npm, Dart, and Cargo manifests rather than trusting the contract's own counts.

## Verification

```text
pnpm run bdd:release-contract         PASS (4 scenarios, 26 steps)
openspec validate v3-release-contract --strict
                                      PASS
jq -e release contract + schema       PASS
git diff --check                      PASS
```

No retry, skip, or source-path alias was used to make the release-contract scenarios pass.
