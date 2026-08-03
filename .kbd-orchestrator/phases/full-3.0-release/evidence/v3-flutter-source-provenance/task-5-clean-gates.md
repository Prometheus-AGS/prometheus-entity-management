# Task 5 — clean-state gate evidence

Date: 2026-08-02  
Change: `v3-flutter-source-provenance`

## Outcome

**PASS after one corrective clean run.** A second fresh, initially clean, Git-preserving source snapshot passed frozen installation, the complete repository CI chain, focused provenance tests and BDD, portable-history verification, all twelve npm package contracts, export ledgers, semantic/release validation, production security, strict OpenSpec validation, changeset status, and integrity checks.

Machine-readable results are in [`clean-gates.json`](clean-gates.json). Focused receipts are in [`clean-provenance-verification.json`](clean-provenance-verification.json), [`clean-cucumber.json`](clean-cucumber.json), [`clean-example-coverage-report.json`](clean-example-coverage-report.json), and [`clean-package-contract-report.json`](clean-package-contract-report.json).

## Correction found by clean verification

The first clean room exposed a real stale test contract. The release ledger correctly contained the A2A conformance and Flutter source-provenance quality gates, but the aggregate release-contract BDD expectation still ended at A2UI. Complete CI therefore failed one of 61 scenarios while the other 60 passed.

The expectation was corrected to include `release.protocol.a2a-jsonrpc-v1` and `release.flutter.source-provenance`. The focused release-contract BDD passed, and verification restarted from a new clean room rather than reusing the failed build tree.

## Final clean-room protocol

- Cloned the repository without local hard-link reuse, overlaid the current worktree content, and created a disposable snapshot commit only inside the temporary clone.
- Excluded `.git` from the overlay plus all dependency trees, JavaScript/native build output, caches, coverage, tarballs, `.dart_tool`, and Flutter build output.
- Confirmed the final snapshot was initially clean, contained zero excluded output directories, and retained provenance merge `eb3c9802da5ff10ad6db135fed761bd23ea80b3f` as an ancestor.
- Final disposable snapshot commit: `125703172cb496eea3cbe64098e6856e9a0a380a`.
- Used Node 26.5.0, pnpm 10.33.0, and Darwin 25.6.0 arm64.
- Verified lockfile SHA-256 `19ef1dbfea784c871c163364524556595bbd3228fcf139e8f5b0cfb70c23aea2`.
- Installed with `pnpm install --frozen-lockfile --prefer-offline`: 793 packages, 782 reused, zero downloaded.
- Ran the complete `pnpm run ci` chain, then independent focused provenance, package, coverage, OpenSpec, and changeset gates.

The original worktree is intentionally dirty with 259 entries at HEAD `eb3c9802da5ff10ad6db135fed761bd23ea80b3f`. This certifies the current source content under assessment, not an immutable release candidate, npm/pub.dev registry artifact, npm tag, or GitHub Pages deployment.

## Verified results

| Gate | Result |
| --- | --- |
| Frozen install | Pass; 793 packages, 782 reused, zero downloaded |
| Complete CI | Pass; release/coverage validation, lint, typecheck, 14/14 build tasks, tests, skills, security |
| Aggregate BDD | Pass; 61/61 scenarios, 313/313 steps, 4/4 hooks |
| Focused provenance tests | Pass; 12/12 verifier tests |
| Focused provenance BDD | Pass; 14/14 scenarios, 56/56 steps |
| Portable provenance | Pass; 8 retained commits, 218 pruned from 226 examined, 12-file canonical source authority |
| Twelve-package contract | Pass; 12/12 payloads/manifests, Publint, ATTW, ESM/CJS/NodeNext/Node16/Bundler/tarball-only consumers |
| Export ledgers | Pass; React 201, sync 16, A2UI 18 + 9 compatibility, A2A 30 + 2 legacy |
| Example/release validation | Pass; 13/13 semantic outcomes and 16 stable artifacts; release remains uncertified |
| Production security | Pass; 325 dependencies, two low, zero moderate/high/critical or blockers |
| Strict OpenSpec | Pass; active Flutter provenance change |
| Changeset status | Pass; all twelve npm packages retain patch entries |
| `git diff --check` | Pass |

## Dart, Melos, Cargo, documentation, and visual applicability

The canonical `packages/entity_graph_flutter` package received a separate pristine-package probe with Flutter 3.47.0 beta and its bundled Dart 3.13.0 beta. Offline locked dependency resolution passed, `dart analyze` found zero issues, and all 54 Flutter tests passed.

That probe also established the downstream migration boundary instead of hiding it:

- `dart format --output=none --set-exit-if-changed lib test` reports six files that Dart 3.13 would reformat.
- Flutter 3.47 beta adds build and platform exclusions to `analysis_options.yaml` during dependency resolution.
- The committed graph resolves Riverpod/Flutter Riverpod 2.6.1 while 3.3.2 is available, alongside other incompatible major updates.
- No `melos.yaml` exists yet.

These are not source-provenance failures. Formatting, analyzer-policy adoption, Riverpod 3 adaptation, generated code, Dart workspace setup, and complete Dart platform certification are explicitly owned by `v3-dart-graph-riverpod`. The probe ran only in disposable copies; this task did not mutate the canonical package to claim work owned by that later change.

Cargo is not applicable because this change owns no Rust source, manifest, Tauri capability, generated binding, or native command. Native desktop/mobile proof remains with the Tauri changes.

The future `website/` tree is not present, so Docusaurus build, link, accessibility, branded visual, and GitHub Pages deployment proof remain with the documentation changes. Current documentation gates passed through release validation and the provenance verifier.

The deterministic lineage SVG and reviewed PNG are applicable headless visual evidence and passed their hash checks. They deliberately make no Flutter renderer, browser/device, or accessibility claim; the Flutter showcase owns those proofs.

## Known non-blocking output

- The isolated clean room skipped the optional Flint live integration because the sibling SDK was not resolvable there.
- One core benchmark remains marked `todo`.
- Vite native-loader and Turbo output warnings were emitted without failed gates.

These messages are recorded for honesty and were not used as provenance evidence.

## Release impact

The project now has clean-room proof for Flutter source chain of custody, history pruning, canonical ownership, license preservation, documentation, release ledgers, tamper rejection, deterministic lineage evidence, and non-public provenance imports. This does **not** certify Riverpod 3, Flutter UI rendering, native desktop/mobile behavior, the Docusaurus site, an immutable release SHA, registry authority, or stable publication. Nothing in this task authorizes npm/publication or movement of `latest`.
