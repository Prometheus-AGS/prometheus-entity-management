# PREP — Release-certification evidence inventory (v3-release-certification)

**Date:** 2026-08-23
**Status:** Preparation aid for the human-gated `v3-release-certification` run.
This document assembles and inventories existing receipts so the operator's
certification review starts complete. **It does not start, execute, or
partially complete the change** — no `tasks.md` items are touched, no
`/kbd-apply` has run, and the change remains PENDING behind the human gate.

## 1. What the change must deliver (plan §27)

- One **root release-check command** and an **immutable evidence manifest**
  spanning: frozen install, formatting, typecheck, tests, builds, packed
  consumers, package lint/type checks, audits, skills/snippets, all five
  examples, Dart/Flutter, Cargo/Tauri, docs, provenance, and registry dry runs.
- **Non-skipping results** for every mandatory lane; platform/manual evidence
  explicitly labeled.
- A clean tagged commit produces a complete **signed/hashed evidence bundle**.
- Every coverage scenario and artifact criterion resolves to evidence.
- Any missing mandatory lane **blocks certification** (fail-closed), never
  reports green.

## 2. Per-change receipt inventory (26 certified changes)

Verdicts read from each change's machine-readable receipt under
`.kbd-orchestrator/phases/full-3.0-release/evidence/<change>/`.

| Change | Receipt | Verdict |
| --- | --- | --- |
| v3-release-contract | `gate-results.json` | `blocked` (by design — publication stays blocked until certification + stable publication) |
| v3-main-ci-baseline | `clean-gates.json` | per-gate results (javascript/packaging/openspec/flutter) |
| v3-package-module-contracts | `clean-gates.json` | per-gate results incl. `tauriPackedRustBoundary` |
| v3-framework-neutral-core | `clean-gates.json` + `framework-neutral-core-report.json` | per-gate results incl. packed non-React consumer |
| v3-binding-singleton-contract | `clean-gates.json` + `final-binding-singletons-report.json` | six-binding packed singleton proof |
| v3-release-pipeline-rc | `final-verification.json` | `pass-change-certified-archive-ready-publication-blocked` |
| v3-example-coverage-contract | `clean-gates.json` | `pass` |
| v3-sync-persistence-path | `final-verification.json` | `pass` |
| v3-a2ui-protocol-bridge | `final-verification.json` | `pass-to-archive` |
| v3-a2a-conformance-agent | `final-verification.json` | `pass-to-archive` |
| v3-flutter-source-provenance | `final-verification.json` | `pass-to-archive` |
| v3-dart-graph-riverpod | `final-verification.json` | `pass-to-archive` |
| v3-tauri-mobile-plugin | `final-verification.json` | `pass-change-certified-archive-ready-publication-blocked` |
| v3-vite-react19-example | `final-verification.json` | `pass-archived` |
| v3-nextjs-app-router-example | `task-3-verification.json` + browser evidence | `pass` |
| v3-agentic-a2ui-example | `verification.json` | `pass` |
| v3-flutter-riverpod-a2ui-example | `verification.json` | `pass` (5/5 lanes) |
| v3-tauri-universal-example | `verification.json` | `pass` (incl. hashed desktop/Android/iOS-sim artifacts) |
| v3-flint-portable-contracts | `verification.json` | `pass` (4/4 lanes) |
| v3-skills-ecosystem | `verification.json` | `pass` (4/4 lanes) |
| v3-docs-foundation-brand | `verification.json` | `pass` (4/4 lanes) |
| v3-docs-api-reference | `verification.json` | `pass` (4/4 lanes) |
| v3-docs-concepts-packages | `verification.json` | `pass` (4/4 lanes) |
| v3-docs-examples-integrations | `verification.json` | `pass` (4/4 lanes) |
| v3-docs-operations-migration | `verification.json` | `pass` (5/5 lanes) |
| v3-docs-github-pages | `verification.json` + `quality.json` | `pass` (3/3 + 6/6 lanes) |

## 3. Artifact criterion → receipt map (16 contract artifacts)

