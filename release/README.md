# Prometheus Entity Management release contracts

`v3-release-contract.json` is the machine-readable source of truth for the 3.0 ecosystem. It answers four questions before any registry mutation occurs:

1. Which artifacts belong to the release, and who owns them?
2. Which runtime, framework, module, protocol, and singleton boundaries are supported?
3. Which registries are mandatory, deferred, or embedded in another artifact?
4. Which certification, approval, recovery, rollback, and deprecation rules govern promotion?

The JSON contract is validated through the `@v3-release-contract` Cucumber scenarios. Generated documentation and release automation may consume it, but may not maintain a divergent artifact list.

## Implemented main CI baseline

[`ci-baseline.md`](ci-baseline.md) documents the implemented `v3-main-ci-baseline` quality gate. The machine-readable supporting decisions are:

- [`dependency-policy.json`](dependency-policy.json) for compatible-current direct dependency holds;
- [`../security/advisory-policy.json`](../security/advisory-policy.json) for production advisory dispositions;
- [`../examples/coverage.json`](../examples/coverage.json) for BDD and evidence traceability.

The baseline is evidence for hermetic JavaScript workspace CI only. It does not imply that native packages, examples, docs, packed consumers, or registry promotion are certified.

## Implemented packed npm package gate

[`package-contracts.md`](package-contracts.md) documents the implemented `v3-package-module-contracts` quality gate. It packs all twelve npm candidates, validates their intentional payloads, runs strict Publint and Are The Types Wrong checks, installs one tarball-only candidate set, and exercises Node ESM, Node CommonJS, TypeScript NodeNext, Node16, and Bundler consumers.

This gate proves package format, declaration routing, metadata, and tarball boundaries. It does not prove framework behavior, a React-free core, native platforms, showcase completeness, visual evidence, release provenance, registry authority, documentation deployment, or stable publication.

## Implemented framework-neutral core gate

[`framework-neutral-core.md`](framework-neutral-core.md) documents the implemented `v3-framework-neutral-core` quality gate. It proves from a packed tarball that core resolves no React runtime or type packages, contains no React imports in either runtime format, contains no React types in either declaration format, and supports shared plus isolated non-React graph consumers.

This closes the React-free core boundary. Cross-binding package resolution and behavior require the separate gate below.

## Implemented binding singleton gate

[`binding-singleton-contract.md`](binding-singleton-contract.md) documents the implemented `v3-binding-singleton-contract` quality gate. Six stable JavaScript bindings declare core as one required compatible peer plus a workspace development dependency, never as a production dependency. An isolated strict-peer consumer resolves one physical core from the application and every binding, then proves cross-binding reactive behavior. A core 4 fixture fails with actionable peer diagnostics.

This closes the React, Svelte, Solid, Web Components, Alpine, and HTMX singleton boundary. Native Tauri/Flutter certification, showcase/browser/device evidence, documentation deployment, provenance, RC recovery, registry authority, and stable publication remain open.

## Implemented shared example contract gate

[`../examples/shared/README.md`](../examples/shared/README.md) documents the implemented `v3-example-coverage-contract` quality gate. The deterministic semantic oracle executes thirteen shared outcomes and [`../examples/coverage.json`](../examples/coverage.json) maps every stable capability and release artifact to those outcomes. `pnpm run verify:example-coverage` rejects missing or stale mappings, evidence drift, nondeterministic or cross-tenant fixtures, duplicate showcase identities, and premature completion claims.

This closes only the cross-showcase semantic vocabulary. It does not certify a framework implementation, browser or native runtime, accessibility, visual fidelity, packed showcase consumption, or release promotion. Those remain evidence owned by each showcase change; React 19/Vite 8 now has its separate application receipts.

## Implemented official A2UI bridge gate

[`a2ui-protocol-bridge.md`](a2ui-protocol-bridge.md) documents the implemented `v3-a2ui-protocol-bridge` quality gate. The package root processes and renders official A2UI v0.9.1 through the maintained official engine; the alpha AG-UI chat/state surface moves to `./ag-ui`; and entity actions cross explicit application authorization plus destructive approval before graph writes. Packed ESM/CommonJS/NodeNext/SSR consumers and built-artifact browser evidence certify this boundary.

This does not certify the separate A2A protocol boundary, complete agentic showcase, Flutter renderer, documentation deployment, provenance, registry authority, or stable promotion.

## Implemented A2A v1 JSON-RPC gate

