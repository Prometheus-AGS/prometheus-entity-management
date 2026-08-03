# Task 5 — clean-state verification receipt

## Scope and clean-state definition

This receipt covers `v3-a2a-conformance-agent` task 5 of 6. The repository had
248 active porcelain entries before verification because the wider 3.0 release
program is intentionally in progress. Stashing, resetting, or deleting that
work would destroy user-owned state and is not a valid clean-room technique.

The reproducible clean state used here is:

- Node `v24.16.0` and pnpm `10.33.0`;
- `pnpm install --frozen-lockfile` against SHA-256
  `19ef1dbfea784c871c163364524556595bbd3228fcf139e8f5b0cfb70c23aea2`;
- core and A2A builds that each report `Cleaning output folder` before emitting
  ESM, CommonJS, and declarations;
- package consumers installed only from freshly packed tarballs, with workspace
  aliases forbidden; and
- a fresh checkout of the immutable official TCK commit.

This proves clean generated artifacts without pretending the active release
worktree is committed or release-ready.

## Gate matrix

| Lane | Command/evidence | Result |
| --- | --- | --- |
| Frozen dependency graph | `pnpm install --frozen-lockfile` | Pass; all 15 workspaces, no resolution change |
| Clean package outputs | core build; A2A build | Pass; output directories cleaned and regenerated |
| Type safety | A2A package `typecheck` | Pass; strict TypeScript emitted no errors |
| Focused protocol/security tests | `pnpm run test:a2a-conformance` | Pass; 14 Vitest + 7 Node release tests |
| Lint | scoped ESLint over A2A package, verifiers, and BDD/release tests | Pass; zero warnings |
| OpenSpec | `openspec validate v3-a2a-conformance-agent --strict --no-interactive` | Pass; change valid |
| Release contract | `pnpm run validate:release-contract` | Pass; 16 artifacts, 12 npm packages, no errors |
| Shared coverage | `pnpm run verify:example-coverage` | Pass; 13/13 scenarios, 16 capabilities, 16 stable artifacts; overall still `in-progress`, `releaseCertified: false` |
| Skills/export ledgers | `pnpm run verify:skills` | Pass; React 201, sync 16, A2UI 18 + 9, A2A 30 + 2 |
| Ecosystem package contracts | `pnpm run verify:package-contracts` | Pass; 12 tarballs; ESM, CommonJS, NodeNext, Node16, and Bundler consumers |
| A2A packed consumers | `pnpm run verify:a2a-conformance` | Pass; official root and `./legacy`, ESM/CommonJS/NodeNext/Node16, no workspace aliases |
| Upstream protocol platform | `pnpm run test:a2a-tck` | Pass; pinned commit `5996b79f9cefa6fc390980e383e358a66fb9e49e`, JSON-RPC MUST 59 passed and 0 failed |
| BDD orchestration | `pnpm run bdd:a2a-conformance` | Pass; 7 scenarios, 37 steps, 4 hooks |
| Dependency security | `pnpm run security:audit` | Pass policy; 0 critical, 0 high, 0 moderate, 2 low, 0 blocking advisories |
| Whitespace/drift | `git diff --check` | Pass |

Machine receipts:

- `packed-consumer-report.json`, generated `2026-08-01T22:25:27.653Z`;
- `tck/receipt.json`, generated `2026-08-01T22:26:09.523Z`;
- `task-5-example-coverage-report.json`, generated
  `2026-08-01T22:23:29.774Z`.

The TCK receipt binds the dirty candidate revision plus exact ESM, CommonJS,
`.d.ts`, and `.d.cts` SHA-256 hashes. It records no failed applicable MUST and
no unexplained selected-binding skip.

## Relevant versus inapplicable lanes

| Toolchain/platform | Disposition | Reason |
| --- | --- | --- |
| pnpm/Node | Required and run | A2A, SDK, package, consumers, BDD, coverage, docs, and security are JavaScript-owned |
| OpenSpec | Required and run | This change is OpenSpec-backed and must validate strictly |
| HTTP/SSE loopback | Required and run | The official JSON-RPC binding and streaming lifecycle are the declared platform boundary |
| Dart/Melos | Not applicable to this change | The plan explicitly excludes Flutter rendering and this change modifies no Dart package contract |
| Cargo/Rust | Not applicable to this change | The plan explicitly excludes Tauri/native flows and this package has no Rust implementation boundary |
| Browser/device visual gate | Not applicable to this headless change | The later `v3-agentic-a2ui-example` owns rendered A2UI accessibility, browser, and visual receipts |

Not running unrelated Dart, Cargo, Flutter, Tauri, or decorative screenshot
lanes is an explicit scope decision, not a silent skip. Their absence cannot be
used as evidence for those platforms.

## Honest residual observations

- Vitest printed a future Vite native-config-loader warning for the repository's
  CommonJS-loaded root config. It did not affect this gate and is not evidence
  of A2A failure, but it remains visible for the owning build-configuration
  change.
- The security policy passes with two low-severity production findings; this is
  not a claim of zero vulnerabilities.
- The global coverage ledger remains `in-progress` and explicitly refuses full
  release certification.
- No registry mutation, GitHub Pages deployment, external-agent call, or model
  credential was used.

