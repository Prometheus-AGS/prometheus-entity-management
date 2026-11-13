# a2ui-v1-conformance Specification

## Purpose
Runs the upstream A2UI conformance cases against the built renderer in a real browser and reports each case as passed, failed or an allowed divergence, with the allowed divergences listed in a reviewed, digest-bound file.

## Requirements

### Requirement: Upstream conformance cases pass against the built renderer

The upstream A2UI framework-adapter conformance cases (`core/adapter_conformance.yaml`, `core/accessibility.yaml`), vendored at a pinned commit with a SHA-256 for every file, SHALL pass against the built `@prometheus-ags/a2ui-react` in Chromium, except cases listed in `tests/conformance/a2ui/divergences.json`. The report SHALL record the argument list, exit code, pinned commit, file digests, built entry digest, divergence-list digest and every case result.

#### Scenario: Conformance run

- **WHEN** `pnpm run verify:a2ui-conformance -- --report <file>` runs against the built package
- **THEN** every case at the pinned commit is PASS or, when listed in the divergence list, DIVERGED; no case is FAIL or missing; and the report carries the suite and divergence-list digests

#### Scenario: Vendored suite has been edited

- **WHEN** any vendored file's SHA-256 differs from the manifest, or a file not in the manifest is present
- **THEN** the run stops before any case executes and the report records the mismatch

#### Scenario: Mutated case is caught

- **WHEN** the verifier runs a copy of a passing adapter case whose expected text has been altered
- **THEN** that case fails on the altered assertion, and the run fails if it does not

### Requirement: Divergences are bounded to named assertions

Each divergence entry SHALL name its suite and case, a reason class (`security-policy`, `upstream-renderer-gap` in the bundled 0.15.0 renderer, or `not-observable-through-public-API`), a reason, and the step and assertion of every failure it allows. A listed case SHALL be excused only when every failure it records is one of those allowances.

#### Scenario: Divergence list cannot hide a regression

- **WHEN** a listed case fails on an assertion its entry does not allow, or an entry names a case the suite does not contain
- **THEN** the run fails; and the report shows both controls (an added entry for a missing case, and a diverged case with one allowance removed) failing the evaluation
