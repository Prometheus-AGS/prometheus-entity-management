# Artifact-refiner QA

Date: 2026-08-01  
Artifact: `v3-example-coverage-contract-verification`  
Decision: **PASS with no product correction required**

The PMPO `direct:content` audit mapped every phase-plan detail and acceptance criterion to executable semantic, mutation, BDD, clean-gate, documentation, and ledger evidence. It specifically challenged the risk that planned showcase paths could be misrepresented as implemented behavior.

## Findings

- The shared domain has exactly User, Project, Task, Comment, and Activity.
- The fixed clock, synthetic tenant, ID-only lists, deterministic transports, and credential-free security assumptions are machine-checked.
- All thirteen semantic scenarios pass and cover normalized cross-view identity, optimistic confirm/rollback, relationships and invalidation, local/remote/hybrid views, REST/GraphQL equivalence, realtime batching, offline convergence, A2A/A2UI policy, SSR isolation/hydration, platform boundaries, SDL round-trip, and lifecycle/security behavior.
- All sixteen stable capabilities and all sixteen declared release artifacts have runnable semantic mappings.
- The exact five requested showcase identities map to shared scenarios, while all five keep runtime and visual evidence `planned` under explicit downstream owners.
- The fail-closed suite covers missing/stale mappings, missing artifacts, wrong commands, escaping or missing paths, a missing semantic report, duplicate gates/showcases, malformed complete state, nondeterministic transport, cross-tenant fixtures, and dishonest completion claims.

A suspected duplicate capability title was rejected after a numbered raw-file check proved that overlapping inspection ranges had printed one source line twice. No ledger defect existed, so no artificial correction was made.

The audit did expose a report-capture hazard: Cucumber truncates its JSON output before scenarios run, but those scenarios invoke the validator that checks listed evidence is non-empty. The final Cucumber JSON is now captured at a temporary path and promoted only after a passing run. This preserves fail-closed validation during evidence generation.

## Refiner state

- Specification: `.refiner/artifacts/v3-example-coverage-contract-verification/specification.md`
- Constraints: `.refiner/artifacts/v3-example-coverage-contract-verification/constraints.json`
- Canonical report: `.refiner/artifacts/v3-example-coverage-contract-verification/dist/archive-qa-report.md`
- Manifest: `.refiner/artifacts/v3-example-coverage-contract-verification/artifact_manifest.json`
- Decision log: `.refiner/artifacts/v3-example-coverage-contract-verification/decisions.md`

The supplied workflow-dispatch helper failed during phase hooks because its JSON payload is not transferred into the quoted Python heredoc. This artifact has no workflow triggers; filesystem checkpoints succeeded, and the helper defect is recorded rather than hidden.

## Visual boundary

No UI surface changed, so fabricated screenshots would provide no evidence. Real browser/device, accessibility, screenshot/golden, trace, video, and hash receipts remain mandatory for the five downstream showcases and the Docusaurus changes.
