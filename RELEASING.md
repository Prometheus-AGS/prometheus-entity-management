# Releasing Prometheus Entity Management

## 3.x status: stable published

**Update 2026-08-29: 3.1.0 stable is published.** All twelve
`@prometheus-ags/*` npm packages are public at `3.1.0` with both `latest` and
`next` pointing at it (tag `v3.1.0`). `3.0.0` shipped with an unresolved pnpm
`workspace:` protocol in ten of twelve manifests and is deprecated; `3.0.1` and
`3.0.2` were corrective republications, `3.0.3` made fetched list ingestion
atomic, `3.0.4` was deprecated after stale build artifacts were discovered,
and `3.1.0` adds the optional React DevTools entries while carrying the
provider-scoped imperative-access fix and A2UI 1.0-RC compatibility. These
publications ran directly with a granular npm token at
operator direction, so they carry no npm provenance attestation; the governed
OIDC path below remains for future releases. `entity_graph_flutter@3.0.1` is
public on pub.dev. Do not run `changeset publish`, publish an individual
workspace package, or move any npm `latest` tag based only on local builds or
the main CI baseline.

For the operational procedure — including the `pnpm publish` requirement that
prevents `workspace:` protocol leakage — see the `npm-release-and-cleanup`
skill in [`.agents/skills/`](.agents/skills/npm-release-and-cleanup/SKILL.md).

The verified registry snapshots are
[`release/npm-registry-status.json`](release/npm-registry-status.json) and
[`release/pubdev-registry-status.json`](release/pubdev-registry-status.json).

The authoritative release rules are:

- [`release/v3-release-contract.json`](release/v3-release-contract.json) — artifacts, compatibility, stability, registry scope, approvals, and recovery;
- [`examples/coverage.json`](examples/coverage.json) — implemented quality checks versus planned/certified showcases;
- [`release/dependency-policy.json`](release/dependency-policy.json) — compatible-current dependency holds;
- [`security/advisory-policy.json`](security/advisory-policy.json) — production advisory dispositions.

Stable publication requires the later `v3-release-pipeline-rc`, `v3-release-certification`, and `v3-stable-publication` changes, one certified immutable git SHA, and explicit npm `latest` approval. Registry versions are immutable; partial publication is recovered with a new patch candidate, never by overwriting a published version.

## Main CI baseline

Run the same bounded gates used by CI from the repository root:

```bash
corepack prepare pnpm@10.33.0 --activate
pnpm install --frozen-lockfile
pnpm run ci
```

The individual `ci:*` commands and timeout behavior are documented in [`release/ci-baseline.md`](release/ci-baseline.md). `pnpm run test` includes workspace tests, release-contract tests, CI-policy tests, and Cucumber BDD.

## Shared example contract verification

Before claiming that a stable feature is represented by the 3.0 showcase plan, run:

```bash
pnpm run verify:example-coverage
pnpm run test:example-coverage
pnpm run bdd:example-coverage
```

These commands validate the deterministic shared fixtures, thirteen semantic outcomes, all stable capability/artifact mappings, and fail-closed evidence transitions. They do not certify that a showcase application builds, renders, passes accessibility checks, or runs on a browser/device. Consult each showcase's `runtimeEvidence` and `visualEvidence` in [`examples/coverage.json`](examples/coverage.json); `planned` evidence remains work, not authorization to publish.

## React 19/Vite 8 preview gate

The React 19/Vite 8 source-workspace showcase is implemented and provides the
application gate for a React-first preview candidate:

```bash
pnpm run bdd:vite-react19
```

The command runs React/Vite typechecks, targeted units, core/React/sync package
builds, the Vite production build, all declared Chromium scenarios, DevTools,
and axe. Its receipt includes hashed screenshots and traces and must retain
`countsAsPackedPackageEvidence: false`.

Use [`release/vite-react19-example.md`](release/vite-react19-example.md) for the
complete scenario matrix and evidence boundary. This green showcase allows the
core + React RC work to proceed independently of unfinished framework examples,
but it does not authorize registry mutation. Before staging a React preview,
rerun packed-candidate verification and an immutable rehearsal for the exact
core + React commit; stage core before the React binding under npm `next`.

## Packed npm candidate verification

