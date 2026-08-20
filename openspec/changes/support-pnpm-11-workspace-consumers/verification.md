# Verification

| Requirement | Command | Observed result | Limit |
|---|---|---|---|
| pnpm 11 rejection control | `pnpm bdd:ci-baseline -- --name 'Compatible direct dependencies are current or explicitly held'` before widening | Failed at `pnpm@11.15.0`: `false !== true`; the broad wrapper also ran unrelated scenarios | Negative control is limited to the named compatibility assertion |
| pnpm 11 compatibility | `pnpm exec cucumber-js --config cucumber.mjs --tags '@v3-main-ci-baseline' --name 'pnpm 11 consumer workspaces are admitted'` | 1 scenario passed, 2 steps passed, 0 failed | Contract-level compatibility only |
| OpenSpec | `openspec validate support-pnpm-11-workspace-consumers --strict` | Change is valid | This change only |
| TypeScript | `pnpm exec turbo run typecheck --output-logs=errors-only` | 24 tasks passed, 0 failed | Upstream workspace |
| Scoped lint | `pnpm exec eslint tests/steps/v3-main-ci-baseline.steps.ts --max-warnings 0` | Command exited 0 with no output | Touched TypeScript file |
| Root lint baseline | `pnpm lint` | Exited 1 on two `preserve-caught-error` findings in untouched `scripts/npm-trust.mjs` | Not represented as passing; outside this change |

The existing broad CI-baseline scenario currently reaches unrelated advisory and
lockfile-layout failures. Root lint also fails on two untouched
`scripts/npm-trust.mjs` findings. Those failures are outside this compatibility
change and are not represented as passing evidence here.
