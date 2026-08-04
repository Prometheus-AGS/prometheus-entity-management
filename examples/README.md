# Examples Workspace

This workspace contains all runnable demo applications for `@prometheus-ags/prometheus-entity-management`.

## 3.0 Showcase Status

The [machine-readable coverage ledger](coverage.json) is the source of truth for example readiness and links back to the authoritative [3.0 release contract](../release/v3-release-contract.json). The release is still in progress: `implemented` identifies complete declared showcase evidence, `partial` records real evidence with named gates remaining, and `planned` is not runtime evidence.

| Showcase | Planned path | Status |
| --- | --- | --- |
| React 19 + Vite 8 | `examples/vite-app` | Implemented (`v3-vite-react19-example`) |
| Next.js App Router | `examples/nextjs-app` | Implemented (`v3-nextjs-app-router-example`) |
| Agentic A2UI | `examples/agentic-a2ui-app` | Implemented (`v3-agentic-a2ui-example`) |
| Flutter + Riverpod + A2UI | `examples/flutter-riverpod` | Implemented: Flutter 3.44.8 host gates, 3 goldens, iOS simulator, and Android API 35 emulator (`v3-flutter-riverpod-a2ui-example`) |
| Tauri desktop + mobile | `examples/tauri-app` | Planned (`v3-tauri-universal-example`) |

The branded Docusaurus site and protected GitHub Pages deployment are separately tracked as planned work in `website/`, culminating in `v3-docs-github-pages`.

## Implemented React 19 and Vite 8 showcase

The `/release-showcase` route now exercises the normalized graph, optimistic
confirmation and rollback, relationship invalidation, local/remote/hybrid
views, REST/GraphQL seams, realtime coalescing, PGlite persistence, Loro
convergence, Suspense/error boundaries, DevTools, and accessibility in a Vite
production build. Run its complete gate from the repository root:

```bash
pnpm run bdd:vite-react19
```

See [`../release/vite-react19-example.md`](../release/vite-react19-example.md)
for the scenario matrix, architecture, commands, loader guidance, and explicit
evidence limits. The receipt is source-workspace browser evidence and does not
replace packed core + React candidate verification or npm RC staging.

## Implemented Next.js App Router showcase

The `/next-runtime` route proves one server graph per request, structured-clone
safe RSC hydration into one browser-owned graph, persistence across client
navigation, reload replacement, validated Server Action mutation, and scoped
realtime takeover. Its clean verifier builds and packs core plus React, installs
only those tarballs into an external Next.js 16 production app, and records
concurrent-request, browser, accessibility, screenshot, and trace evidence:

```bash
pnpm run verify:nextjs-app-router
```

See [`../release/nextjs-app-router-example.md`](../release/nextjs-app-router-example.md)
for the ownership boundary, verification contract, evidence disposition, and
explicit release limits.

The `release.ci.hermetic-main-baseline` quality gate in [`coverage.json`](coverage.json) is implemented and proves frozen installation, dependency/advisory policy, bounded CI gates, and upgraded example build configuration. It does not certify a showcase by itself; every showcase must satisfy its own BDD, platform, and visual-evidence contract.

The `release.packages.packed-module-contracts` gate is also implemented. It proves that all twelve npm tarballs have valid ESM/CommonJS runtime and declaration routes, bounded payloads, strict package-lint results, and isolated Node/TypeScript consumers. It does not exercise or certify an example application; showcase status comes from each owning change.

The `release.flutter.source-provenance` gate is implemented for licensed source lineage. It proves allowlisted KnowMe history, attribution, explicit path dispositions, and one canonical owner at `packages/entity_graph_flutter`. The import is not runnable. The separate Dart library and Flutter showcase gates are implemented: Flutter 3.44.8 host runtime, policy, widget, accessibility-semantic, stable goldens, iOS simulator, and Android emulator receipts are retained independently of the provenance import.

## Implemented Flutter, Riverpod, and A2UI showcase

The [`flutter-riverpod`](flutter-riverpod/README.md) application now composes
the canonical Dart graph, generated Riverpod 3 controllers, local/remote/hybrid
views, optimistic/offline CRUD, relationship and realtime invalidation,
policy-controlled official GenUI rendering, responsive phone/tablet UI, and an
optional FFI transport seam.

Run the stable host boundary from the repository root:

```bash
pnpm run dart:ci
```

The Flutter 3.44.8 gate passes generation, formatting, analysis, 70 package
tests, 25 showcase tests, and three regenerated hash-recorded goldens. The
shared smoke flow also passes on an iOS 26.5 simulator and clean Android API 35
emulator. See
[`../release/flutter-riverpod-a2ui-example.md`](../release/flutter-riverpod-a2ui-example.md)
for the exact architecture, scenario matrix, and exclusions.

## Implemented Shared Semantic Contract