| Contract artifact | Owning receipt(s) |
| --- | --- |
| npm-core (`entity-graph-core`) | v3-framework-neutral-core, v3-package-module-contracts, v3-release-pipeline-rc packed consumers |
| npm-react (`prometheus-entity-management`) | v3-package-module-contracts, v3-vite-react19-example, v3-release-pipeline-rc |
| npm-sdl | v3-package-module-contracts, v3-skills-ecosystem ledger gate |
| npm-sync | v3-sync-persistence-path (packed sync consumer) |
| npm-svelte / solid / alpine / htmx / web-components | v3-binding-singleton-contract (six-binding packed proof), v3-skills-ecosystem ledgers |
| npm-a2a | v3-a2a-conformance-agent (official SDK + TCK receipts, packed consumers) |
| npm-a2ui | v3-a2ui-protocol-bridge (official v0.9.1 engine, packed consumers, visual evidence) |
| npm-tauri | v3-tauri-mobile-plugin, v3-tauri-universal-example (embedded Rust disposition) |
| dart-flutter | v3-dart-graph-riverpod, v3-flutter-source-provenance, v3-flutter-riverpod-a2ui-example (`flutter pub publish --dry-run` clean) |
| rust-cli / rust-mcp | v3-package-module-contracts + v3-release-pipeline-rc native dry runs (`dry-run-only` dispositions) |
| rust-tauri | v3-tauri-mobile-plugin / v3-tauri-universal-example (`embedded-in-npm`) |

## 4. Coverage scenarios

`examples/coverage.json` is the scenario authority; its gate is
`pnpm run verify:example-coverage` (fail-closed evidence transitions,
`planned` never counts as implemented). The docs layer cross-checks scenario
IDs in every tutorial feature matrix (v3-docs-examples-integrations release
test). Certification must re-run the coverage gate on the tagged commit and
resolve every stable capability/artifact mapping to a receipt.

## 5. Gap analysis — what #27 must still build

1. **No root release-check command exists.** `package.json` has per-change
   `verify:*`/`test:*`/`bdd:*` gates and the `ci` umbrella, but no single
   `release:check` (name TBD) that runs the full mandatory lane set.
2. **No immutable evidence manifest or signed/hashed bundle.** Receipts are
   per-change directories with heterogeneous schemas (`result` vs `verdict` vs
   per-gate objects). #27 needs a manifest that enumerates every mandatory
   lane, hashes each receipt, and binds them to one immutable source SHA.
3. **Fail-closed lane registry.** The manifest must declare which lanes are
   mandatory vs platform/manual-labeled, and block on any missing mandatory
   lane. Known manual/platform items to label (from retained limits):
   Tauri device certification (iOS/Android physical), Flutter visual goldens
   are library-scope not app-scope, first live GitHub Pages deployment
   (operator-confirmed; workflow certified locally), npm trusted-publisher /
   GitHub environment reviewer configuration (external checks).
4. **Clean tagged commit requirement.** Certification must run from a tagged,
   clean tree — the run itself is the trigger for the tag.
5. **Registry dry runs** — `verify:release-pipeline` already rehearses packed
   consumers + npm dry-runs without mutation; #27 should reuse it as a lane.
6. **Verdict normalization** — older receipts use `verdict` strings
   (`pass-to-archive`, `pass-change-certified-archive-ready-publication-blocked`),
   newer ones use `result: pass` + lane maps. The manifest reader must accept
   both or the receipts need a normalization pass.

## 6. Suggested execution skeleton for the gated run

1. Operator authorizes `/kbd-apply v3-release-certification`.
2. Build `scripts/release-check.mjs`: lane registry (name, command, mandatory
   flag, platform/manual label), executor, receipt collector, SHA-256 hashing,
   manifest writer; root script + release test asserting non-skipping and
   fail-closed semantics.
3. Run from a clean tagged commit; produce the bundle under
   `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-certification/`.
4. Operator reviews the bundle; only then does `v3-stable-publication` open.

## 7. Operator pre-flight checklist (external, not provable in-repo)

- npm trusted-publisher configuration for the fixed group (12 packages).
- `npm-rc` GitHub environment reviewers configured.
- GitHub Pages enabled for the repository (source: GitHub Actions) so the
  certified `docs-pages.yml` can publish on its first main push.
- Protected npm tags snapshot readable for the pipeline's before/after check.
