# Verification

| Requirement | Command | Observed result | Limit |
|---|---|---|---|
| pnpm 11 rejection control | `pnpm bdd:ci-baseline -- --name 'Compatible direct dependencies are current or explicitly held'` before widening | Failed at `pnpm@11.15.0`: `false !== true`; the broad wrapper also ran unrelated scenarios | Negative control is limited to the named compatibility assertion |
| pnpm 11 compatibility | `pnpm exec cucumber-js --config cucumber.mjs --tags '@v3-main-ci-baseline' --name 'pnpm 11 consumer workspaces are admitted'` | 1 scenario passed, 2 steps passed, 0 failed | Contract-level compatibility only |
| OpenSpec | `openspec validate support-pnpm-11-workspace-consumers --strict` | Change is valid | This change only |
| TypeScript | `pnpm exec turbo run typecheck --output-logs=errors-only` | 24 tasks passed, 0 failed | Upstream workspace |
| Scoped lint | `pnpm exec eslint tests/steps/v3-main-ci-baseline.steps.ts --max-warnings 0` | Command exited 0 with no output | Touched TypeScript file |
| Root lint baseline | `pnpm lint` | Exited 1 on two `preserve-caught-error` findings in untouched `scripts/npm-trust.mjs` | Not represented as passing; outside this change |
| UAR pnpm 11 typecheck | `pnpm typecheck` in UAR with the corrected submodule commit | TypeScript build exited 0 using pnpm 11.15.0 | UAR frontend workspace |
| UAR pnpm 11 lint | `pnpm lint` in UAR with the corrected submodule commit | ESLint exited 0 using pnpm 11.15.0 | UAR frontend workspace |
| UAR SSE unit | `pnpm -C frontend test src/entities/sync.test.ts` | 1 file passed, 3 tests passed, 0 failed | Embedded adapter unit only |
| UAR SSE browser | `CI=1 pnpm exec playwright test -c tests/bdd/playwright.config.ts tests/bdd/.features-gen/features/local-first-resilience.feature.spec.js --grep 'embedded SSE connection'` | 1 test passed in 24.2 seconds | Fresh-process embedded scenario only |
| pnpm integrity negative control | `scratch_corepack=$(mktemp -d); COREPACK_HOME="$scratch_corepack" nvm exec 22 corepack pnpm --version` before correcting `packageManager` | Exited 1: `Mismatch hashes. Expected ...b5a304..., got ...b5a544...` | Fresh Corepack cache under Node 22; no cached package-manager binary |
| pnpm integrity and install | `scratch_corepack=$(mktemp -d); COREPACK_HOME="$scratch_corepack" nvm exec 22 corepack pnpm --version; CI=true COREPACK_HOME="$scratch_corepack" nvm exec 22 corepack pnpm install --frozen-lockfile` | Exited 0; printed `10.33.0`, `Lockfile is up to date`, `Already up to date`, and `Done ... using pnpm v10.33.0` | Entity-management workspace only; 18 projects |
| pnpm 10 package build | `scratch_corepack=$(mktemp -d); COREPACK_HOME="$scratch_corepack" nvm exec 22 corepack pnpm --filter @prometheus-ags/prometheus-entity-management build` | Exited 0; tsup 8.5.1 built ESM, CJS, and DTS outputs | React package only; no package publication |
| Integrity correction delivery | independent artifact-only critic; `git commit -m 'fix(tooling): correct pnpm Corepack integrity'`; `git push origin codex/support-pnpm-11-consumers` | Critic returned PASS; commit `d6a0b0e` pushed to the existing PR #20 branch | Tooling receipt only; no npm package or dist-tag changed |
| Missing dev-engine negative control | UAR workflow run `32456545461`, build step on submodule commit `55cd5a8` | Exited 1 before core compilation: `This project is configured to use 10.33.0 of pnpm. Your current pnpm is v11.15.0` | Clean GitHub runner; nested core task only |
| Portable pnpm consumer verifier | `scripts/verify-pnpm-consumer-compatibility.sh` | Exited 0: pnpm 11.15.0 rebuilt core then React (`2 successful, 2 total`, `0 cached`); the generated `<11` fixture rejected 11.15.0; pnpm 10.33.0 accepted the frozen 18-project lock | Local dependency closure, fail-closed range, and pinned-default compatibility only |
| Lock receipt causality | `scripts/verify-pnpm-consumer-compatibility.sh` | Printed `PACKAGE_MANAGER_RECEIPT_PASS documents=2 pnpm=11.15.0` and `APPLICATION_LOCK_UNCHANGED_PASS sha256=fb95bea155cca9a4d7e92f5dd31d0ca75e9c0f53cfeb731976542f8b0c3d267b` | First document is package-manager receipt; second is the unchanged prior application lock |

The existing broad CI-baseline scenario currently reaches unrelated advisory and
lockfile-layout failures. Root lint also fails on two untouched
`scripts/npm-trust.mjs` findings. Those failures are outside this compatibility
change and are not represented as passing evidence here.
