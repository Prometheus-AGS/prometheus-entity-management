# Task 5 — clean verification gates

Date: 2026-08-03
Change: `v3-nextjs-app-router-example`
Candidate versions: core and React `3.0.0-rc.1`
Result: PASS

## Clean packed production boundary

`pnpm run verify:nextjs-app-router --report
.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/task-5-verification.json`
passed from the continuation worktree. The verifier built and packed core plus
React, copied the example into an external application, replaced both workspace
dependencies with those tarballs, installed with strict peers, type-checked,
preserved and validated the checked-in Next config, ran a Next.js 16 production
build, started `next start`, and executed Chromium.

The retained receipt records:

- 8/8 structural contract tests;
- 8/8 core, 5/5 React, and 3/3 Next-focused unit tests;
- 12 concurrent production requests with 12 unique request graph IDs;
- zero duplicate hydration fetches and zero hydration errors;
- client-route graph persistence and document-reload graph replacement;
- confirmed Server Action mutation and scoped realtime takeover;
- zero serious or critical axe violations;
- one screenshot and two traces with SHA-256 hashes in the JSON report;
- byte-identical checked-in/packed Next config with no workspace source alias,
  SHA-256 `49ebd9f84c79dde5cac32bf1909c674b21897948c837205ddc66ef97df25c4e3`;
- packed core SHA-256
  `6f7b30420be61a7746671408812d41d792d8cb9a5627934286956ce092a833fc`;
- packed React SHA-256
  `e1b39d490f949253d54a1594ef78cfee8d2071ca7b1a5a67b72df14182879c6e`.

The first browser attempt observed four serious light-theme contrast failures.
The light Prometheus ember token was changed from `224 78 40` to `180 57 8`;
the measured worst relevant text/background combination is 4.63:1. The clean
rerun then reported zero serious and zero critical accessibility findings.

## Additional gates

| Gate | Result |
| --- | --- |
| Core TypeScript | PASS |
| React TypeScript | PASS |
| Next.js TypeScript | PASS |
| React skills/export ledger | PASS — 203 runtime exports |
| Shared example verifier | PASS — 13/13 scenarios |
| Example coverage regression | PASS — 14/14 tests |
| Release-contract validator | PASS — 16 artifacts, 2 implemented and 3 planned showcases |
| Changesets status | PASS — fixed 12-package patch candidate recorded |
| Strict OpenSpec validation | PASS |
| Security audit | PASS — 0 critical, 0 high, 0 blocking advisories; 2 low |
| JSON parsing and `git diff --check` | PASS |

The successful receipt promoted only the Next.js showcase and its SSR/browser
evidence from `planned` to `implemented`. Overall release coverage remains
`in-progress`; the agentic A2UI, Flutter/Riverpod, and universal Tauri
showcases remain planned.

## Not-applicable gates and remaining limits

Dart/Melos, Cargo, Flutter device, and Tauri platform commands are not relevant
to this Next.js-only task and were not run. The browser receipt uses deterministic
local fixtures and does not establish a live hosted backend, npm registry
publication, stable `3.0.0`, or completion of the remaining showcase portfolio.
Those are separate KBD changes and release gates.
