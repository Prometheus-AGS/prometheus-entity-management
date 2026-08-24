# Main-Convergence Semantic-Port Table

Run: `20260823T175006Z`

The stale `main-takeover-kimi` tip was not merged as topology. Its semantic tree
was squash-ported onto the current stable `main` tip, which already contains PR
#20's pnpm-11 fixes and PR #23's coordinated `3.0.0` versions. Rename conflicts
were resolved toward the later OpenSpec archives; older `design.md` records were
retained as recovery evidence. The deleted Flint live test was restored because
it exercises unique portable-contract behavior.

| Source commit | Hunk disposition | Acceptance check |
| --- | --- | --- |
| `b4e46dd69892` | Launch/runbook documentation ported. | Documentation path exists. |
| `3628f4c0fa9c` | Next.js SSR implementation, tests, evidence, and later archive ported. | Next.js verifier and contract lane. |
| `01e91fd0e4cf` | A2A/A2UI application, tests, evidence, and later archive ported. | Agentic A2UI verifier and golden replay. |
| `a47a029d1e19` | Flutter/Riverpod implementation, platform shells, tests, and evidence ported. | Flutter verifier and source-provenance lane. |
| `b6c6a4a37503` | Tauri universal implementation, mobile/desktop capabilities, tests, and evidence ported. | Tauri verifier and Rust host contract. |
| `cab8dcd229b5` | Flint portable contracts and security tests ported; unique live test restored. | Flint contract verifier. |
| `a1c2fbe8ce28` | Complete skill ecosystem and snippet evidence ported. | Skill ecosystem verifier. |
| `93a81b9e4c1c` | Branded Docusaurus surface and foundation evidence ported. | Docs foundation build/check. |
| `78ce22d4d1d5` | Multi-language API generator, content, and evidence ported. | API reference verifier. |
| `21eb749e20be` | Concept/package guides and snippet evidence ported. | Concepts verifier. |
| `eb4476f99253` | Example/integration guides and evidence ported. | Examples verifier. |
| `55773846ac07` | Operations/migration guides and evidence ported. | Operations verifier. |
| `88913194aae8` | Pages packaging retained as deployment-only documentation automation. | Pages artifact verifier; no hosted tests. |
| `f96db76590e7` | Certification inventory ported as non-authoritative preparation evidence. | Evidence references resolve. |
| `ea1946a474c5` | Fail-closed local release-check implementation ported. | Local release-check lane. |
| `60c6e21160f8` | Time-bounded build-only advisory decisions ported. | Production dependency audit. |
| `920b75c1ecb9` | Flutter evidence provenance updates ported. | Provenance verifier. |
| `49b9d7030ba2` | Dart showcase verifier updates ported. | Dart verifier. |
| `082e058919ca` | Five-showcase contract coverage ported. | Release contract lane. |
| `78e19a4d638a` | Deliberate advisory-exception tests ported. | Security audit lane. |
| `f99492581b21` | Example-coverage assertions ported. | Example coverage verifier. |
| `4a9c5a82ab1b` | Sync/persistence receipt assertions ported. | Sync persistence lane. |
| `1d5999e1c0d9` | Stale planned-status assertions corrected. | Contract/Dart/provenance lanes. |
| `55dc8dc7a156` | Ledger and generated-artifact assertions ported. | Baseline/A2A/A2UI lanes. |
| `4485696f1efd` | Sealed 35-lane evidence bundle and release certification ported. | Local `release:check`. |
| `1f3a427eeacf` | Stable boundary intent retained, but defective RC-shaped implementation replaced. | Stable architecture test. |
| `a08ee67f50bd` | Routing intent retained; stable now uses direct `npm publish`, `publish-stable`, `npm-stable`, `latest`, OIDC, exact SHA, and no `stageId`. | Stable authority/result tests and deployment-only workflow inspection. |

The current-main stable release changes remain authoritative for all package
versions, changelogs, lockfile versioning, and the idempotent publication
recovery script. No `3.0.0-rc.*` version was reintroduced by the port.
