# Verification — `v3-release-pipeline-rc`

Date: 2026-08-02  
Verdict: **PASS — CHANGE CERTIFIED AND READY TO ARCHIVE; PUBLICATION NOT AUTHORIZED**

## OpenSpec verification scorecard

| Dimension | Status |
| --- | --- |
| Completeness | 6/6 tasks; 1/1 requirement |
| Correctness | Every plan acceptance criterion has reproducible, scoped evidence |
| Coherence | Release contract, workflow, recovery policy, coverage, skills, and docs agree |
| Mandatory lanes | No required change-scope lane is skipped |

## Acceptance-to-evidence matrix

| Plan criterion | Direct evidence | Result |
| --- | --- | --- |
| Select only declared artifacts | Contract-derived 16-artifact manifest; private root denied | Pass |
| Publish npm dependencies first | Deterministic topological order for all 12 packages | Pass |
| Produce release notes | Changesets version-PR job contract; no publish in version job | Pass |
| Produce provenance when authorized | `actions/attest@v4` with required OIDC/attestation permissions | Pass as workflow contract; live attestation remains external evidence |
| Prevent private-root publication | Private root excluded from manifest and explicitly rejected | Pass |
| Protect `latest` | Before/after snapshot invariant and no stable promotion command | Pass |
| Recover from partial publication | Incremental failure journal; authority-before-read; live npm decoding; matching skip; stage UUID/SRI; conflict block | Pass |
| Complete an RC rehearsal | 16-artifact non-mutating rehearsal plus 12 packed npm consumers | Pass |
| Keep native ecosystems explicit | Dart/Rust dry-run-only; Tauri Rust embedded in npm | Pass |
| Verify installable npm candidates | Publint, ATTW, ESM, CJS, NodeNext, Node16, Bundler | Pass |
| Verify clean cross-platform gates | Full CI, Flutter stable, Pub dry run, Tauri/Cargo, OpenSpec | Pass |
| Preserve independent release states | Final BDD and visual disposition | Pass |

## Current deterministic evidence

- Full root CI: 83 scenarios and 393 steps, all passing.
- Release verifier: 16 declared artifacts, 12 exact npm tarballs, five
  runtime/type consumer modes, actionlint, zero registry mutation.
- Security: 325 production dependencies, zero blocking advisories.
- Dart/Flutter: Flutter 3.44.8/Dart 3.12.2, 70 tests, 81 public declarations,
  clean 84 KB Pub candidate with zero warnings.
- Tauri/Rust: 16 JavaScript tests, capability allow/deny host tests, packed Rust
  host, hash-verified Android/iOS receipts, and 6 direct locked Cargo tests.
- Final release-pipeline contract: 24 unit tests, 13 BDD scenarios, and 57
  steps, all passing.
- Visuals: task-3 functional certificate plus task-6 independent release-state
  disposition, both inspected at original resolution.

## Research and learning gate

The deep-research package at `.research/v3-release-pipeline-rc/` completed all
10 stages with confidence 0.94 and no unresolved contradiction. The task-6
primary-source refresh covers npm trusted/staged publishing, GitHub
attestations, Pub.dev OIDC publishing, and Cargo publishing. The skeptic-level
Feynman explanation scored 0.97 with `misconceptions_absent = 1.0`; both
transfer problems scored 1.0. Strict sycophancy detection on the final
disposition scored 0.0.

## Archive boundary

Archiving this OpenSpec change records that the recoverable RC mechanism and
its bounded evidence are complete. It grants no authority to upload a package,
reserve a version, create or move a tag/dist-tag, emit a GitHub Release, or
change other public state.

The full 3.0 release remains uncertified. The five showcases, Flint portable
contracts, complete skills surface, Docusaurus/Pages product, immutable
cross-ecosystem certification bundle, and stable publication are downstream.

## Next execution priority

The React path is deliberately next: `v3-vite-react19-example` followed by
`v3-nextjs-app-router-example`. This accelerates evidence for a potential
core-plus-React `3.0.0-rc.1` preview without silently narrowing the accepted
release contract. Any early preview still requires a contract amendment,
immutable committed source, explicit prerelease versioning, protected `next`
publication, and proven external authority; this archive grants none of those.
