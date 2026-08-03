# Task 3 verification receipt — v3-a2a-conformance-agent

Date: 2026-08-01

## Outcome

The A2A v1 JSON-RPC package now has reproducible unit, lifecycle, security, upstream-conformance, packed-consumer, and BDD checks for the plan acceptance criteria.

## Green gates

| Gate | Result |
| --- | --- |
| `pnpm run test:a2a-conformance` | PASS — 14 Vitest checks and 6 Node release-contract checks |
| `pnpm run verify:a2a-conformance` | PASS — packed ESM, CommonJS, NodeNext, Node16, official root, and legacy subpath |
| `pnpm run test:a2a-tck` | PASS — official pinned TCK, 93 passed / 172 explicitly skipped; selected JSON-RPC MUST 59 passed / 0 failed |
| `pnpm run bdd:a2a-conformance` | PASS — 6 scenarios / 30 steps |
| `pnpm --filter @prometheus-ags/entity-graph-a2a build` | PASS — ESM, CommonJS, and both declaration formats |
| `pnpm --filter @prometheus-ags/entity-graph-a2a typecheck` | PASS — strict source declaration check |
| `pnpm exec eslint <task-3 files> --max-warnings 0` | PASS — zero warnings |

## Upstream evidence binding

- SDK: `@a2a-js/sdk@1.0.1`
- protocol family: A2A `1.0`
- selected binding: `JSONRPC`
- TCK repository: `https://github.com/a2aproject/a2a-tck.git`
- immutable TCK commit: `5996b79f9cefa6fc390980e383e358a66fb9e49e`
- receipt schema: `2`
- process exit: `0`
- applicable MUST failures: none
- unexplained selected-binding skips: none
- AgentCard MUST failures: none
- repository revision: `dd5d70c9954381d3af4519ccedeb5cb565d6027e`
- worktree dirty: `true` (expected during phase execution; the exact built candidate is bound by the hashes below)

The 14 JSON-RPC skips are individually named and explained in `tck/receipt.json`: streaming-disabled, missing-required-extension, extended-card, and push-notification scenarios are inapplicable because the AgentCard truthfully enables streaming, declares no required extensions, and disables extended-card and push-notification capabilities. An unrecognized future skip blocks the runner.

## Immutable artifacts

| Artifact | SHA-256 |
| --- | --- |
| candidate `dist/index.mjs` | `676d863078963bb17edb56cb373e903ae86b5b2c2d467b7d02164b92fc0ed4d5` |
| candidate `dist/index.cjs` | `a73240c3c61ded82d55799464594f7f96578f6f8bd3bd478b5e7da91487b9caa` |
| candidate `dist/index.d.ts` | `1dec6104fb34941e4dbfb70caf112f8474fd21e0e25ec5fedd709c83b9320e33` |
| candidate `dist/index.d.cts` | `3122ffc08294204667ca5808c0ab0618acee67d4f60054bd0d9b44cd4967e5f4` |
| `tck/compatibility.json` | `05de1f4bed160bbead327913c5faf70a87be273641bfd124c0c970f8e995186d` |
| `tck/compatibility.html` | `00e2016de1ac9ced07f8210708dbf7ee210726452cbeb86af7c1fe7fd51bb3e4` |
| `tck/tck_report.html` | `73cc78cce63a93439530da8ab9474d41c77282f247369f9ea12b75d830d71e77` |
| `tck/junitreport.xml` | `0ab7b67e4b1521121fb20e166e3a3cbcde5c9cf3b3be035e433eb1b2e90b4563` |

The full hashes, byte counts, candidate revision, command, raw stdout, and raw stderr are recorded in `tck/receipt.json`.

## Packed artifact evidence

`packed-consumer-report.json` records:

- canonical core and A2A tarball payload/manifest validation;
- no `workspace:`, absolute `file:`, or local developer path leakage;
- exact SDK dependency `1.0.1` in the packed manifest;
- ESM and CommonJS runtime loading;
- NodeNext and Node16 declaration compilation with `skipLibCheck: false`;
- official root lifecycle and discovery; and
- the pre-v3 adapter only from `@prometheus-ags/entity-graph-a2a/legacy`.

## Visual evidence boundary

This change owns a headless transport/server package. Screenshots would be decorative and are therefore intentionally absent. It verifies deterministic A2UI artifact protocol and metadata, but it does not claim renderer or accessibility certification. Real browser, keyboard, accessibility, and screenshot evidence remains assigned to `v3-agentic-a2ui-example`.