Module and tarball correctness is a separate gate from workspace CI:

```bash
pnpm run verify:package-contracts
```

The command builds and packs every public npm package, runs strict Publint and Are The Types Wrong checks, then installs one coherent candidate set for Node ESM, Node CommonJS, TypeScript NodeNext, Node16, and Bundler consumers. It also rejects unintended files and leaked workspace or developer-local paths. The complete contract and its limitations are documented in [`release/package-contracts.md`](release/package-contracts.md).

A green package-contract run does not authorize publication. It proves the candidate tarballs are structurally consumable; later changes still own framework singleton behavior, examples, native platforms, provenance, registry authority, documentation deployment, and stable promotion.

## PGlite and Loro sync verification

The stable `npm-sync` capability has a separate durability, convergence, and
transport-recovery gate:

```bash
pnpm run test:sync-persistence
pnpm run verify:sync-persistence
pnpm run bdd:sync-persistence
pnpm --filter @prometheus-ags/entity-graph-sync test:websocket-integration
```

The test gate uses a real file-backed PGlite database, two isolated Loro graph
clients, both delivery orders, deterministic same-field conflicts, inbound echo
suppression, and an actual ephemeral WebSocket relay with forced termination.
The verifier packs core and sync and exercises ESM, CommonJS, and NodeNext
consumers. Mandatory receipts cannot be skipped because a peer dependency is
absent.

This proves the headless npm core/sync path only. It does not certify Flutter or
Tauri persistence or a remote production relay. The React showcase now owns
separate browser PGlite/Loro and visual receipts; the remaining platform entries
stay `planned` in [`examples/coverage.json`](examples/coverage.json).

The sibling `prometheus-entity-sync` contract is deliberately outside that
mandatory gate. Maintainers may manually dispatch
`.github/workflows/entity-sync-contract.yml` with an explicit sibling git ref.
The workflow packs the current core candidate, installs the tarball into a fresh
sibling checkout, and runs its TypeScript contracts. It has no push or pull
request trigger, uses no developer-local `link:` path, and cannot replace the
mandatory PGlite/Loro receipts above.

## Public-export synchronization

If a change modifies public exports in `packages/entity-graph-react/src/index.ts`
or `packages/entity-graph-sync/src/index.ts`, update its runtime ledger, API
reference, packed consumer, and skill guidance. Run:

```bash
pnpm run refresh:exports
pnpm run verify:skills
```

The root command verifies the npm runtime ledgers plus
`dart-library-exports.json`, which records every public declaration exported by
the ordinary Dart barrel and generated Riverpod part, and
`dart-devtools-library-exports.json`, which records the optional tooling entry
and its controller parts. Commit a ledger only when its public surface changes.
Type-only npm changes belong in their API references; policy-only changes do
not justify rewriting runtime or Dart declaration ledgers.

## Native documentation certification

Before an RC or stable release can claim the published Dart and Rust API
references, run the full pinned-toolchain reproducibility gate:

```bash
pnpm run docs:native-api:verify
git diff --exit-code -- website/static/native-api
test -z "$(git status --porcelain --untracked-files=all -- website/static/native-api)"
```

This gate requires Flutter `3.44.8`, dartdoc `9.0.5`, and Rust `1.88.0`. It
regenerates dartdoc and rustdoc in an isolated owned directory, compares every
generated byte with the committed references, and cannot rewrite the manifest.
It is intentionally excluded from the Pages workflow: Pages performs the cheap
content-addressed `docs:native-api:check`, while release certification owns the
expensive native regeneration.

## Packed API and evidence artifact certification

Before an RC or stable release can claim updated packed TypeScript references or
gallery evidence, regenerate and review those canonical artifacts:

```bash
pnpm run build:packages
pnpm run docs:api
pnpm run docs:evidence
git diff --exit-code -- website/static/api website/docs/evidence/gallery.mdx website/static/evidence
test -z "$(git status --porcelain --untracked-files=all -- website/static/api website/docs/evidence/gallery.mdx website/static/evidence)"
```