[`a2a-conformance-agent.md`](a2a-conformance-agent.md) documents the implemented `v3-a2a-conformance-agent` quality gate. The package root uses the official A2A SDK and JSON-RPC lifecycle, requires authentication plus caller-scoped default-deny application policy before graph changes, emits deterministic A2UI artifacts, and passes isolated packed ESM/CommonJS/NodeNext/Node16 consumers. Its upstream receipt pins the exact A2A TCK commit and reports applicable MUST assertions separately from explained exclusions.

Protocol validity never grants application authority. This headless gate certifies neither a rendered agentic showcase nor REST, gRPC, push notifications, extension signing, Flutter rendering, documentation deployment, provenance, registry authority, or stable promotion.

## Implemented Flutter source provenance gate

[`flutter-source-provenance.md`](flutter-source-provenance.md) documents the implemented `v3-flutter-source-provenance` gate. It binds a fresh, allowlist-filtered KnowMe revision to an auditable old-to-filtered commit map, retained metadata, MIT attribution, explicit adapt/reference/reject decisions, one canonical Dart owner, and deterministic lineage evidence.

`packages/entity_graph_flutter` remains the sole canonical Dart package. The provenance import is non-buildable, outside the workspace, and absent from public API ledgers. This gate does not certify the Dart runtime, Riverpod lifecycle, Flutter rendering, Android/iOS behavior, pub.dev authority, documentation deployment, or stable promotion.

## Implemented Dart graph and Riverpod 3 gate

[`dart-graph-riverpod.md`](dart-graph-riverpod.md) documents the implemented
`v3-dart-graph-riverpod` library boundary. The sole canonical Dart graph is
selected and orchestrated by generated Riverpod 3 families; local, remote, and
hybrid views retain ID-only membership; optimistic mutations have exact rollback;
fetch retry is bounded; realtime changes normalize through the graph; and native
FFI remains an optional transport seam. Permanent Dart, Cucumber, public-ledger,
and scoped widget-golden evidence certifies those claims.

The package candidate also passes frozen resolution, deterministic generation,
format, analyze, 70 Flutter tests, and a zero-warning Pub dry run on the
official Flutter 3.44.8 stable SDK. This gate does not certify the complete
Flutter/A2UI showcase, Android/iOS devices, accessibility, pub.dev authority,
the immutable full-release SHA, documentation deployment, or stable promotion.

## Partial Flutter, Riverpod, and A2UI showcase

[`flutter-riverpod-a2ui-example.md`](flutter-riverpod-a2ui-example.md)
documents the complete application at `examples/flutter-riverpod`. It composes
one canonical graph, generated Riverpod controllers, optimistic/offline-aware
CRUD, relationship and realtime invalidation, policy-gated official GenUI,
responsive phone/tablet UI, and an optional FFI transport. The current host
boundary passes analyzer, 25 tests, and three hash-recorded goldens.

The coverage status is deliberately `partial`: those receipts do not establish
frozen resolution under Flutter 3.44.8 stable or Android/iOS runtime and visual
behavior. The shared mobile integration test and workflow lanes are authored,
but execution remains the next platform gate. The example adds no public Dart
declaration and authorizes no registry publication.

## Implemented Tauri desktop/mobile plugin gate

[`tauri-mobile-plugin.md`](tauri-mobile-plugin.md) documents the implemented
Rust-derived binding, registered desktop IPC, capability-denial, and packed
native-payload evidence. The plugin default permission is read-only, and its
native snapshot map is explicitly in-memory; durable SQLite remains owned by
the core adapter.

The plugin gate includes hash-verified Android physical-device and iOS
simulator command/denial receipts. Those receipts certify the packaged native
bridge, not the universal application. Full application restart/offline
behavior, accessibility, visual parity, and desktop/mobile packaging remain
owned by `v3-tauri-universal-example`.

## Implemented universal Tauri application gate

[`tauri-universal-example.md`](tauri-universal-example.md) documents the shared
React/Vite application, normalized graph, persistence/queue boundary, and
native host. Five Chromium flows, packaged macOS IPC/denial/offline restart,
Android API 36 emulator build/runtime/denial, and iOS 26.5 simulator
archive/runtime passed. The coverage ledger records the showcase as
implemented while explicitly excluding Windows/Linux bundles, physical
devices, signing, stores, npm publication, and stable-release certification.

## Implemented recoverable release-candidate gate

