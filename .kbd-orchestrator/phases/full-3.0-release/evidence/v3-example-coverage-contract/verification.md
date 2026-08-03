# Verification — `v3-example-coverage-contract`

Date: 2026-08-01  
Verdict: **PASS — archived and promoted**

## Acceptance-to-evidence matrix

| Phase-plan requirement | Direct evidence | Result |
| --- | --- | --- |
| Shared Project/User/Task/Comment/Activity domain | `examples/shared/scenario-contract.json`; schema validation; focused unit and BDD assertions | Pass |
| Deterministic transports, scenario IDs, and security assumptions | Eight keyless transports, fixed clock, synthetic tenant, allowlisted actions, and secret policy in the contract; validator mutations | Pass |
| Coverage ledger maps every stable public feature | Sixteen stable capabilities and sixteen release artifacts validated bidirectionally | Pass |
| Normalized IDs and ID-only lists | `example.graph.normalized-cross-view`; list payload and unknown-ID rejection | Pass |
| CRUD and optimistic flows | Confirm and rollback scenarios preserve canonical/patch isolation | Pass |
| Relationships and cascade invalidation | Old/new Project and Task-list invalidation oracle | Pass |
| Local, remote, and hybrid views | One filter outcome across three completeness modes | Pass |
| Realtime | Three events coalesce to two entities and one graph write | Pass |
| Offline persistence and sync | Two deterministic clients converge, persist, and reload | Pass semantic contract; real PGlite/Loro remains downstream |
| A2A/A2UI | Keyless task lifecycle, A2UI 0.9.1 surface, allow/deny/malformed action outcomes | Pass semantic contract; official protocol implementations remain downstream |
| SSR | Two request graphs isolate, serialize, hydrate, and avoid duplicate fetches | Pass semantic contract; Next.js browser proof remains downstream |
| Platform boundaries | Browser/desktop/mobile adapter contract keeps the application graph canonical and denies undeclared commands | Pass semantic contract; native builds/devices remain downstream |
| Missing/stale mappings fail closed | Thirteen mutation tests and the adversarial BDD scenario | Pass |
| Examples share semantic fixtures/outcomes | Exact scenario IDs, shared contract path/schema, and showcase mappings | Pass |

## Final focused gates

| Gate | Result |
| --- | --- |
| `pnpm run verify:example-coverage -- --report .../final-example-coverage-report.json` | Pass — 13/13 scenarios, 16 capabilities, 16 artifacts, 5 showcases, zero errors |
| `pnpm run test:example-coverage` | Pass — 13/13 |
| Focused Cucumber with temporary JSON staging, then atomic promotion to `final-cucumber.json` | Pass — 4/4 scenarios, 27/27 steps, 4/4 hooks |
| Evidence non-empty/JSON audit | Pass |
| `git diff --check` | Pass |

The full clean-state evidence is recorded in `task-5-clean-gates.md` and `clean-gates.json`: two independent frozen installs and complete CI runs passed, including 365 workspace tests, 28/28 BDD scenarios and 154/154 steps, 12/12 packed packages, 201 exports, and the security gate.

Temporary staging is required because the focused scenarios invoke the evidence validator; writing directly to the already-declared final JSON path would truncate it before the validator runs. The staged run passed and only then replaced the final receipt.

## Limits

The semantic report intentionally retains `overallCoverageStatus: in-progress` and `releaseCertified: false`. All five showcases remain planned. This verification does not claim browser/device execution, visual or accessibility evidence, Dart/Melos, Cargo/Tauri, Docusaurus/Pages, Flint live integration, immutable-SHA certification, RC/provenance/recovery, registry authority, stable publication, or npm `latest`. No registry mutation occurred.
