# ASSESSMENT: full-3.0-release

**Project:** `@prometheus-ags/prometheus-entity-management` 3.0 ecosystem  
**Date:** 2026-08-01  
**Assessment verdict:** **NO-GO — not ready to publish `3.0.0` or move prerelease packages onto the npm `latest` tag**  
**Assessed baseline:** local `main` at `dd5d70c`; remote `origin/main` at `7f982fc` (local is two commits behind)

## Executive assessment

The alpha contains substantial working functionality, but “full 3.0 release” is not currently a version-bump exercise. It is a release-engineering and contract-hardening phase across twelve npm packages, a Flutter package, Rust deliverables, examples, documentation, and agent skills.

The JavaScript implementation has a healthy base: workspace type checking and tests pass, all twelve npm packages build tarballs, and the React runtime export ledger is synchronized. That evidence is outweighed by three critical distribution failures:

1. All twelve npm packages advertise a CommonJS entry that Node cannot load.
2. The publish workflow targets the private workspace root at version `0.0.0`, not the twelve publishable packages.
3. Current remote `main` fails frozen installation because its lockfile does not match the updated Next example manifest.

There are also material product-contract gaps. The package described as a framework-agnostic, zero-React core imports Zustand's React-facing entry and exposes React types. The external Flint integration test silently skips when sibling repositories are unavailable. The skills still describe the v2-style React package rather than the v3 multi-package ecosystem. Flutter documentation claims Riverpod 3 while the manifest remains on Riverpod 2.

Accordingly, publishing now would attach a stable tag to a distribution with a known broken module format, an unexercised release path, and documentation promises that do not match the artifacts.

## IMPLEMENTATION STATUS

### What is implemented and evidenced

- Twelve npm packages exist at `3.0.0-alpha.0`:
  - `@prometheus-ags/entity-graph-core`
  - `@prometheus-ags/prometheus-entity-management`
  - `@prometheus-ags/entity-graph-sync`
  - `@prometheus-ags/entity-graph-a2a`
  - `@prometheus-ags/a2ui-react`
  - `@prometheus-ags/entity-graph-alpine`
  - `@prometheus-ags/entity-graph-htmx`
  - `@prometheus-ags/entity-graph-sdl`
  - `@prometheus-ags/entity-graph-solid`
  - `@prometheus-ags/entity-graph-svelte`
  - `@prometheus-ags/entity-graph-tauri`
  - `@prometheus-ags/entity-graph-web-components`
- Two additional versioned deliverables are Rust crates rather than npm packages: `packages/entity-graph-cli/Cargo.toml` defines `entity-graph-cli` `3.0.0-alpha.0`, and `packages/entity-graph-mcp/Cargo.toml` defines `entity-graph-mcp` `3.0.0-alpha.0`. Neither directory has a `package.json`; they are excluded from the count of twelve npm packages but must be explicitly included or excluded by the overall v3 release contract.
- `pnpm run typecheck` passed all 17 workspace tasks.
- `pnpm run test` passed all configured JavaScript test tasks. The core suite reported 172 passed tests, one skipped test, and one todo; the React suite reported 46 passed tests.
- `pnpm run verify:skills` passed for 197 runtime exports from the React compatibility package.
- `pnpm pack --dry-run` succeeded for all twelve npm packages.
- ESM imports of the built core and React compatibility packages work.
- The Flutter test suite passed all 54 tests.

### Critical release blockers

#### R1 — All CommonJS package entry points are invalid

All twelve packages emit CommonJS code as `dist/index.js` while declaring `"type": "module"`. Node therefore interprets the file as ESM and fails on `require`. A direct load of the core artifact fails with `ReferenceError: require is not defined in ES module scope`.

Publint reports the same three material warnings for every package:

- the CommonJS file must use a `.cjs` extension;
- `exports.require` targets a file Node treats as ESM;
- import and require conditions share one declaration file instead of separate `.d.ts` and `.d.cts` declarations.

This must be corrected consistently across the package build configuration and verified against packed tarballs with Node import/require smoke tests, Publint, and `@arethetypeswrong/cli` before any stable publication.

