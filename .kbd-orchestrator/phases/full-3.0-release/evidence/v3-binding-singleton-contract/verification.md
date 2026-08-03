# Verification — `v3-binding-singleton-contract`

Date: 2026-08-01  
Verdict: **PASS for archive**

## Acceptance-to-evidence matrix

| Acceptance requirement | Evidence | Result |
| --- | --- | --- |
| Six bindings use a required compatible core peer and no private production core | Source and packed manifest policy in [`final-binding-singletons-report.json`](final-binding-singletons-report.json); 5 fail-closed unit tests | Pass |
| Package manager installs one compatible core | Seven resolution owners map to `core-instance-1` in the final packed report | Pass |
| Binding-appropriate reactivity and cross-view visibility | React selector subscription, Svelte entity store, Solid `createGraphStore`, Lit controller, Alpine reactive binding, and HTMX event/two-way graph proof execute from packed tarballs | Pass |
| Incompatible core fails with actionable diagnostics | Fake core `4.0.0` fails strict pnpm install with package and peer context | Pass |
| Coordinated package policy | Exact Changesets fixed group matches all twelve npm release artifacts; stable calculation targets `3.0.0` in throwaway clean Git history | Pass |
| Public ledgers remain synchronized | Coverage BDD, six binding READMEs, release docs, and 201-export skills ledger pass | Pass |
| No mandatory lane is silently skipped | Applicable JavaScript/package/docs/security/OpenSpec gates pass; native/rendered lanes have explicit downstream owners | Pass |

## Final focused gates

| Gate | Result |
| --- | --- |
| `pnpm run test:binding-singletons` | Pass — 5/5 |
| `pnpm run verify:binding-singletons -- --report .../final-binding-singletons-report.json` | Pass — six packed bindings, one core, six behavior proofs |
| `pnpm run bdd:binding-singletons` | Pass — 5/5 scenarios, 25/25 steps, 3/3 hooks |
| `pnpm run test:release-contract` | Pass — 13/13 |
| `pnpm run validate:release-contract` | Pass — zero errors |
| `pnpm run verify:skills` | Pass — 201/201 runtime exports |
| `pnpm exec openspec validate v3-binding-singleton-contract --strict` | Pass |

The complete clean-state gate remains recorded in [`task-5-clean-gates.md`](task-5-clean-gates.md): frozen install, full CI, 24/24 BDD scenarios and 127/127 steps, package contracts, security, and independent packed verification pass.

## Transient infrastructure output

A parallel refiner run exhausted the macOS host file table while pnpm linked a second packed consumer. The standalone verifier immediately before it passed, no assertion failed, and a required serial BDD retry passed completely. The final report was regenerated after the reactive-proof correction. This transient is not used as product evidence.

## Limits

This verification does not claim browser/device behavior, native Tauri/Flutter singleton behavior, rendered examples, Docusaurus, RC/provenance/recovery, immutable-SHA certification, registry authority, stable publication, or npm `latest`. No registry mutation occurred.

