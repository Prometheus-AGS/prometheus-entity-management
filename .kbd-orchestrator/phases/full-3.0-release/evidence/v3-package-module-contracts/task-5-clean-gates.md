# Task 5 — Clean-state gate evidence

Date: 2026-08-01  
Change: `v3-package-module-contracts`

## Outcome

**PASS after one evidence-driven payload correction.** A new source-only copy passed a frozen pnpm install and the complete CI chain. A separate packed-candidate run then passed all twelve tarballs, all declaration tools, and all five consumer modes. The bundled Tauri Rust crate also compiles from the unpacked npm tarball.

Machine-readable results are in [`clean-gates.json`](clean-gates.json).

## Clean-room protocol

- Created a new copy of the current worktree rather than reusing workspace `node_modules` or build output.
- Excluded `.git`, dependencies, JavaScript/native build output, caches, coverage, and tarballs.
- Ran `pnpm install --frozen-lockfile` with pnpm 10.33.0 and Node 24.16.0.
- Verified lockfile SHA-256 `ad8d1a9cde243830542eabdc1577d4e76b095d5048f0edee4128de61a6f54af9`.
- Ran the complete `pnpm run ci` chain from that fresh copy.
- Ran the packed verifier again after CI rather than relying only on the Cucumber invocation embedded in the test gate.

The worktree is intentionally dirty and its source HEAD is `dd5d70c9954381d3af4519ccedeb5cb565d6027e`. This certifies the current content, not an immutable commit or registry artifact.

## JavaScript and package gates

| Gate | Result |
| --- | --- |
| Frozen pnpm install | Pass |
| Release-contract validation | Pass |
| Lint | Pass |
| Typecheck | Pass — 17/17 tasks |
| Build | Pass — 14/14 tasks |
| Workspace tests | Pass — 362 tests; one explicit Flint skip and one benchmark todo retained |
| Release contract tests | Pass — 11/11 |
| Main CI baseline tests | Pass — 17/17 |
| Package contract tests | Pass — 8/8 |
| Complete BDD suite | Pass — 15/15 scenarios, 81/81 steps |
| Skills ledger | Pass — 197/197 runtime exports |
| Production security policy | Pass — 309 dependencies; one low, zero moderate/high/critical, zero accepted blocker |
| Strict OpenSpec | Pass — active change and both prerequisite specs |
| JSON parse and `git diff --check` | Pass |

The isolated artifact verifier produced these independent results:

| Packed proof | Result |
| --- | --- |
| Manifest and payload allowlists | 12/12 pass |
| Publint 0.3.22 | 12/12 pass |
| Are The Types Wrong 0.18.5 | 12/12 pass |
| Node ESM and CommonJS | Pass |
| TypeScript NodeNext, Node16, and Bundler | Pass |
| Internal dependency resolution | One tarball-only candidate set; no registry-alpha mixing |

## Native tarball red-to-green finding

The initial Tauri allowlist excluded `rust-plugin/tauri.conf.json` as local configuration. That looked minimal but was incorrect: the shipped `build.rs` calls `tauri_build::build()`, which reads that file. A standalone `cargo check` against the unpacked npm tarball failed with:

```text
unable to read Tauri config file .../rust-plugin/tauri.conf.json because entity not found
```

The package allowlist, validator, unit test, BDD step, and operator documentation now include this required build input. A new tarball then passed both `cargo metadata --no-deps` and full `cargo check`; Cargo compiled `entity-graph-tauri v3.0.0-alpha.0` directly from the unpacked npm artifact.

The Cargo lockfile remains excluded, which is appropriate for the bundled library crate. [Tauri's official SQL plugin build script](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/sql/build.rs) uses `tauri_plugin::Builder`; migrating this app-style build boundary and generating final permissions belongs to `v3-tauri-mobile-plugin`, not this packaging correction.

## Applicable and deferred gates

- Dart/Melos is not applicable: no Dart/Flutter source, package metadata, or lockfile changed.
- Documentation traceability is executable in the package BDD scenario; a Docusaurus build is not yet applicable because the documentation site is owned by the later documentation changes.
- The host packed-crate check proves compilability, not desktop/mobile runtime behavior, simulator/device execution, signing, generated mobile bindings, or final permission policy.
- No rendered UI changed, so screenshots would not provide truthful evidence. Visual certification remains mandatory for the example and documentation changes that render interfaces.

## Release impact

This change can proceed to final verification because every acceptance criterion for module formats, declarations, metadata, payload boundaries, and packed consumers now has reproducible evidence. It does not authorize an RC, stable publication, npm `latest`, or the full 3.0 release; those remain blocked by the remaining phase changes and manual authority gates.
