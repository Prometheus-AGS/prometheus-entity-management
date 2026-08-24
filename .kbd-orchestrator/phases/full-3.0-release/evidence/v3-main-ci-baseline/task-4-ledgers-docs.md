# Task 4 — Coverage, skills, and documentation evidence

Date: 2026-08-01
Change: `v3-main-ci-baseline`

## Coverage ledger

`examples/coverage.json` now records `release.ci.hermetic-main-baseline` as an implemented quality gate with its Cucumber feature, tags, dependency/advisory policies, and task evidence. It remains deliberately separate from:

- `release.contract.inventory-and-gates`, which validates the authoritative release inventory; and
- the five showcase records, which all remain `planned` and are not certified by a green main CI baseline.

The five stale abbreviated showcase owners were corrected to their real OpenSpec changes:

- `v3-vite-react19-example`
- `v3-nextjs-app-router-example`
- `v3-agentic-a2ui-example`
- `v3-flutter-riverpod-a2ui-example`
- `v3-tauri-universal-example`

The nonexistent `v3-docs-site` owner was corrected to `v3-docs-github-pages`, the release-aware deployment change that culminates the planned Docusaurus work.

`validateReleaseCoverage()` now rejects an abbreviated/wrong owner, missing baseline policy/evidence path, missing baseline quality gate, or wrong documentation deployment owner.

## Public documentation

- Added `release/ci-baseline.md` with the exact seven gates, default timeouts, pnpm/Node contract, local commands, dependency/advisory rules, and explicit limits.
- Updated the root and examples READMEs to distinguish implemented baseline evidence from planned showcase and Docusaurus work.
- Replaced unsafe historical single-package publication instructions in `RELEASING.md` with a v3 operator boundary: publication remains blocked until the candidate pipeline, immutable-SHA certification, and explicit stable approval exist.
- Linked the dependency and advisory policies from the release documentation.

## Skills and API ledger decision

The canonical skill bundle and v3 shared reference now require agents to consult the dependency/advisory policies before currentness or vulnerability claims and prohibit treating the CI baseline as showcase or publication certification.

No package entry point or runtime export changed in this change. Therefore `prometheus-entity-skills/_shared/references/library-exports.json` was intentionally not regenerated. `pnpm run verify:skills` confirms all 197 built runtime exports still match the ledger. This is the required no-change disposition, not a skipped synchronization check.

## Checks

| Check | Result |
| --- | --- |
| `pnpm run validate:release-contract` | Pass; 16 artifacts, 12 npm, 1 Dart, 3 Rust, 5 planned showcases |
| `pnpm run test:release-contract` | 10/10 pass, including exact coverage ownership failures |
| `pnpm run verify:skills` | Pass; 197 runtime exports match |
| `pnpm run bdd` | 10/10 scenarios, 57/57 steps |
| `pnpm run lint` | Pass |
| `openspec validate v3-main-ci-baseline --strict` | Pass |
| JSON parse and `git diff --check` | Pass |
| Relative-link check over nine changed documentation files | Pass; no missing relative targets |

The broader Docusaurus content, route, accessibility, screenshot, and GitHub Pages evidence remains owned by changes 21–26 and is not claimed here.
