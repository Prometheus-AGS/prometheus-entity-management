# Decisions — `v3-nextjs-app-router-example-archive-qa`

## 2026-08-03 — Correct the cycle-4 BLOCK and terminate cycle 5

Decision: the incomplete workspace-alias scan is corrected, and all eight
blocking constraints are satisfied; terminate cycle 5 and rebuild the complete
isolated adversarial review packet.

Rationale: focused source tests run before their test files and workspace-only
Vitest config are excluded from the external runtime consumer. The verifier
then scans all 112 remaining TypeScript, JavaScript, JSON, and YAML files, names
exact offending paths on failure, and records zero aliases plus the preserved
Next config hash. The fresh tarball-only run and current hash, coverage, export,
OpenSpec, Changesets, frozen-install, release-contract, diff-hygiene, and
security checks pass.

Non-promotion boundary: this decision authorizes neither npm staging nor stable
3.0. The frozen React rc.1 lane remains separate, and this continuation's
scoped-store APIs require a later fixed-group prerelease after merge.