All five showcases now have one deterministic, keyless [shared example contract](shared/README.md). It defines the Project/User/Task/Comment/Activity domain, ID-only lists, security assumptions, eight transport fixtures, and thirteen expected outcomes spanning normalization, optimistic CRUD, invalidation, completeness modes, realtime, offline convergence, protocols, SSR, schema round-tripping, platform boundaries, and lifecycle security.

Run it from the repository root:

```bash
pnpm run verify:example-coverage
```

The `release.examples.shared-semantic-contract` quality gate proves that every stable capability and release artifact is mapped to runnable semantic evidence and that missing/stale mappings fail closed. It is a headless contract, not browser, device, accessibility, or visual evidence. React 19/Vite 8, Next.js, agentic A2UI, and Flutter/Riverpod have complete declared showcase receipts; Tauri remains planned.

## Implemented headless sync evidence

The `release.sync.persistence-convergence` quality gate is implemented for the
`npm-core` and `npm-sync` portions of
`graph.offline-persistence-sync`. It proves real PGlite close/reopen, two
isolated Loro clients, deterministic conflict behavior, actual WebSocket
termination/reconnect, and packed ESM/CommonJS/NodeNext consumers:

```bash
pnpm run test:sync-persistence
pnpm run verify:sync-persistence
pnpm run bdd:sync-persistence
```

The headless sync promotion did not itself change a showcase status. The React
showcase has rendered PGlite/Loro evidence; Flutter has implemented in-memory
queue/reconnect and Android/iOS smoke evidence but no durable-persistence claim; Tauri remains
planned; and overall coverage remains `in-progress`.

## Implemented official A2UI bridge evidence

The `release.protocol.a2ui-official` gate is implemented for the `npm-a2ui`
portion of `protocol.a2a-a2ui` and the A2UI portion of
`security.tenant-actions-secrets`. It proves official v0.9.1 processing and
React rendering, a default-deny entity-graph action boundary, the explicit
`./ag-ui` migration subpath, packed consumers, and real-browser keyboard and
accessibility evidence:

```bash
pnpm run test:a2ui-bridge
pnpm run verify:a2ui-bridge
pnpm run bdd:a2ui-bridge
```

The bridge fixture certifies the renderer package boundary, while the separate
`agentic-a2ui` clean gate now certifies the complete shared-domain showcase and
its declared visual receipts.

## Implemented Agentic A2A and A2UI showcase

The dedicated [`agentic-a2ui-app`](agentic-a2ui-app/README.md) now connects the
official A2A v1 lifecycle to an official A2UI v0.9.1 surface and routes exact
actions through application-owned authorization, approval, command-store, and
normalized-graph boundaries. Its default reference agent is deterministic and
keyless; an external A2A endpoint is an explicit opt-in.

Run the complete deletion-aware gate:

```bash
pnpm run verify:agentic-a2ui
```

It performs a frozen install; typecheck and lint; eleven focused units; core,
React, A2A, and A2UI builds; both protocol export-ledger checks; a Vite
production build; three Chromium flows; coverage, security, strict OpenSpec,
and diff hygiene. The retained receipt hash-binds three screenshots and three
traces and records zero serious or critical axe findings. This remains
source-workspace evidence, not packed-package or external-agent certification.

See [`../release/agentic-a2ui-example.md`](../release/agentic-a2ui-example.md)
for the architecture, action matrix, current evidence, and explicit limits.

## Implemented headless A2A evidence

The `release.protocol.a2a-jsonrpc-v1` gate is implemented for the A2A portion
of `protocol.a2a-a2ui` and `security.tenant-actions-secrets`. It proves official
A2A v1 JSON-RPC discovery and task lifecycle, authenticated caller scoping,
default-deny graph authority, streaming and cancellation, deterministic A2UI
artifacts, isolated packed consumers, and the pinned applicable upstream TCK
MUST suite:

```bash
pnpm run test:a2a-conformance
pnpm run verify:a2a-conformance
pnpm run test:a2a-tck
pnpm run bdd:a2a-conformance
```

Protocol validity never grants application authority. The headless gate does
not certify a rendered showcase, REST or gRPC bindings, push notifications,
extension signing, full shared-domain flows, accessibility, or visual evidence.
Those rendered receipts are implemented by `v3-agentic-a2ui-example`; they do
not broaden the headless protocol gate itself.

## Shared Demo Infrastructure

The examples share one Supabase project for demo purposes:

- `examples/supabase`

That shared backend is intentional. The Vite app, the Next.js app, and future demos such as PGlite or ElectricSQL examples should all point at the same example Supabase project so they demonstrate the same auth, database, storage, and realtime behavior across different frontend stacks.

## Why It Lives Here

Keeping the Supabase project under `examples/` makes the ownership clear:

- it belongs to the example suite, not the core library
- it is shared infrastructure, not app-local configuration
- it can evolve with the examples without implying that library consumers need the same setup

If the example suite grows substantially, this can be promoted to a more explicit shared-infra path later, but the current intent is one shared example backend for all demos.
