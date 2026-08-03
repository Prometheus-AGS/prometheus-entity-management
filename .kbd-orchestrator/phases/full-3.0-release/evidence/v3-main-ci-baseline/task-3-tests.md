# Task 3 — BDD and automated test evidence

Date: 2026-08-01
Change: `v3-main-ci-baseline`

## Behavior contract

The feature file `tests/features/ci/v3-main-ci-baseline.feature` defines five release-operator behaviors with 25 executable steps:

1. the root lockfile is the only JavaScript workspace lock and no external sibling link can satisfy a dependency;
2. selected runtime/toolchain versions satisfy the promoted v3 ranges and every registry-latest hold has an explicit rationale and revisit owner;
3. CI covers Node 22/24/26, every named gate has a finite timeout, and failures identify the responsible gate;
4. production audit policy fails closed for undispositioned or invalid high/critical exceptions while keeping lower severities visible;
5. Next.js and Vite build configuration remains self-contained after dependency removal and framework upgrades.

## Red phase

The scenarios were run before step definitions existed. The captured result in `bdd-red.md` was 5 undefined scenarios and 25 undefined steps. This proves the new behavior was not being credited to unrelated release-contract coverage.

## Defect found by the exact BDD command

After the steps passed through direct `cucumber-js`, the package script used by CI still failed because tsx's CommonJS transform rejected top-level await in `scripts/run-ci-gate.mjs`. The runner did not need top-level await: its child process supplies the active event-loop handle and `main()` owns its rejection handling. Changing the direct-execution call to `void main()` made the exact checked-in command pass.

## Green evidence

| Command | Result |
| --- | --- |
| `pnpm run bdd:ci-baseline` | 5/5 scenarios, 25/25 steps |
| `pnpm run bdd` | 10/10 scenarios, 57/57 steps across release contract and CI baseline |
| `pnpm run test:ci-baseline` | 16/16 Node tests |
| `pnpm run test:release-contract` | 9/9 existing release-contract tests |
| `pnpm run lint` | Pass |
| `pnpm run typecheck` | 17/17 Turbo tasks |
| `pnpm run security:audit` | Pass; 0 critical, 0 high, 1 low remains visible |

## Negative paths certified

The automated suite actively creates and verifies these failures rather than inferring them from source text:

- unknown CI gate names enumerate the supported gates;
- invalid timeout environment values are rejected;
- a nonzero subprocess identifies the responsible gate and exit code;
- a hanging subprocess is terminated and reports gate name, command, and timeout;
- undispositioned critical/high advisories fail;
- incomplete, malformed, expired, and stale advisory acceptances fail;
- a complete future-dated acceptance can disposition its matching advisory;
- low/moderate advisories remain in the summary without crossing the configured blocking threshold.

The checked-in production audit is also executed as an integration test. Full clean-room workspace gates and platform-wide certification remain task 5, while visual certification belongs to the feature/example changes and the final `v3-release-certification` change; this CI-policy change has no user-facing surface to screenshot.
