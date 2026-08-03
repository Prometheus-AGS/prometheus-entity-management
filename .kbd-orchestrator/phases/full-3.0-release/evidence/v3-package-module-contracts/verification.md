# v3-package-module-contracts verification

Date: 2026-08-01  
Change: `v3-package-module-contracts`

## Verdict

**OpenSpec change:** strictly verified and archived on 2026-08-01; promoted spec validates.  
**Prometheus Entity Management 3.0 release:** blocked; this change certifies npm module, declaration, metadata, and tarball contracts only.

Every plan acceptance criterion has direct, reproducible evidence. The proof runs against all twelve packed npm candidates and does not substitute source imports, workspace aliases, or an already-published alpha. The machine reports are [`task-3-package-report.json`](task-3-package-report.json) and [`clean-gates.json`](clean-gates.json).

## Acceptance audit

| Plan requirement | Authoritative evidence | Verdict |
| --- | --- | --- |
| ESM and CommonJS use Node-valid, loader-specific files | All manifests route `import` to `dist/index.mjs` and `require` to `dist/index.cjs`; the generated consumers load all twelve package names | Pass |
| Conditional declarations distinguish import and require | All manifests route import types to `dist/index.d.ts` and require types to `dist/index.d.cts`; strict ATTW and TypeScript NodeNext/Node16/Bundler consumers pass | Pass |
| All twelve package manifests have normalized release metadata | `validateManifest()` checks package name, public status, type, author, MIT license, Node engine, repository URL/directory, homepage, issues URL, and explicit files | Pass — 12/12 |
| Every tarball passes Publint | The verifier runs Publint 0.3.22 with `--strict` against each `.tgz` | Pass — 12/12 |
| Every tarball passes Are The Types Wrong | The verifier runs ATTW 0.18.5 with the strict profile against each `.tgz` | Pass — 12/12 |
| Every tarball passes import and require | The generated ESM and CommonJS programs import/require every public package and reject empty export objects | Pass — 12/12 in one coherent candidate set |
| Representative TypeScript resolution modes pass | Tarball-only fixtures compile with `skipLibCheck: false` under NodeNext, Node16, and Bundler resolution | Pass |
| Core and SDL contain user-facing README content | The BDD suite checks the documented public entry points and graph invariants | Pass |
| Tarballs exclude unintended source and developer paths | Fail-closed payload and packed-manifest validation rejects root source trees, node_modules, environment files, workspace protocols, absolute dependencies, local paths, Cargo lockfiles, and files outside each allowlist | Pass — 12/12 |
| The bundled Tauri Rust boundary is intentional and usable | The tarball contains Cargo/build inputs, Rust source, schemas, and required `tauri.conf.json`, excludes `Cargo.lock`, passes Cargo metadata, and compiles from the unpacked npm artifact | Pass |

## Verification matrix

| Surface | Result |
| --- | --- |
| Fresh frozen pnpm install | Pass |
| Complete JavaScript CI | Pass |
| Typecheck/build | 17/17 and 14/14 tasks |
| Workspace package tests | 362 pass; one explicit external Flint skip and one benchmark todo |
| Release/CI/package contract tests | 11/11, 17/17, and 8/8 |
| Complete BDD | 15/15 scenarios, 81/81 steps |
| Focused package BDD | 5/5 scenarios, 24/24 steps |
| Skills-to-runtime ledger | 197/197 exports |
| Production npm audit policy | 309 dependencies; one low; zero moderate/high/critical; zero accepted blocker |
| OpenSpec | Active change and both prerequisite specs pass strict validation |
| Packed artifact tools | Publint 12/12; ATTW 12/12 |
| Packed runtime consumers | Node ESM and CommonJS pass |
| Packed type consumers | TypeScript NodeNext, Node16, and Bundler pass |
| Packed Tauri Rust crate | Cargo metadata and host `cargo check` pass |
| Integrity | Referenced JSON parses; `git diff --check` passes |

## Evidence-driven correction

The first clean-state Tauri tarball excluded `rust-plugin/tauri.conf.json`. The allowlist looked smaller, but the actual bundled `build.rs` calls `tauri_build::build()`, so Cargo failed before compiling the crate. The package allowlist, validation seam, mutation test, BDD scenario, and operator guide were corrected. A newly packed artifact then compiled successfully. This red-to-green result is preserved in [`task-5-clean-gates.md`](task-5-clean-gates.md).

## Unresolved platform and manual limits

- This is content verification from a dirty worktree at local HEAD `dd5d70c9954381d3af4519ccedeb5cb565d6027e`, not immutable-commit certification.
- The main CI baseline already owns the supported Node release matrix; this change adds current-Node packed consumers rather than claiming a second multi-version CI certification.
- The packed Tauri check proves host compilation, not desktop runtime, Android/iOS initialization, simulator/device execution, signing, generated mobile bindings, or final capability policy. Those belong to `v3-tauri-mobile-plugin` and `v3-tauri-universal-example`.
- Dart/Melos is not applicable because no Dart or Flutter source, manifest, lockfile, or artifact boundary changed.
- No rendered interface changed. Screenshots would not prove module resolution or tarball correctness, so visual evidence is truthfully not applicable here; it remains mandatory for the five showcase and Docusaurus changes.
- The core declaration graph still has a React type seam, and framework bindings have not yet proven one singleton. Those are explicit blockers owned by `v3-framework-neutral-core` and `v3-binding-singleton-contract`.
- No registry, provenance, RC, release notes, GitHub release, Docusaurus deployment, npm dist-tag, or `latest` mutation was attempted or authorized.

## Release impact

The npm package format foundation is now safe for downstream framework-neutrality, singleton, A2UI/A2A, sync, Tauri, examples, documentation, and release-pipeline work. The archived change promotes its narrow contract at `openspec/specs/v3-package-module-contracts/spec.md`; it does not certify the full 3.0 release or authorize stable publication.
