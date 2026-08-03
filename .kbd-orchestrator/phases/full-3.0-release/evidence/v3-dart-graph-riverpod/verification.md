# Verification — `v3-dart-graph-riverpod`

Date: 2026-08-02  
Verdict: **PASS TO ARCHIVE — full Flutter application, registry publication,
and the wider 3.0 release remain uncertified**

## Acceptance-to-evidence matrix

| Phase-plan requirement | Direct evidence | Result |
| --- | --- | --- |
| Preserve the tested Dart-native graph as canonical | Graph/provider tests, verifier ownership checks, and 81-declaration ledger | Pass |
| Riverpod 3 families/controllers select and orchestrate the graph | Generated public families plus remote/local/hybrid and cross-view tests | Pass |
| Rust/FFI remains optional | Callback-backed FFI adapter tests; no Cargo/native runtime dependency | Pass |
| One coherent stable toolchain | Official Flutter 3.44.8/Dart 3.12.2 clean candidate with bounded Riverpod 3.3 and exact generator pins | Pass |
| Melos analyze/test/format/package/example orchestration | Root pnpm-fronted Melos commands and frozen workspace lock | Pass |
| Cross-view normalized behavior | ID-only membership, list/detail graph rejoin, and two inspected widget goldens | Pass |
| Optimistic CRUD and exact rollback | Create/update/delete confirmation plus patch, sync, entity, placeholder, and index restoration tests | Pass |
| Local/remote/hybrid views | All local operators, no-I/O local mode, remote normalization, hybrid replacement | Pass |
| Change invalidation | Realtime update/delete normalization and typed-list staleness tests | Pass |
| Terminal failures do not retry forever | Terminal one-attempt and transient three-total-attempt tests | Pass |
| No public core package requires KnowMe FFI | Manifest/import verifier and optional adapter boundary | Pass |
| Ledgers/docs/skills remain synchronized | Source-derived Dart ledger, coverage gate, package/release/skill guidance | Pass |
| No mandatory lane silently skipped | Zero task-owned skip/todo annotations; non-applicable/downstream lanes have explicit dispositions | Pass |

## Stable package candidate

The authoritative clean candidate is commit
`9c341c22c158e3c685860ab3b60e649d29367f87`. It retains repository history and
passes frozen pnpm install, frozen Dart resolution, deterministic generation,
format, analysis, 70 Flutter tests, example orchestration, a zero-warning 84 KB
Pub dry run, root validation/lint/typecheck/build/test/skills/security, full
BDD, focused BDD, and strict OpenSpec validation.

The active development worktree remains intentionally dirty across the wider
28-change program. A fresh package probe there reports only the expected
ignored/uncommitted Git-state warnings. It is not substituted for the clean
candidate receipt and is not presented as publication evidence.

Fresh focused verification reports 4/4 permanent Node release tests, 8/8
tagged BDD scenarios and 26/26 steps, 13/13 semantic coverage scenarios,
81/81 Dart declarations, all skills ledgers, zero changed generated output,
strict OpenSpec, JSON integrity, lint, and `git diff --check` passing.

The complete pinned-stable root CI rerun also passes validation, lint,
typecheck, every build/test lane, 69/69 aggregate BDD scenarios and 339/339
steps, skills, and production security. The two goldens were then reinspected
at original resolution with no clipping, overflow, collapsed card, or
cross-view state discrepancy.

## Research and Feynman transfer

The 14-source deep-research package resolves four contradictions with 0.96
confidence and a 0.95 Feynman grade. Its key correction is that “latest” is not
automatically compatible: the Riverpod 3.4/generator 4.0.8 line resolves on the
local beta but not on Flutter 3.44.8 stable. The certified floor therefore uses
Riverpod 3.3.2, annotations 4.0.3, generator 4.0.4, and build_runner 2.15.1.

In plain terms, the graph is the one catalog, Riverpod is the librarian, and
transports are delivery trucks. The final archive claim certifies this building,
not the entire city-wide 3.0 opening.

## Unresolved platform and manual limits

- `v3-flutter-riverpod-a2ui-example` owns the complete application,
  Android/iOS runners, phone/tablet visuals, accessibility, offline behavior,
  and device smoke.
- `v3-flint-portable-contracts` owns the currently unavailable external live
  Flint compatibility dependency.
- The documentation changes own the full Prometheus Docusaurus content and
  protected GitHub Pages deployment.
- `v3-release-certification` owns one immutable cross-ecosystem evidence SHA.
- `v3-stable-publication` owns Pub.dev authority, credentials, publication,
  post-publish consumers, GitHub Release, and stable promotion.
- Two low production advisories remain visible; critical/high/moderate and
  blocking counts are zero under the release policy.

Publication is unauthorized. This verdict authorizes only KBD verification and
OpenSpec archive of this bounded change.

## Artifact Refiner QA

The named `v3-dart-graph-riverpod-archive` direct-content artifact converged in
one iteration. Manifest/constraint schemas, referenced files, six blocking
constraints, iteration consistency, and the persisted checkpoint pass. Its QA
receipt is `artifact-refiner-qa.md`; publication and full-release certification
remain explicitly false.

## Post-archive verification

OpenSpec archived the change at
`openspec/changes/archive/2026-08-02-v3-dart-graph-riverpod` and promoted
`openspec/specs/v3-dart-graph-riverpod/spec.md`. The generated promoted spec
initially contained a `TBD` purpose and a scenario path to the removed active
change. The post-archive audit replaced both with the durable library purpose,
reproducible verifier scenario, graph-ownership rule, bounded retry rule, and
optional-native boundary. The promoted spec, structural Dart verifier, coverage
ledger, and diff hygiene then passed.

Repository-wide strict OpenSpec validation reports 28 passing items and six
unrelated older archived/v4 definition failures:
`2026-06-22-v3-universal-platform-evolution`,
`2026-07-13-v4-prometheus-entity-sync`, `v4-dart-sdk`,
`v4-entity-sync-skill`, `v4-pem-sync-transport`, and `v4-tauri-plugin`.
They are recorded rather than hidden; the promoted Dart/Riverpod specification
itself passes strict validation.
