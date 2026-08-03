# Task 3 test matrix — Flutter source provenance

Date: 2026-08-01  
Verdict: **PASS**

## Research-driven risk model

The verified research report (confidence 0.93) and Feynman artifact (grade
0.96) require deterministic rejection of unapproved paths, missing mappings,
duplicate canonical implementations, and falsified authority. Task 3 therefore
tests failure behavior rather than merely rerunning the positive receipt.

## Applicable lanes

| Lane | Evidence | Result |
| --- | --- | --- |
| Pure unit contract | `scripts/flutter-source-provenance-contract.mjs`; in-memory tampering for paths, metadata, artifacts, publication, hashes, and architecture misuse | 11 passing test cases/subtests |
| Git integration | Real filtered tip, merge ancestry/delta, complete map, filtered metadata, and report execution | 1 passing integration test |
| System BDD | Positive lineage plus adversarial tamper features | 11 scenarios / 46 steps / 4 hooks passed |
| Documentation boundary | Verifier asserts provenance README says non-buildable, non-workspace, non-public, and one canonical Dart owner | Pass |
| Visual integrity | SVG hash is verified; BDD proves a substituted visual hash fails closed | Pass |

## Explicitly inapplicable lanes

- **Published consumer:** intentionally inapplicable. The import is provenance,
  not a buildable or publishable package; creating a consumer would violate the
  acceptance boundary. The canonical Dart consumer belongs to
  `v3-dart-graph-riverpod`.
- **Flutter/mobile platform rendering:** intentionally inapplicable. This change
  certifies repository history, licenses, and path decisions. Flutter analyze,
  test, golden, accessibility, and device lanes belong to the canonical Dart
  package and Flutter example changes.
- **External source checkout:** intentionally not a runtime dependency. The
  verifier consumes only repository-contained records and reachable Git objects,
  so CI does not require the original absolute KnowMe or hybrid-mobile paths.

These exclusions are scoped ownership decisions, not silent skips.

## Commands

```text
pnpm run test:flutter-source-provenance
pnpm run verify:flutter-source-provenance
node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --config cucumber.mjs --tags '@v3-flutter-source-provenance'
```