#### R2 — The release workflow publishes the wrong package

`.github/workflows/publish.yml` reads the private root workspace manifest (`@prometheus-ags/entity-graph-workspace`, version `0.0.0`) and invokes `pnpm publish` at the root. `RELEASING.md` describes the same obsolete single-package process. Neither artifact implements a coordinated release for the twelve packages under `packages/*`.

Direct repository evidence: publish workflow lines 35–36 execute `node -p "require('./package.json').version"` and `.name`; line 64 executes `pnpm publish --no-git-checks --access public`. Root `package.json` lines 2–5 identify that selected target as `@prometheus-ags/entity-graph-workspace`, `0.0.0`, `private: true`, and explicitly say it is not published. The workflow has no package iteration or `changeset publish` step. This is independent of whether hidden `.github` paths appear in an automated review packet's file-tree projection.

The stable release needs an explicit versioning policy, Changesets release state, dependency ordering, per-package validation, tag policy, provenance, and a recovery procedure for partial publication. Publication must be exercised in a dry-run or disposable tag before `latest` is changed.

#### R3 — Remote `main` is red at installation

Remote `main` changes `examples/nextjs-app` from Recharts `3.8.0` to `3.9.2` without synchronizing the lockfile. The latest CI and Publish runs fail during frozen installation. The local checkout predates those two commits, so its successful install does not certify current `main`.