Run this gate in the release environment that owns the committed artifacts.
Packed tarball compression and Sharp image encoding are platform-dependent, so
the Pages workflow does not rewrite those bytes on Ubuntu. It validates their
inventories, built declaration/manifests/README inputs, aggregate artifact
hashes, evidence source blobs, receipts, generated gallery, routes, and rendered
output through `docs:artifacts:check` plus the focused documentation
contract and browser gates. The deterministic search index is
still regenerated and diffed on every Pages build.

## Flutter source provenance

Before claiming that reusable KnowMe Flutter source has auditable lineage, run:

```bash
pnpm run verify:flutter-source-provenance
pnpm run test:flutter-source-provenance
pnpm run bdd:flutter-source-provenance
```

The full boundary is documented in [`release/flutter-source-provenance.md`](release/flutter-source-provenance.md). This gate changes no public runtime export: `packages/entity_graph_flutter` is the sole canonical Dart package and `provenance/imports/knowme-flutter` is non-buildable, non-workspace, and non-public. Do not analyze, test, build, or publish the provenance import.

A green provenance gate does not authorize pub.dev or stable 3.0 publication. Dart adaptation has its independent gate below; rendered/device evidence remains owned by `v3-flutter-riverpod-a2ui-example`; registry credentials, release certification, and promotion remain later gates.

## Dart graph and Riverpod 3 verification

Before claiming canonical Dart graph, generated Riverpod 3, optimistic CRUD,
view completeness, retry, realtime invalidation, transport, optional FFI, or
public Dart API coverage, run:

```bash
pnpm run dart:bootstrap:frozen
pnpm run dart:generate
pnpm run dart:format
pnpm run dart:analyze
pnpm run verify:dart-graph-riverpod
pnpm run verify:dart-exports
```

These are generation/static confirmations, not behavioral test evidence. Do
not run or cite legacy Dart unit, widget, provider, golden, Node, Cucumber, or
partial suites. After the complete affected production path is implemented,
run its one assembled acceptance flow; the repository-source optional
controller uses `pnpm run verify:devtools-flutter-controller`.

No later pub.dev release may proceed on these static checks or the controller
gate alone. The `v3-devtools-release-certification` phase must first run one
ordinary-library assembled Flutter/Riverpod acceptance flow across the real
graph, generated-provider, transport, view, CRUD, realtime, and rendering
boundaries.

The full boundary is documented in [`release/dart-graph-riverpod.md`](release/dart-graph-riverpod.md). A public declaration change also requires:

```bash
pnpm run refresh:dart-exports
pnpm run verify:skills
```

The scoped list/detail widget goldens are library evidence, not complete app,
accessibility, Android/iOS, or device certification. The Flutter 3.44.8 stable
clean candidate passed `flutter pub publish --dry-run` with zero warnings and
`entity_graph_flutter@3.0.1` is now public on pub.dev. A clean downstream
consumer resolved, imported, and analyzed the published archive. pub.dev
verified-publisher assignment and immutable release-wide certification remain
separate.

## Candidate and stable workflows

The recoverable release-candidate workflow is now implemented and documented in
[`release/release-candidate-pipeline.md`](release/release-candidate-pipeline.md).
Use `pnpm run verify:release-pipeline` for non-mutating packed-consumer and
workflow certification. Candidate planning and rehearsal bind to an explicit
immutable SHA; the separately guarded staging path requires GitHub Actions OIDC,
the protected `npm-rc` environment, exact SHA agreement, and the `next` tag.

This implementation does not prove the external npm trusted-publisher or GitHub
reviewer configuration and does not authorize stable publication. Recovery
skips matching immutable versions, stages absent versions in dependency order,
and blocks conflicts. Never overwrite a published version.

Before retrying RC staging, authenticate with a fresh browser-backed npm
maintainer session and register or verify all twelve stage-only relationships:

```bash
npm login --auth-type=web
pnpm run release:npm-trust:register
pnpm run release:npm-trust:verify
```

The exact repository, workflow, environment, permissions, and package inventory
are declared in [`release/npm-trusted-publishing.json`](release/npm-trusted-publishing.json).
The operator commands intentionally fail when `NPM_TOKEN` or `NODE_AUTH_TOKEN`
is present. They require interactive 2FA and never receive credentials through
the agent or GitHub Actions.

