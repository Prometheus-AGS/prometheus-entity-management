# Releasing Prometheus Entity Management

## 3.0 status: publication blocked

The full 3.0.0 release is still in progress. Do not run `changeset publish`, publish an individual workspace package, or move npm's `latest` tag based only on local builds or the main CI baseline.

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
the Dart barrel and generated Riverpod part. Commit a ledger only when its
public surface changes. Type-only npm changes belong in their API references;
policy-only changes do not justify rewriting runtime or Dart declaration ledgers.

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
pnpm run dart:test
pnpm run test:dart-graph-riverpod
pnpm run bdd:dart-graph-riverpod
pnpm run verify:dart-graph-riverpod
pnpm run verify:dart-exports
```

The full boundary is documented in [`release/dart-graph-riverpod.md`](release/dart-graph-riverpod.md). A public declaration change also requires:

```bash
pnpm run refresh:dart-exports
pnpm run verify:skills
```

The scoped list/detail widget goldens are library evidence, not complete app,
accessibility, Android/iOS, or device certification. The Flutter 3.44.8 stable
clean candidate now passes `flutter pub publish --dry-run` with zero warnings.
That dry run still does not supply pub.dev ownership, immutable release-wide
certification, or publication approval.

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

After the verifier passes, dispatch `publish.yml` in `stage` mode with rehearsal
run `30976967778` and candidate SHA
`afbb8de0e861739fa6facb461b69573b2a627bdb` while its artifact remains valid.
If that artifact has expired, produce a new rehearsal instead. Approve all
twelve staged packages in npm with 2FA, then verify `3.0.0-rc.1` on `next`,
protected `latest` tags, provenance, integrity, and clean pnpm consumers. Never
replace `rc.1`; a proven immutable conflict requires a new `rc.2` candidate.

`pnpm run ci` and a green RC rehearsal mean their named checked-in boundaries
passed; neither means “3.0 may be published.” Stable certification, the GitHub
Release, production documentation deployment, post-publication checks, and npm
`latest` remain downstream.
