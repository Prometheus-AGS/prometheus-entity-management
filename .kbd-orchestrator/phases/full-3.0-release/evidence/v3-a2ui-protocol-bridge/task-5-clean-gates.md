# Task 5 — clean-state gate evidence

Date: 2026-08-01  
Change: `v3-a2ui-protocol-bridge`

## Outcome

**PASS after two corrective clean runs.** A third fresh, unbuilt, source-only copy passed frozen installation, the complete repository CI chain, official A2UI runtime/policy tests, strict packed ESM/CommonJS/NodeNext/Node16 consumers, all twelve npm tarballs, hash-bound browser evidence, export ledgers, semantic/release validation, production security, and strict OpenSpec validation.

Machine-readable results are in [`clean-gates.json`](clean-gates.json). Packed receipts are in [`clean-a2ui-packed-consumer-report.json`](clean-a2ui-packed-consumer-report.json) and [`clean-package-contract-report.json`](clean-package-contract-report.json).

## Corrections found by clean verification

The first clean run exposed a real package defect: `@prometheus-ags/a2ui-react/dist/index.d.cts` statically referenced the ESM-only official `@a2ui/web_core/v0_9` declaration surface. The aggregate strict Node16 consumer failed, causing four package-contract BDD scenarios to fail. The same run also found a release-ledger assertion that still listed only the six pre-A2UI quality gates.

The repair preserves the CommonJS contract without `skipLibCheck`: the A2UI build now performs a deterministic, fail-closed declaration normalization that marks official protocol references as type-only and resolves them in import mode. The dedicated packed A2UI verifier now compiles a strict Node16/CommonJS consumer, so this exact regression is locally owned instead of being discovered only by the aggregate package suite.

The second clean run proved the package correction and found one remaining React-only skill-reference assertion. The reference now owns distinct React, sync, and A2UI ledgers, so the assertion was corrected to the actual invariant: a release-contract edit does not change a ledger unless its publishable entry point changes. Aggregate BDD then passed before the third clean room was created.

## Final clean-room protocol

- Created a new 26 MB source-only copy after each failed clean attempt.
- Excluded `.git`, all dependency trees, JavaScript/native build output, caches, coverage, tarballs, and native targets.
- Confirmed the final copy initially contained no `node_modules`, `dist`, `.next`, `.turbo`, `coverage`, `target`, `.dart_tool`, or `build` directories.
- Used Node 26.5.0, pnpm 10.33.0, and Darwin 25.6.0 arm64.
- Verified lockfile SHA-256 `a3f3a2d26c99b39b895a3e678ebec606c4e46f2bd0b3d4e682cda2f8a5470ab2`.
- Installed with `pnpm install --frozen-lockfile --prefer-offline`: 790 packages, 779 reused, zero downloaded across 15 workspaces.
- Ran the complete `pnpm run ci` chain and independent focused A2UI, package, visual, skills, coverage, release, security, and OpenSpec gates.

The original worktree is intentionally dirty with 228 entries at HEAD `dd5d70c9954381d3af4519ccedeb5cb565d6027e`. This certifies current source content, not an immutable commit, release candidate, registry artifact, or npm tag.

## Verified results

| Gate | Result |
| --- | --- |
| Complete CI | Pass; validate, lint, 17/17 typecheck tasks, 14/14 build tasks, tests, skills, security |
| Aggregate BDD | Pass; 40/40 scenarios, 219/219 steps, 4/4 hooks |
| Focused A2UI tests | Pass; 13 runtime/policy/React tests and 6 release guards |
| Packed A2UI | Pass; ESM, CommonJS, NodeNext, Node16, server render, no workspace aliases |
| Twelve-package contract | Pass; 12/12 payloads/manifests, Publint, ATTW, five consumer modes |
| Browser and visual | Pass; Chrome 150 desktop/mobile, keyboard-only actions, trace, video, hashes, WCAG, axe |
| Export ledgers | Pass; React 201, sync 16, A2UI root 18, AG-UI subpath 9 |
| Example/release validation | Pass; 13/13 semantic outcomes and 16-artifact contract; release still uncertified |
| Production security | Pass; 322 dependencies, two low, zero moderate/high/critical or blockers |
| Strict OpenSpec | Pass; active A2UI change and promoted release/package dependency specs |
| Changeset status | Pass; all twelve npm packages have patch entries |
| `git diff --check` | Pass |

The fresh A2UI runtime artifact matched SHA-256 `24ad752b2e48555badbe30c7b9406231745dcee00beee194270d10f9b5a58ee6`. Three nonempty screenshots retain immutable hashes, keyboard activation produced `executed`, `unauthorized-field`, and `approval-denied`, and axe reported zero critical or serious violations.

## Applicable and retained lanes

- **Browser/visual:** applicable and passed because A2UI renders an interactive protocol surface. Real desktop/mobile screenshots, keyboard execution, trace, video, focus/contrast/target checks, axe output, and artifact hashes are part of this gate.
- **Dart/Melos:** not applicable to this change because it owns no Dart/Flutter source, manifest, lockfile, generated code, or package boundary. Dedicated Dart/Riverpod and Flutter showcase changes retain those gates.
- **Cargo:** not directly applicable because this change owns no Rust source, manifest, capability, or native command. The twelve-package verifier still covered the packed Tauri npm boundary; native Cargo and device certification remain with the Tauri changes.
- **Docusaurus:** not applicable because the planned `website/` tree does not exist yet. The branded documentation changes retain build, link, accessibility, visual, and GitHub Pages deployment proof.

## Release impact

The official A2UI v0.9.1 renderer and default-deny graph policy now have clean-room runtime, packaging, declaration, browser, accessibility, documentation, and security evidence. This does not certify A2A conformance, the full agentic showcase, Flutter rendering, native desktop/mobile behavior, the Docusaurus site, immutable-SHA release certification, registry authority, or stable publication. Nothing in this task authorizes publication or movement of npm `latest`.