[`release-candidate-pipeline.md`](release-candidate-pipeline.md) documents the
implemented `v3-release-pipeline-rc` boundary. It derives all sixteen artifacts
and the twelve-package npm dependency order from the release contract, verifies
tarball-only ESM/CommonJS/TypeScript consumers, preserves Changesets release
notes and provenance, rehearses native registry commands without mutation, and
records restartable matching/absent/conflicting-version recovery.

The only mutating path is separately guarded by GitHub Actions OIDC, an exact
source SHA, the protected `npm-rc` environment, explicit `stage-rc` authority,
and the `next` channel. Repository evidence cannot prove external npm trusted
publisher or GitHub reviewer configuration. This gate does not authorize npm
`latest`, a GitHub Release, documentation deployment, or stable 3.0.0.

## Implemented React 19/Vite 8 showcase

[`vite-react19-example.md`](vite-react19-example.md) documents the implemented
`v3-vite-react19-example` source-workspace boundary. It proves the production
React 19/Vite 8 application across all declared shared scenarios, browser
PGlite/Loro behavior, DevTools, error containment, accessibility, screenshots,
and traces.

The receipt explicitly does not count as packed-package evidence. It supplies
the application gate for a core + React preview RC while other showcases are
finished; a new tarball-only report, immutable rehearsal, and protected npm
approval remain required before `next` can be used from the registry.

## Implemented Next.js App Router showcase

[`nextjs-app-router-example.md`](nextjs-app-router-example.md) documents the
request-owned graph, RSC serialization, scoped React hydration, route
persistence, Server Action, and client realtime boundaries now implemented in
the Next.js 16 example. Its clean packed tarball-only production verifier
installs core and React `3.0.0-rc.1` candidates into an external application
and validates concurrent request isolation, hydration, route persistence,
Server Action mutation, realtime takeover, accessibility, screenshot, and
trace receipts. The evidence-backed coverage entry is implemented; npm
publication and the remaining showcases remain separate gates.

## Implemented Agentic A2A and A2UI showcase

[`agentic-a2ui-example.md`](agentic-a2ui-example.md) documents the dedicated
React 19/Vite 8 application that composes the certified A2A v1 server and A2UI
v0.9.1 renderer with exact `task.update`, `task.archive`, and `task.delete`
application policies. Its deletion-aware clean verifier passes the keyless
stream, golden fixtures, normalized cross-view mutation, denials, human
approval, cancellation, four package builds, both protocol export ledgers, a
Vite production build, three Chromium flows, accessibility, screenshots,
traces, coverage, security, and strict OpenSpec.

The evidence-backed coverage entry is implemented. The receipt remains
source-workspace evidence and does not add a package export, packed-consumer or
external-agent claim, registry authority, or stable-release certification.

## Implemented portable Flint contract gate

[`flint-portable-contracts.md`](flint-portable-contracts.md) documents the
structural `watchEntities`/`mutateEntity` bridge, immutable Realtime
Fabric/Gate/Forge source pins, production issuer and tenant isolation, key and
role separation, current RSA/EC JWKS compatibility boundary, and external
Forge plan/apply/RLS/audit/restart semantics. Default CI uses checked fixtures;
the real-SDK lane is explicit, immutable, and fail-closed.

The gate adds no public runtime export: `createFlintAdapter` and
`publishFlintMutation` were already in the React facade's machine export
ledger. It does not implement Forge provisioning, deploy Flint services, prove
unpinned future source compatibility, authorize npm staging, or certify the
full 3.0 release.

## Registry decision

The stable npm 3.0.0 release requires all twelve npm packages, a GitHub Release, and the production GitHub Pages documentation site. `entity_graph_flutter@3.0.0` is now public and consumer-verified on pub.dev, although a verified publisher is not yet assigned. Standalone Rust publication to crates.io remains deferred. The Tauri Rust crate is embedded in the npm plugin tarball.

The live npm and pub.dev snapshots are recorded in
[`npm-registry-status.json`](npm-registry-status.json) and
[`pubdev-registry-status.json`](pubdev-registry-status.json). This distinction
prevents source, staged, and public registry availability from being conflated.

## Historical specifications

`openspec/specs/v1-0.md` remains as a historical 1.0 release record because archived OpenSpec artifacts link to it. It is no longer an active project specification. The active v3 OpenSpec delta is promoted into `openspec/specs/v3-release-contract/spec.md` when `v3-release-contract` is verified and archived.
