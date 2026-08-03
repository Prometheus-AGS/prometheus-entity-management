# Task 5 — clean-state gate evidence

Date: 2026-08-01  
Change: `v3-example-coverage-contract`

## Outcome

**PASS.** Two independent source-only copies of the current worktree passed frozen installation and the complete named CI chain. The first also produced dedicated semantic-contract, focused BDD, independent twelve-tarball package, strict OpenSpec, documentation, and whitespace receipts. The second contained the finalized task-5 ledger and repeated the entire frozen install plus CI chain successfully.

Machine-readable results are in [`clean-gates.json`](clean-gates.json). Dedicated outputs are [`clean-example-coverage-report.json`](clean-example-coverage-report.json), [`clean-cucumber.json`](clean-cucumber.json), and [`clean-package-contract-report.json`](clean-package-contract-report.json).

## Clean-room protocol

- Created two new 20 MB source-only copies of the current worktree.
- Excluded `.git`, all dependency trees, JavaScript/native build output, caches, coverage, tarballs, and native targets.
- Confirmed the copy initially contained no root/package `node_modules`, `dist`, `.next`, or `.turbo` directories.
- Used Node 26.5.0, pnpm 10.33.0, and Darwin 25.6.0 arm64.
- Verified lockfile SHA-256 `5f09387a332476c5d055c83f6e68b337c0f1bb3ca809fb98a7032a7d73b38836`.
- Ran `pnpm install --frozen-lockfile --prefer-offline`, then the complete `pnpm run ci` chain in the first copy.
- Reran the focused semantic, BDD, package, and OpenSpec gates after CI.
- After adding the task-5 evidence references to `examples/coverage.json`, created a second independent source-only copy and reran the frozen install and complete CI chain against that exact final ledger.

The original worktree is intentionally dirty with 189 entries at HEAD `dd5d70c9954381d3af4519ccedeb5cb565d6027e`. This certifies current source content, not an immutable commit, RC, registry artifact, or npm tag.

## Complete JavaScript and documentation gate

| Gate | Result |
| --- | --- |
| Frozen install | Pass; 774 packages |
| Release/example validation | Pass; 16 artifacts, 13/13 semantic outcomes, 16 stable capabilities/artifacts, 5 planned showcases |
| ESLint | Pass; zero warnings/errors |
| Typecheck | Pass; 17/17 tasks |
| Build | Pass; 14/14 tasks, including Vite and Next.js production builds |
| Workspace package tests | Pass; 365 tests, one explicit Flint skip, one benchmark todo |
| Release/CI/package/framework/singleton/example guards | Pass; 14 + 17 + 8 + 4 + 5 + 13 tests |
| Complete BDD | Pass; 28/28 scenarios, 154/154 steps |
| Focused example BDD | Pass; 4/4 scenarios, 27/27 steps |
| Skills/export ledger | Pass; 201/201 runtime exports |
| Production security | Pass; 309 dependencies, one low, zero moderate/high/critical or blockers |
| Strict OpenSpec | Pass; active change and promoted release-contract spec |
| Documentation/skill paths | Pass; 9/9 present and nonempty, with BDD content assertions |
| `git diff --check` | Pass |

The clean semantic report retains `overallCoverageStatus: in-progress` and `releaseCertified: false`. Passing this change cannot silently promote a showcase.

## Independent package proof

The independent packed verifier rebuilt all twelve candidates and proved:

- manifest and payload allowlists pass for 12/12 tarballs;
- Publint 0.3.22 and Are The Types Wrong 0.18.5 pass for 12/12;
- Node ESM and CommonJS consumers pass;
- TypeScript NodeNext, Node16, and Bundler consumers pass; and
- one tarball-only candidate set is used with no registry-alpha mixing.

This confirms that the stable artifact IDs referenced by the semantic ledger still resolve to the release's checked package inventory. It does not convert semantic scenarios into packed showcase behavior.

## Applicable and non-applicable lanes

- **Dart/Melos:** not applicable. This change owns no Dart/Flutter source, `pubspec.yaml`, lockfile, generated code, or package boundary. The Dart/Riverpod and Flutter showcase changes retain those mandatory gates.
- **Cargo:** not applicable. This change owns no Rust source, Cargo manifest, capability, generated binding, or native command behavior. The Tauri plugin and universal showcase changes retain Cargo, desktop, Android, and iOS lanes.
- **Docusaurus:** not applicable because the planned `website/` directory does not yet exist. The documentation changes must later build, link-check, accessibility-test, render, and deploy it.
- **Browser/device/visual:** not applicable to this headless contract because it renders no interface. This is not a waiver: the five downstream showcases must still supply real browser/device execution, accessibility, screenshots, traces, video/goldens, and hash receipts.

## Known non-blocking output

The clean run retains one explicit external Flint integration skip and one benchmark todo. Existing Next.js migration messages, a Vite chunk-size warning, Vitest native-loader warnings, and Turbo output-declaration warnings remain visible. None are used as example-contract evidence, and all remain assigned to later plan owners.

## Release impact

The shared semantic contract is clean-room green and can proceed to final verification. All five showcases, native implementations, visual certification, branded Docusaurus/Pages, provenance, RC rehearsal, immutable-SHA certification, registry authority, and stable publication remain open. Nothing in this task authorizes publication or movement of npm `latest`.
