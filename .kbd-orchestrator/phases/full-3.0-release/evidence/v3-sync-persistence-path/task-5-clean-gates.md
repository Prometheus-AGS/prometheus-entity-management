# Task 5 — clean-state gate evidence

Date: 2026-08-01  
Change: `v3-sync-persistence-path`

## Outcome

**PASS.** A fresh source-only copy of the repaired current worktree passed frozen installation, the complete repository CI chain, focused persistence/convergence tests, focused BDD, independent packed sync consumers, the independent twelve-tarball package contract, and strict OpenSpec validation. The clean run found one stale release-ledger expectation on its first attempt; that assertion was corrected, proved with its focused BDD scenario, and the clean room was rebuilt from scratch before this passing run.

Machine-readable results are in [`clean-gates.json`](clean-gates.json). Tarball receipts are in [`clean-package-contract-report.json`](clean-package-contract-report.json) and [`clean-sync-packed-consumer-report.json`](clean-sync-packed-consumer-report.json).

## Clean-room protocol

- Created a new 21 MB source-only copy after the first clean run exposed the stale ledger assertion.
- Excluded `.git`, all dependency trees, JavaScript/native build output, caches, coverage, tarballs, and native targets.
- Confirmed the copy initially contained no root/package `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, `target`, `.dart_tool`, or `build` directories.
- Used Node 24.16.0, pnpm 10.33.0, and Darwin 25.6.0 arm64.
- Verified lockfile SHA-256 `ab31dc4f8b3a48596d63b89a5061cff8ca4a37b42dc2676c4cc18670ab81308e`.
- Installed with `pnpm install --frozen-lockfile --prefer-offline`: 777 packages, 766 reused, zero downloaded.
- Ran the complete `pnpm run ci` chain, then reran the focused sync, BDD, all-tarball, and OpenSpec gates.

The original worktree is intentionally dirty with 210 entries at HEAD `dd5d70c9954381d3af4519ccedeb5cb565d6027e`. This certifies current source content, not an immutable commit, release candidate, registry artifact, or npm tag.

## Complete JavaScript and package gate

| Gate | Result |
| --- | --- |
| Frozen install | Pass; 777 locked packages, zero downloads |
| Release/example validation | Pass; 16 artifacts, 13/13 semantic outcomes, 5 planned showcases, release remains uncertified |
| ESLint | Pass; zero warnings/errors |
| Typecheck | Pass; 17/17 tasks |
| Build | Pass; 14/14 tasks, including Vite and Next.js production builds |
| Complete workspace tests | Pass; all package and release guard suites completed |
| Complete BDD | Pass; 33/33 scenarios, 181/181 steps |
| Focused persistence/convergence tests | Pass; 17/17 across real PGlite, Loro/relay, and release guards; zero skips/todos |
| Focused sync BDD | Pass; 5/5 scenarios, 27/27 steps |
| Skills/export ledgers | Pass; React 201/201 and sync 16/16 runtime exports |
| Production security | Pass; 309 dependencies, one low, zero moderate/high/critical or blockers |
| Strict OpenSpec | Pass; active change plus release, package, and example dependency specs |
| Changeset status | Pass in original git worktree; all 12 npm packages have patch entries |
| `git diff --check` | Pass |

## Persistence and convergence proof

- A real PGlite filesystem database was closed, reopened, and verified for durable entity/list state.
- Two Loro clients converged under forward and reverse delivery order, disconnect queuing, and reconnect.
- A real `ws` relay was terminated and restored; convergence after reconnect is mandatory rather than conditionally skipped.
- Packed core and sync tarballs passed Node ESM, Node CommonJS, TypeScript NodeNext, and loopback convergence consumers.
- Mandatory sync receipts contain no skip or todo path.

The broader package verifier independently rebuilt all twelve candidate tarballs and passed manifest/payload allowlists, Publint 0.3.22, Are The Types Wrong 0.18.5, Node ESM/CommonJS, and TypeScript NodeNext/Node16/Bundler consumers using a tarball-only candidate set.

## Applicable and non-applicable lanes

- **Dart/Melos:** not applicable. This change owns no Dart/Flutter source, `pubspec.yaml`, lockfile, generated code, or Dart package boundary. The dedicated Dart/Riverpod and Flutter showcase changes retain those mandatory gates.
- **Cargo:** not applicable. This change owns no Rust source, Cargo manifest, Tauri capability, generated binding, or native command behavior. The Tauri plugin and universal showcase changes retain Cargo, desktop, Android, and iOS gates.
- **Docusaurus:** not applicable because the planned `website/` directory does not yet exist. The documentation changes must later build, link-check, accessibility-test, render, and deploy the branded site.
- **Browser/device/visual:** not applicable to this headless storage and package change because it renders no interface. This is not a waiver: downstream showcases must still supply real browser/device execution, accessibility, screenshots, traces, video/goldens, and hash receipts.

## Known non-blocking output

The full clean run retains one explicit external Flint integration skip and one benchmark todo; neither is used as sync evidence. Existing Next.js migration messages, a Vite chunk-size warning, Vitest native-loader warnings, and Turbo output-declaration warnings remain visible and assigned to later plan owners.

## Release impact

The 3.0 sync/persistence path now has clean-room evidence for durable PGlite storage, deterministic Loro convergence, real relay recovery, packed consumers, public-export drift protection, and production dependency security. Flutter/Dart synchronization, native Tauri storage, rendered showcases, branded Docusaurus/Pages, cross-platform release artifacts, provenance, RC rehearsal, immutable-SHA certification, registry authority, and stable publication remain open. Nothing in this task authorizes publication or movement of npm `latest`.