Candidate `3.0.0-rc.1` from rehearsal run `30976967778` and SHA
`afbb8de0e861739fa6facb461b69573b2a627bdb` was staged in run
`31082488746`. React, core, and A2UI React are public. Approve the remaining nine
staged packages in npm with 2FA, then verify every `next` tag, the intentional
React `latest` move, all other protected `latest` tags, provenance, integrity,
and clean pnpm consumers. Never replace `rc.1`; a proven immutable conflict
requires a new `rc.2` candidate.

`pnpm run ci` and a green RC rehearsal mean their named checked-in boundaries
passed; neither means “3.0 may be published.” Stable certification, the GitHub
Release, complete npm post-publication checks, and the remaining stable npm
promotion gates remain downstream. The production documentation deployment and
React `latest` move have already occurred.

## Stable promotion (v3-stable-publication)

Stable publication runs only after the sealed certification bundle
(`pnpm run release:check:seal`, verdict `complete`) exists for the tagged
source. The pipeline is channel-aware: when every fixed npm package version
equals the contract release version exactly (no prerelease suffix), the
manifest switches to the `stable` channel — `latest` dist-tag, `stage-stable`
action — and the RC authority boundary no longer applies.

- Pre-publish guards: `pnpm run verify:stable-publication` (offline; policy,
  workflow, authority-boundary, bundle-seal, and disposition checks).
- Publication: `publish.yml` → `workflow_dispatch` mode `stable`, which runs
  the full certification gate and rehearsal, then the `stage-stable` job in
  the protected `npm-stable` environment (human approval) with GitHub OIDC
  trusted publishing — long-lived npm tokens remain forbidden.
- Recovery: matching immutable versions are skipped and recorded, absent
  versions publish in dependency order, conflicts block; a partial run is
  recovered with a corrective patch version, never by overwriting.
- Post-publish: `pnpm run verify:stable-publication -- --live true` confirms
  every declared artifact resolves at 3.0.0 and npm `latest` points at it.
  Only a complete stable stage may move `latest`; the promotion guard
  (`assertStableTagsPromoted`) fails the run if any package lags behind.

### Publish-day pre-flight checklist (operator, ~15 minutes)

1. **npm trusted publishing** — on npmjs.com, for each of the 12 packages
   (`@prometheus-ags/*`): Settings → Trusted Publisher → GitHub Actions,
   repository `<org>/<repo>`, workflow `publish.yml`, environment
   `npm-stable`. One-time per package. (Alternative if trusted publishing is
   unavailable: a granular access token scoped to `@prometheus-ags/*` with
   publish permission and "bypass 2FA" enabled, stored as the `NPM_TOKEN`
   secret — but the pipeline rejects long-lived tokens by design, so this
   requires a deliberate policy change; prefer OIDC.)
2. **GitHub environment** — repo Settings → Environments → create
   `npm-stable`, add yourself as a required reviewer. This is the human
   approval gate that `assertStableStageAuthority` verifies.
3. **Merge the version bump** — bring `release/v3.0.0-staging` (workspace
   `3.0.0`, tag `v3.0.0`) onto the release branch and push. The pipeline
   derives the stable channel from the version equality, so no other edit is
   needed.
4. **Dispatch** — Actions → `publish.yml` → Run workflow → `mode: stable`.
   Approve the `npm-stable` environment prompt when the `stage-stable` job
   pauses.
5. **Confirm** — the job's live verification step proves all 12 packages
   resolve at `3.0.0` with `latest === 3.0.0`; the uploaded
   `stable-stage-report.json` is the receipt. If it fails, the recovery
   journal in the same artifact names exactly which packages published and
   which did not — re-run the dispatch; matching versions are skipped.

## Documentation site deployment

The 3.0 documentation site deploys to GitHub Pages through the quality-gated,
release-aware workflow in `.github/workflows/docs-pages.yml`: pull requests
build and gate but cannot deploy; only the protected `main` branch publishes
to the `github-pages` environment after build, links, snippet, search-index,
route-probe, accessibility, Lighthouse-budget, and secrets/absolute-path
gates pass. The canonical deployment URL is recorded in
[`release/docs-site.json`](release/docs-site.json) and the 3.0 release points
there. First live deployment requires Pages to be enabled for the repository
and remains an operator-confirmed action.
