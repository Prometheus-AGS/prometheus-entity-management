# Task 4 — Coverage, public API ledgers, skills, and documentation

Date: 2026-08-01

## Machine-readable coverage

- Added the implemented `release.protocol.a2ui-official` quality gate to `examples/coverage.json`.
- Promoted only the A2UI-owned receipt in `protocol.a2a-a2ui`; A2A conformance remains planned.
- Promoted only the A2UI action-policy receipt in `security.tenant-actions-secrets`; portable and native security evidence remains planned.
- Retained all five showcases and the documentation site as planned, overall status `in-progress`, and `releaseCertified: false`.
- Extended both release and shared-example validators with fail-closed A2UI gate, policy, tag, command, and evidence-path checks.

## Public API ledgers

- Added `a2ui-library-exports.json` as one ledger for both publishable entry points.
- Root: 18 runtime exports, official A2UI only.
- `./ag-ui`: 9 runtime exports, alpha compatibility only.
- Extended refresh/verification scripts with `--a2ui` and wired the A2UI package into root `refresh:exports` and `verify:skills`.
- Ledger SHA-256: `2fd48bfaacc045514978065916aeb8b8bad52fc555baed256bf6dc6a7b37d00a`.

## Human and agent documentation

- Replaced the stale package README with exact version axes, install/quick-start, catalog and policy rules, SSR lifecycle, public APIs, alpha migration, evidence, and explicit limits.
- Added `release/a2ui-protocol-bridge.md` and linked it from root/release/example documentation.
- Added the shared agent reference and both-entry-point ledger to the canonical skill bundle.
- Corrected both strategic-roadmap copies and all affected package changelog summaries so `EntityChat` is no longer presented as a package-root A2UI renderer.
- Rewrote the A2UI package changelog and added an unreleased root changelog entry without announcing stable publication.

## Research and Feynman audit

- Persistent research: `.research/full-3.0-release-execution-readiness/v3-a2ui-protocol-bridge-task4-research.md`.
- Source-grounded grade: `.research/full-3.0-release-execution-readiness/v3-a2ui-protocol-bridge-task4-grade.json`.
- Firecrawl was unavailable, so deep-research used the documented fallback web retriever with five primary upstream sources plus local executable evidence.
- The upstream “current production protocol” versus “early-stage project” tension is resolved without overclaiming: the bridge is implemented; the full Prometheus release remains in progress.

## Verification receipts

- Red BDD receipt: `task-4-bdd-red.md`.
- `pnpm run verify:example-coverage`: 13/13 semantic scenarios, 16 capabilities, 16 stable artifacts, five planned showcases, release not certified.
- `pnpm run validate:release-contract`: zero errors.
- A2UI skill gate: root 18/18 and `./ag-ui` 9/9.
- Root skill gate: React 201/201, sync 16/16, A2UI root 18/18, and A2UI `./ag-ui` 9/9.
- A2UI tests: 13 Vitest plus 6 release tests passed.
- Example-coverage tests: 14/14 passed.
- Release-contract tests: 15/15 passed.
- Green BDD: 6/6 scenarios, 34/34 steps, and 4/4 hooks passed unchanged after the red receipt.
- A2UI package typecheck, scoped ESLint, JSON parsing, and scoped `git diff --check` passed.