Direct evidence: commit `1ce302c` changes `examples/nextjs-app/package.json` to Recharts `3.9.2` and updates the nested `examples/nextjs-app/pnpm-lock.yaml`, but not the root workspace `pnpm-lock.yaml` used by the root install. The CI error identifies the root importer mismatch (`3.9.2` in the manifest versus `3.8.0` in the lockfile). The observed failures are [CI run 30455784793](https://github.com/Prometheus-AGS/prometheus-entity-management/actions/runs/30455784793) and [Publish run 30455785437](https://github.com/Prometheus-AGS/prometheus-entity-management/actions/runs/30455785437).

No release should be cut until current remote `main`, not an older local revision, is green from a clean checkout.

### High-severity contract and verification gaps

#### R4 — “Framework-agnostic, zero-React core” is not true yet

`entity-graph-core` imports `create` from `zustand` rather than `createStore` from `zustand/vanilla`. Its public table declarations import React types and expose `React.ReactNode` and `React.ComponentType`. The built core also imports the React-facing Zustand entry.

Choose and document one contract before stable release:

- make the core genuinely framework-neutral by using the vanilla store API and relocating React-specific table types; or
- narrow the marketing and compatibility promise to match the current implementation.

The former is more consistent with the v3 package split.

#### R5 — Bindings can resolve multiple graph singletons

Most framework bindings install `entity-graph-core` as a normal dependency; some also duplicate it as a peer dependency. Because the graph is intended to be a process-wide singleton, independently resolved core versions can split application state.

Bindings should normally use a compatible peer dependency plus development dependency, and CI should install representative consumer fixtures and prove singleton identity across core, React, Svelte, Solid, and Web Components. If all packages are meant to move in lockstep, encode that intent in Changesets fixed/linked groups rather than relying on convention.

#### R6 — The live Flint test is non-portable and can silently skip

`packages/entity-graph-core/src/adapters/flint-live.test.ts` imports built SDKs through absolute paths under `/Users/gqadonis/Projects/...`. In the current test run it skipped because the sibling `@prometheusags/frf-sdk` dependency could not resolve. A green suite therefore does not prove the claimed live Flint integration.

Replace this with a deterministic contract fixture, published/dev workspace dependency, or a clearly separated opt-in integration job that fails when explicitly enabled. Do not count a skipped sibling-repository test as release evidence.

#### R7 — Full build and non-JavaScript runtime evidence are incomplete

- `pnpm run build` completed 12 of 14 tasks but did not finish the Vite and Next example builds after more than four minutes. Next also inferred `/Users/gqadonis/bun.lock` as the workspace root because it found multiple lockfiles. The full build gate is inconclusive and needs a deterministic timeout plus explicit Turbopack root configuration.
- Rust CLI, MCP, and Tauri tests produced no result within 90 seconds and were interrupted. Their current release health is **unknown**, not passed or failed.
- The Tauri npm package contains a checked-in generated binding stub; a live Tauri smoke test is absent.

### Medium-severity packaging and quality gaps

- Core and SDL tarballs omit a README; most tarballs omit their changelog.
- The Tauri npm tarball includes the Rust plugin tree and lockfile; the intended package boundary and payload size should be reviewed.
- `check:treeshake` only checks that text exists in a built file. It does not measure tree shaking, consumer bundle size, or side-effect elimination.
- Many package manifests lack a Node engine and use repository metadata that Publint recommends normalizing.
- There are no pending Changesets describing the stable release, and `.changeset/config.json` has no fixed or linked groups.

## CROSS-TOOL PROGRESS

### KBD state

- Active canonical phase: `full-3.0-release`.
- Assessment: complete with this artifact.
- Planning, execution, reflection, certification, and publication: not started.
- The waypoint file retains legacy keys for `phase-v4-prometheus-entity-sync` and `execution_in_progress` alongside the new canonical phase/status. That state should be normalized before automation relies on it.

### OpenSpec state

The locked specification at `openspec/specs/v1-0.md` describes a single React package built from `src/index.ts`. It does not specify the v3 package family, non-React bindings, Flutter/Rust deliverables, coordinated versioning, or per-package release criteria. There is no current v3 OpenSpec change serving as an authoritative release contract.

A v3 release specification is needed before implementation is declared complete. It should enumerate which artifacts are part of 3.0, which must share the same version, supported runtimes/framework versions, module-format and type contracts, compatibility guarantees, and which integrations are stable versus experimental.

### Previous reflection state

Prior v3 reflection material is directionally useful but overstates release evidence:

- it refers to 14 published packages, while this assessment verified twelve npm packages; Rust and Dart registry publication was not verified;
- it describes Riverpod 3 even though the Flutter manifest uses Riverpod 2.x;
- it counts the Flint integration as verified although the current live test skips;
- it acknowledges missing runtime smoke tests and documentation debt, both of which remain release blockers.

These statements should not be carried into release notes without correction.

## FLINT ECOSYSTEM ALIGNMENT

The latest local and fetched remote changes in `flint-realtime-fabric`, `flint-gate`, and `flint-forge` materially affect the v3 documentation, skills, and integration contract.

### flint-realtime-fabric

- The current SDK shape still matches the entity-management `FlintClientLike` contract: `watchEntities(EntityQuery)` and `mutateEntity(EntityRecord)` with compatible entity, tenant, channel, offset, and correlation fields. No immediate adapter signature change was identified.
- Deployment work now emphasizes pinned candidate images, digest/provenance verification, JWT issuer enforcement, JWKS health, tenant equality, and network policies.
- The runtime has moved away from Keto as a default. RLS is the durable data boundary and external authorization is an explicit mode.

Implication: retain the adapter surface, but replace the skipped live test with a portable contract test and document the security/runtime assumptions.

### flint-gate

- Minted tokens now carry `kid`; Gate exposes JWKS and propagates verified role/user claims.
- Client and server keys are separate: `service_role` must never be exposed to a browser or untrusted client.
- Current Gate work notes an important compatibility caveat: its initial runtime JWK carries PEM material rather than standard RSA `n`/`e`, so strict RFC 7517 consumers may reject it.
- JWKS caching means emergency rotation may require a restart or a deliberately reduced cache TTL.

Implication: update setup, auth, realtime, and deployment skills to cover issuer, tenant, `kid`, JWKS, role claims, key separation, rotation, and the strict-verifier caveat. Add security contract tests where entity-management examples accept Flint credentials.

### flint-forge

- Forge now exposes an additive schema provisioning API: plan, apply, status, and DDL inspection.
- It uses typed JSON specifications rather than raw SQL, plan/apply hashes, namespace allowlists, explicit transactions, generated `ENABLE/FORCE RLS`, per-verb policies, service-role authorization, and an audit ledger.
- New REST routes can require a runtime restart after apply.
- Keto is no longer a default gate; RLS plus Cedar is the primary model, with `rls+keto` opt-in.

Implication: revise SDL, Prisma/setup, and provisioning skills to describe plan-before-apply, service-role-only mutation, namespace restrictions, RLS generation, auditability, and restart semantics. A first-class Forge provisioning adapter may be a post-3.0 feature; it is not required to stabilize the existing npm surface unless current documentation claims it.

## SPEC GAP SUMMARY

### Stable-release contract that is missing

The v3 specification and release checklist must answer:

1. Which npm, Dart, and Rust artifacts constitute “3.0.0”?
2. Are the twelve npm packages fixed-version, independently versioned, or a mixture?
3. Which packages are stable and which remain experimental?
4. What Node versions, bundlers, module systems, TypeScript versions, and framework versions are supported?
5. Is core guaranteed to have no React/runtime framework dependency?
6. What is the graph singleton contract across bindings?
7. What does backwards compatibility mean for the v2 React package and its `latest` tag?
8. What exact tests certify REST, GraphQL, realtime, sync, A2A, A2UI, Flint, Tauri, and Flutter integrations?
9. What artifact provenance, rollback, deprecation, and partial-publish procedures are required?

### Skills and documentation gaps

`prometheus-entity-skills/SKILL.md` and its shared references still center the v2-style React package. Paths such as `src/index.ts` and `src/adapters/...` are stale after the package split. The current verifier checks only 197 runtime export names from the React shim; it does not validate types, signatures, examples, package-specific exports, or non-React skills.

For full 3.0, update or add skills for:

- framework-neutral core and package selection;
- React compatibility/migration;
- Svelte, Solid, Alpine, Web Components, and HTMX bindings;
- sync providers, SDL, A2A, A2UI, Tauri, Flutter, Rust CLI, and MCP;
- Flint authentication, realtime, provisioning, RLS, key rotation, and service-role handling;
- migration from 2.x and from `3.0.0-alpha.0`.

The root skill's data-flow wording must also match the repository rule: hooks orchestrate store methods; stores and adapters own external I/O. “APIs are called only through hooks” is too imprecise and invites hooks to perform network calls.

Skills verification should expand to package-specific export ledgers, TypeScript compile tests for snippets, checked source paths, and at least one consumer example per supported binding.

## DEPENDENCY AND SECURITY ASSESSMENT

### Security state

`pnpm audit --prod --json` reports 1 critical, 25 high, 38 moderate, and 5 low advisories. The observed advisories are in example applications rather than the publishable package dependency graphs, but examples are part of CI, documentation, and user trust. Notable paths include Seroval through the Vite TanStack Router stack and advisories involving Next `16.2.1`, PostCSS, Hono, Sharp, fast-uri, brace-expansion, and js-yaml.

At minimum, update the Next example beyond the affected version range, update the TanStack example stack, regenerate the lockfile, rerun the audit, and explicitly disposition any remaining advisories. Stable publication should not be gated on an impossible “zero transitive advisory” rule, but every critical/high path must have a documented resolution or accepted scope.

### Recommended dependency work

The following are assessment candidates, not instructions to blindly install every latest release:

| Area | Current/resolved | Latest observed | Assessment |
|---|---:|---:|---|
| pnpm | remote main pins 11.15.0 | 11.18.0 | Update deliberately and keep every workspace manifest/CI action aligned. |
| Zustand | 5.0.12 | 5.0.14 | Low-risk patch; test core refactor against `zustand/vanilla`. |
| Immer | 11.1.4 | 11.1.15 | Low-risk patch with graph mutation regression tests. |
| Loro CRDT | 1.13.6 | 1.13.9 | Patch update; rerun sync convergence tests. |
| React Virtual | 3.13.26 | 3.14.9 | Minor update; validate table virtualization and types. |
| Next | 16.2.1 | 16.2.12 | Security-priority update; clean build and SSR/hydration smoke required. |
| React | 19.2.4 | 19.2.8 | Patch update in examples/peer validation. |
| TanStack Router | 1.168.8 | 1.170.18 | Security-priority update with Vite route/build smoke. |
| TanStack Query | 5.96.x | 5.101.x | Update example bridge and regression test. |
| PGlite | 0.2.17 | 0.5.4 | Major/minor-line jump; isolate and test migration, do not bundle into routine patches. |
| Turbo | 2.9.18 | 2.10.8 | Update after fixing deterministic build behavior. |
| Vitest | 4.1.6/4.1.7 | 4.1.10 | Patch update and retain exact suite counts. |
| TypeScript | 6.0.2 | 7.0.2 | Major upgrade; evaluate on a separate compatibility branch after 3.0 packaging is sound. |
| Flutter Riverpod | 2.6.1 | 3.4.2 | Required to make the Riverpod 3 claim true; generator/annotations and generated code must migrate together. |

Flutter resolution also identified newer incompatible lines for Riverpod Generator, Freezed, build_runner, and flutter_lints. Treat that as a coordinated Dart migration with regenerated files and analyzer/test evidence, not individual version edits.

## SIMILAR-PROJECT AND RELEASE-PRACTICE FINDINGS

Firecrawl was requested but no Firecrawl tool or installable Firecrawl plugin was available in this session. The assessment used the available web search against official primary documentation instead.

### Product ideas worth considering after stabilization

TanStack DB's current design provides typed collections, incremental live queries (including joins and aggregates), optimistic transaction lifecycles, Standard Schema validation, on-demand query-driven synchronization, and pluggable collection-option creators. See its [overview](https://tanstack.com/db/latest/docs/overview), [live-query guide](https://tanstack.com/db/latest/docs/guides/live-queries), [mutation lifecycle](https://tanstack.com/db/latest/docs/guides/mutations), [schema integration](https://tanstack.com/db/latest/docs/guides/schemas), and [collection options creators](https://tanstack.com/db/latest/docs/guides/collection-options-creator).

Prometheus already has strengths that overlap these ideas: a normalized global graph, realtime batching, local/remote/hybrid views, sorted insertion, optimistic actions, and transport adapters. The highest-value future gaps are cross-entity live joins/aggregations, Standard Schema-compatible validation at mutation boundaries, explicit transaction state/temporary IDs, and an on-demand query-driven transport contract. These are post-3.0 roadmap candidates; adding them to the stable-release scope would delay contract hardening and increase risk.

### Distribution practices to adopt now

- npm [trusted publishing](https://docs.npmjs.com/trusted-publishers/) uses OIDC and automatically generates provenance. The current workflow has `id-token: write` but still relies on `NPM_TOKEN` and explicitly disables provenance. Configure each of the twelve existing packages as a trusted publisher and remove the contradictory settings.
- npm [staged publishing](https://docs.npmjs.com/staged-publishing/) can add a human approval/2FA step before a first stable release is made public. It is appropriate to evaluate for the 3.0 cut, especially because coordinated publication can partially fail.
- The [Changesets action](https://github.com/changesets/action) can maintain a reviewable release PR and publish changed packages, but it must be configured around the chosen fixed/linked version policy and the packages already present in npm.
- Add [Publint](https://publint.dev/docs/) and [`@arethetypeswrong/cli`](https://www.npmjs.com/package/@arethetypeswrong/cli) checks against packed tarballs. Publint already found a real release blocker that typecheck and unit tests missed.
- Follow the Flint repositories' immutable-artifact pattern: validate the exact packed artifacts, publish with provenance, protect release tags, and attach checksums/manifest information to the GitHub release.

## BUILD HEALTH

| Gate | Result | Release interpretation |
|---|---|---|
| Local frozen install | PASS on `dd5d70c` | Does not cover current remote `main`. |
| Remote frozen install | FAIL on `7f982fc` | Critical blocker; lockfile mismatch. |
| Workspace typecheck | PASS (17/17) | Good implementation evidence. |
| JavaScript tests | PASS with 1 skip, 1 todo in core | Flint live integration remains unverified. |
| Skills export verifier | PASS (197 React runtime names) | Validator scope is insufficient for v3. |
| Twelve npm tarball dry-runs | PASS | Contents and metadata still need corrections. |
| ESM consumer import | PASS | Core and React shim load. |
| CJS consumer require | FAIL | Critical blocker across all packages. |
| Publint | FAIL release quality (3 shared warnings/package) | Must be clean or explicitly justified. |
| Full examples build | INCONCLUSIVE | 12/14 tasks completed; example builds did not finish. |
| Flutter tests | PASS (54) | Version/documentation mismatch remains. |
| Rust CLI/MCP/Tauri tests | UNKNOWN | Timed out without a result; need bounded CI evidence. |
| Production dependency audit | FAIL policy review | Advisories are in examples; critical/high paths need resolution/disposition. |

## EVIDENCE REGISTER

This register makes the command-derived evidence explicit because KBD's artifact packet builder does not currently embed hidden workflow files, sibling repositories, build output, or every package manifest.

### npm artifact inventory and module-format evidence

The following values were read from each local `packages/*/package.json`; all entries are non-private and all `exports.require` targets exist after build:

| Directory | npm name | Version | `type` | `main` / `exports.require` | `module` |
|---|---|---:|---|---|---|
| a2ui-react | `@prometheus-ags/a2ui-react` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-a2a | `@prometheus-ags/entity-graph-a2a` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-alpine | `@prometheus-ags/entity-graph-alpine` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-core | `@prometheus-ags/entity-graph-core` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-htmx | `@prometheus-ags/entity-graph-htmx` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-react | `@prometheus-ags/prometheus-entity-management` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-sdl | `@prometheus-ags/entity-graph-sdl` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-solid | `@prometheus-ags/entity-graph-solid` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-svelte | `@prometheus-ags/entity-graph-svelte` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-sync | `@prometheus-ags/entity-graph-sync` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-tauri | `@prometheus-ags/entity-graph-tauri` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |
| entity-graph-web-components | `@prometheus-ags/entity-graph-web-components` | 3.0.0-alpha.0 | module | `./dist/index.js` | `./dist/index.mjs` |

`pnpm dlx publint` was run separately against all twelve directories and returned the shared CJS/conditional-types warnings described in R1. A direct `node packages/entity-graph-core/dist/index.js` smoke failed with Node's `require is not defined in ES module scope` diagnostic. Those checks establish the shared failure mode; the stable gate should retain one packed consumer smoke per package so it cannot regress.

### External-repository baseline

- `flint-realtime-fabric`: assessed local/fetched branch `codex/deploy-flint-runtime-services` at `ce021c8`; fetched `origin/main` was `cfc1bb2`.
- `flint-gate`: assessed local/fetched branch `codex/deploy-flint-runtime-services` at `7ed6834`; fetched `origin/main` was `2438892`.
- `flint-forge`: assessed local `main` at `aca9422` and fetched `origin/main` at `2289d15`, including the newer schema-provisioning work on the remote history.

These repositories are external inputs rather than artifacts governed by this phase. Their findings must be revalidated at planning/execution time if the branches advance.

### Commands and evidence boundaries

- Registry state and current/latest dependency versions were queried on 2026-08-01 with `pnpm view` and `pnpm outdated -r --format json`.
- Audit counts came from `pnpm audit --prod --json` on the assessed lockfile. The assessment intentionally distinguishes publishable package paths from example-only paths.
- Remote branches were fetched read-only. No branch was switched, no dependency was changed, and nothing was published.
- Rust commands were interrupted after a bounded wait and therefore provide no pass/fail evidence.

## CONSTRAINT CHECK

- **pnpm-only:** respected during assessment. Registry inspection used `pnpm view`; no npm install or dependency mutation was performed.
- **Layered architecture:** no code was changed. The stable specification and skills must preserve components → hooks → stores/adapters → external systems.
- **Single normalized graph:** the dependency layout risks multiple core instances across bindings and must be fixed before the singleton guarantee can be trusted.
- **Skills ↔ code sync:** the existing export-name check passes, but its scope no longer satisfies the spirit of the immutable sync requirement for a twelve-package ecosystem.
- **Public hooks/JSDoc/type strictness:** current typecheck passes; package-specific public API documentation still needs an explicit release review.
- **No standalone-development-build assumption:** v3 now has publishable package builds, so the older v1 and repository guidance should be reconciled with the monorepo release architecture.
- **No phase-specific constraints file:** `.kbd-orchestrator/constraints.md` is absent. Repository `AGENTS.md`, the phase goal, and existing specifications were treated as governing constraints.

These are verified repository constraints, not inferred conventions: `AGENTS.md` lines 17–21 declares its scope and non-negotiable status; lines 35–38 require pnpm only; lines 40–68 define the component/hook/store/external-system layers; and the repository guidance supplied for this assessment also requires skills/export synchronization when public exports change. The separate KBD constraints projection is null only because no `.kbd-orchestrator/constraints.md` exists.

## GOAL PROGRESS

The assessment goal—determine what it takes to graduate from alpha and update npm—is complete. The release itself is not ready and has not been attempted.

### Minimum release sequence derived from the evidence

1. Define and approve the v3 artifact/support/versioning contract in OpenSpec.
2. Repair module output/types for all packages; establish packed-artifact ESM/CJS/type consumer tests.
3. Make core genuinely framework-neutral or correct the public promise; fix binding singleton dependency policy.
4. Repair current `main`, deterministic example builds, audit findings, and portable Flint integration evidence.
5. Rebuild package-specific skills/docs/migrations and expand skills verification beyond the React shim.
6. Migrate or accurately document Flutter/Riverpod; establish bounded Rust/Tauri runtime CI.
7. Configure Changesets and per-package trusted publishing/provenance; dry-run the exact release workflow.
8. Publish a release candidate under a non-`latest` tag, install it into clean consumer fixtures, then promote coordinated `3.0.0` artifacts only after certification.

### Exit criteria for a GO decision

- clean install, typecheck, tests, builds, examples, audit disposition, and skills verification from current `main`;
- ESM and CJS load successfully from every packed npm tarball, with correct conditional types;
- all claimed frameworks/runtimes have a clean consumer smoke test;
- no integration test counted as evidence is skipped because of an absolute sibling path;
- package versions, interdependencies, changelogs, READMEs, and migration guide are coherent;
- npm release workflow demonstrably targets all and only intended packages, uses provenance, and has rollback/partial-failure instructions;
- v3 OpenSpec, repository guidance, public docs, skills, and actual manifests agree.

## ASSESSMENT COMPLETE

**Decision:** Keep `3.0.0-alpha.0` off the stable `latest` tag. Treat the next phase as a release-hardening program, not an immediate npm promotion. No package was modified or published during this assessment.

## Unresolved review findings

The required isolated artifact review was run twice, reached its two-round cap, and retained a `BLOCK` verdict with three critical and three warning findings. The anti-theater/sycophancy screen passed with score `0.0`.

The remaining findings concern evidence omitted by the KBD packet builder, not contradictions discovered in the underlying repository checks: hidden `.github/workflows/publish.yml`, current-remote CI output, per-package manifests/build outputs, sibling Flint repositories, and command-produced audit/version output were not embedded in the judge packet. This assessment now includes a direct evidence register, exact workflow/root-manifest line evidence, remote commit/run identifiers, the complete npm package inventory, Rust deliverable classification, and external repository baselines. Because the artifact review cap is exhausted, these findings remain visible for the planning stage rather than being silently dismissed.

Before planning treats any command-derived item as an implementation acceptance criterion, it should regenerate the evidence from a clean checkout of current `origin/main` and attach machine-readable outputs to the phase review directory. This limitation does not weaken the no-go decision: any one of the independently reproduced CJS failure, wrong publish target, or red remote installation is sufficient to block a stable release.
