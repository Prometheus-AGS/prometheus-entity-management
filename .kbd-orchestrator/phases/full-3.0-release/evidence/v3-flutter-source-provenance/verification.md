# Verification — `v3-flutter-source-provenance`

Date: 2026-08-02  
Verdict: **PASS TO ARCHIVE — Dart runtime, full 3.0, and publication remain uncertified**

## Acceptance-to-evidence matrix

| Phase-plan requirement | Direct evidence | Result |
| --- | --- | --- |
| Record license authority before copying | `release/flutter-source-authority.json` predates the destination merge and names the owner-directed MIT adaptation, attribution, exact revisions, exclusions, and publication denial | Pass |
| Import committed source without reading the dirty checkout | The provenance manifest fixes KnowMe revision `68f7ab8…`, records a fresh disposable non-local clone/filter method, and says the dirty tree was not read | Pass |
| Preserve auditable history | Reachable filtered tip `cb318dd…` retains 8 of 226 examined commits; complete old-to-filtered and metadata maps bind authors, dates, messages, and file evolution | Pass |
| Map every selected and rejected path | Twelve approved files have explicit adapt/reference destinations; every other KnowMe path has an explicit reject disposition | Pass |
| Exclude applications, product models, secrets, generated/build output, locks, direct FFI, and the placeholder | Positive verifier, adversarial unit tests, and BDD tamper scenarios reject boundary violations | Pass |
| Preserve license and attribution | Root, canonical Dart package, and provenance boundary contain identical MIT terms and Travis James / Prometheus AGS / KnowMe LLC attribution | Pass |
| Keep one canonical Dart graph implementation | `packages/entity_graph_flutter` is the only release artifact owner; the provenance import is non-buildable, non-workspace, and non-public | Pass |
| Treat hybrid-mobile architecture honestly | Recorded at exact MIT revision as reference-only with zero runtime files imported | Pass |
| Synchronize release, public API, skills, and docs | Implemented coverage gate and docs agree; four export ledgers intentionally remain unchanged and reject provenance exposure | Pass |
| Prove visual lineage without fabricating Flutter UI evidence | Hash-bound SVG plus inspected 1200×680 raster clearly show source, filter, provenance, reference, and canonical-owner boundaries | Pass — headless lineage only |
| No mandatory lane silently skipped | Task-owned tests contain no `.skip`, `.todo`, `@skip`, or `@ignore`; runtime/platform lanes have named downstream owners | Pass — zero mandatory skips/todos |

## Executable evidence

- `pnpm run test:flutter-source-provenance`: 12/12 positive, adversarial, and Git-aware tests.
- `pnpm run bdd:flutter-source-provenance`: 14/14 scenarios and 56/56 steps.
- Clean `pnpm run ci`: 61/61 aggregate scenarios, 313/313 steps, release/coverage validation, lint, typecheck, 14/14 builds, skills, and security.
- `pnpm run verify:flutter-source-provenance`: 8 retained commits, 12 approved files, one canonical Dart owner, three MIT boundaries, publication denied.
- `pnpm run verify:package-contracts`: all twelve npm tarballs pass payload/manifests, Publint, ATTW, ESM, CommonJS, NodeNext, Node16, Bundler, and tarball-only consumers.
- `pnpm run verify:skills`: React 201, sync 16, A2UI 18 + 9, and A2A 30 + 2 export ledgers agree.
- `pnpm run verify:example-coverage`: 13/13 semantic scenarios; overall coverage remains `in-progress` and `releaseCertified: false`.
- Strict OpenSpec, Changesets status, production security policy, JSON parsing, evidence-path checks, and `git diff --check` pass.

Machine-readable evidence is in `final-verification.json`, `clean-gates.json`, `clean-provenance-verification.json`, `clean-cucumber.json`, `clean-example-coverage-report.json`, and `clean-package-contract-report.json`.

## Post-archive verification

OpenSpec archived the change at
`openspec/changes/archive/2026-08-02-v3-flutter-source-provenance` and promoted
`openspec/specs/v3-flutter-source-provenance/spec.md`. The generated promoted
spec initially contained a `TBD` purpose and a scenario path to the removed
active-change directory. The post-archive audit replaced those placeholders
with the durable provenance-gate purpose and verifier scenario; the promoted
spec then passed strict validation. Provenance, coverage, release-contract, and
integrity gates also passed after archive.

Repository-wide `openspec validate --all --strict` reported 28 passing items
and six unrelated failures in older archived/v4 change definitions:
`2026-06-22-v3-universal-platform-evolution`,
`2026-07-13-v4-prometheus-entity-sync`, `v4-dart-sdk`,
`v4-entity-sync-skill`, `v4-pem-sync-transport`, and `v4-tauri-plugin`. These
are recorded rather than hidden; the promoted Flutter provenance specification
itself passes strict validation.

## Clean-audit correction

The first disposable clean room rejected one stale aggregate BDD expectation: the quality-gate list ended at A2UI even though the authoritative ledger had subsequently gained A2A conformance and Flutter source provenance. The test expectation was corrected, the focused release contract passed, and verification restarted from a new initially clean snapshot. The second snapshot passed the complete CI chain.

## Dart and Flutter observation boundary

A separate pristine copy of `packages/entity_graph_flutter` resolved the committed lockfile offline, passed `dart analyze` with zero issues, and passed all 54 Flutter tests. It also revealed work that must not be mislabeled as provenance completion:

- Dart 3.13 formatting would modify six source/test files;
- Flutter 3.47 beta adds build/platform exclusions to `analysis_options.yaml`;
- the package still resolves Riverpod 2.6.1 while 3.3.2 was observed as available; and
- no `melos.yaml` exists.

Those changes affect runtime behavior, generated code, dependency compatibility, and public package certification. They remain owned by `v3-dart-graph-riverpod`.

## Unresolved platform and manual limits

- The provenance tree is evidence, not a package. It must never enter a workspace, export map, consumer alias, or registry candidate.
- Riverpod 3 adaptation, compatible Freezed/analyzer/generator resolution, formatting, code generation, Melos, and full Dart package gates remain open.
- Flutter widget/golden/keyboard/accessibility and Android/iOS device evidence remains open under the Flutter showcase.
- Cargo/Rust and Tauri desktop/mobile behavior remains with the native changes.
- The complete Prometheus-branded Docusaurus site and protected GitHub Pages deployment remain planned.
- All five showcases, Flint portable contracts, the complete skills ecosystem, RC/recovery automation, immutable-SHA certification, registry authority, stable publication, and `latest` remain open.
- The authority record is an engineering provenance decision based on the owner-directed migration. It is not general legal advice or a pub.dev authority grant.
- The clean proof binds current source content from a dirty wider release worktree, not an immutable release candidate.
- Security reports two low-severity findings; this is not a zero-vulnerability claim.

## Publication authority

Publication remains unauthorized. Archiving this change may unblock the canonical Dart implementation change, but it cannot authorize npm/pub.dev publication, a dist-tag mutation, GitHub Release, Pages deployment, or any full-3.0 certification claim.
