# Artifact Refiner QA — `v3-tauri-mobile-plugin`

Date: 2026-08-02  
Artifact: `v3-tauri-mobile-plugin`  
Content type: `direct:content`  
Convergence: **terminate after blocker resolution — ready for fresh adversarial review and OpenSpec archive**

## Specify

The refined artifact is the complete Tauri 2 plugin boundary: Rust-derived
bindings, least-privilege permissions, desktop IPC, packed-only consumption,
native Android/iOS registration, real mobile bridge execution, and an npm
payload that excludes generated build state. Its authority ends at this
OpenSpec change; it does not authorize the full 3.0.0 release or publication.

## Execute

Deterministic results include:

- 10/10 permanent Tauri release tests and 16/16 package tests;
- 5/5 tagged BDD scenarios, 18/18 steps, and 5/5 hooks;
- current generated bindings, TypeScript typecheck, and exact desktop IPC;
- a packed-only Rust consumer using a 41-file source/runtime npm candidate;
- zero packaged Android `.tauri/` or `build/`, iOS `.build/`, or Rust `target/` state;
- physical Samsung SM-S936U Android 16 success and denial receipts;
- iPhone 17 / iOS 26.5 simulator success and denial receipts;
- exact `entity-graph-tauri` platform responses and fail-closed permission errors;
- original-resolution inspection of all four Prometheus-branded screenshots;
- SHA-256 recomputation for every artifact declared in `device-evidence.json`;
- 26 runtime and 57 declaration exports matching the Tauri skill ledger;
- 13/13 semantic coverage scenarios with the Tauri plugin gate implemented;
- frozen install, Rust format, all skill ledgers, strict OpenSpec validation,
  JSON integrity, and diff hygiene passing; and
- a clean isolated Rust verifier/packed-consumer lane without the prior host
  `ENFILE` failure.

## Reflect

| Constraint | Result | Evidence |
| --- | --- | --- |
| Every criterion has direct evidence | Satisfied | verifier, BDD, device manifest, platform artifacts |
| Mobile execution is not inferred | Satisfied | exact Android/iOS responses and denials |
| State dimensions stay independent | Satisfied | plugin archive ready; full release/publication still false |
| Visual evidence is usable and bound | Satisfied | four inspected screenshots and recomputed hashes |
| Tests, ledgers, docs, and evidence agree | Satisfied | focused final gate set |
| Archive/publication authority is scoped | Satisfied | this change archive-ready; publication unauthorized |

The blocker-resolution pass also found and fixed a release-specific packaging
regression: mobile builds had left Gradle/Tauri generated state beneath the
broad `rust-plugin/android` package include. The manifest now lists only the
required native sources and manifests, and both unit and packed-candidate gates
reject broad/generated payloads.

No constraint violation remains. OpenSpec archive may proceed only after the
fresh adversarial diff review returns PASS. The package remains
`3.0.0-alpha.0`; npm tags, GitHub Release, Pages deployment, and full 3.0.0
certification remain owned by later changes.
