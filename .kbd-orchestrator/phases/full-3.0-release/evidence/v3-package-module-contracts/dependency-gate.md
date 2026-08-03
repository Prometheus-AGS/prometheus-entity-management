# Task 1 — Dependency gate

Date: 2026-08-01  
Change: `v3-package-module-contracts`

## Verdict

**PASS.** Both declared prerequisites are complete and this change may proceed.

| Dependency | Completion evidence | Normative evidence | Result |
| --- | --- | --- | --- |
| `v3-release-contract` | `openspec/changes/archive/2026-08-01-v3-release-contract` and phase progress `COMPLETE` | `openspec/specs/v3-release-contract/spec.md` strictly validates | Pass |
| `v3-main-ci-baseline` | `openspec/changes/archive/2026-08-01-v3-main-ci-baseline` and phase progress `COMPLETE` | `openspec/specs/v3-main-ci-baseline/spec.md` strictly validates | Pass |

The phase compatibility projection records 2/28 completed changes and identifies `v3-package-module-contracts` as the active change. No undeclared prerequisite was found.

## Input contract inherited from the prerequisites

- The release inventory is exactly 12 public npm packages in one fixed-version group.
- Node 22, 24, and 26 clean frozen-install CI is green.
- The root lockfile is authoritative and package work must remain pnpm-only.
- Production npm critical/high advisories fail closed.
- Publication and npm `latest` remain prohibited; this change certifies artifacts without publishing them.
- Public API changes remain subject to the skills/export synchronization rule.

## Scope snapshot

A live manifest inventory found exactly 12 non-private package workspaces. All twelve currently declare:

- `"type": "module"`;
- `"main": "./dist/index.js"`;
- `"module": "./dist/index.mjs"`; and
- `"types": "./dist/index.d.ts"`.

That shared boundary is the known package defect: CommonJS output advertised through `main`/`exports.require` cannot safely use `.js` beneath `type: module`, and conditional declarations must distinguish ESM `.d.ts` from CommonJS `.d.cts` consumers.

The current `files` boundaries also confirm the planned metadata work:

- core and SDL publish only `dist`, so they lack user-facing README content;
- most packages omit changelog metadata/content from their declared payload;
- the Tauri npm package intentionally includes `rust-plugin`, which requires an explicit file-boundary decision rather than accidental publication.

## Candidate maintenance check

The plan references candidate `cand-018` (Publint plus Are The Types Wrong) conditionally on current maintenance. Registry metadata checked on 2026-08-01 resolves that condition:

| Tool | Current version | Last registry modification | License | Compatibility |
| --- | --- | --- | --- | --- |
| `publint` | 0.3.22 | 2026-07-23 | MIT | Package lint CLI |
| `@arethetypeswrong/cli` | 0.18.5 | 2026-07-09 | MIT | Node `>=20`, compatible with Node 22/24/26 |

Both tools are suitable mandatory packed-artifact gates. Direct isolated import/require/TypeScript consumers remain mandatory even when both linters pass.

## Feynman transfer rule

A monorepo build answers “can repository source compile under workspace resolution?” A packed consumer answers the materially different question “does the artifact a user receives contain loader-correct files, exports, peers, and declarations?” Therefore task 2 must repair the tarball contract itself; it must not substitute source aliases, direct `dist` checks, or a green workspace test for packed ESM/CJS/type evidence.

## Explicit boundaries for task 2

- Repair all twelve packages consistently; no representative-package shortcut.
- Test tarballs, not workspace source aliases.
- Require Node ESM import, Node CommonJS require, Publint, ATTW, and representative TypeScript module-resolution modes.
- Normalize engines, repository, README, changelog, and `files` metadata without expanding runtime API scope.
- Keep framework-neutral-core refactoring, binding singleton certification, and release publication in their separately owned changes.
- This change has no rendered UI; visual evidence remains not applicable here and mandatory for later showcase/docs changes.
