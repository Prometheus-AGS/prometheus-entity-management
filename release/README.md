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

## Partial Tauri desktop/mobile plugin gate

[`tauri-mobile-plugin.md`](tauri-mobile-plugin.md) documents the implemented
Rust-derived binding, registered desktop IPC, capability-denial, and packed
native-payload evidence. The plugin default permission is read-only, and its
native snapshot map is explicitly in-memory; durable SQLite remains owned by
the core adapter.

The gate remains partial because packaged Kotlin and Swift sources are not
Android/iOS execution evidence. Stable mobile certification requires the
documented simulator/device command and denial receipts. The full Tauri
application, restart/offline behavior, accessibility, and visual parity remain
owned by `v3-tauri-universal-example`.

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

## Registry decision

The stable 3.0.0 release requires all twelve npm packages, a GitHub Release, and the production GitHub Pages documentation site. Dart and standalone Rust artifacts remain versioned and certified in the monorepo, while first publication to pub.dev/crates.io is deferred until registry ownership is verified. The Tauri Rust crate is embedded in the npm plugin tarball.

This distinction prevents source availability from being misreported as registry availability. A deferred registry can be promoted in a later 3.x release without changing the normalized graph contract.

## Historical specifications

`openspec/specs/v1-0.md` remains as a historical 1.0 release record because archived OpenSpec artifacts link to it. It is no longer an active project specification. The active v3 OpenSpec delta is promoted into `openspec/specs/v3-release-contract/spec.md` when `v3-release-contract` is verified and archived.
