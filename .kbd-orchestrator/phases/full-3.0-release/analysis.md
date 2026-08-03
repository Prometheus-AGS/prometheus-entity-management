# ANALYSIS: full-3.0-release

**Generated:** 2026-08-01  
**Mode:** stack specified  
**Inputs:** completed 3.0 assessment, current monorepo, `hybrid-mobile-architecture-src` at `e641c25`, and `know-me-system` at `68f7ab8` with a dirty working tree  
**Purpose:** determine the target architecture, reuse decisions, source-migration boundary, and example evidence required before a full `3.0.0` release

## Analysis conclusion

The requested five-example portfolio is feasible in this monorepo, but it should not be implemented as five independent showcase apps or by copying the KnowMe repositories wholesale. The correct target is one release-certification system with:

- one shared entity domain and deterministic scenario suite;
- five purpose-specific runnable examples;
- one canonical package per language/framework responsibility;
- small consumer fixtures for the remaining published bindings;
- and package/runtime evidence generated from the exact artifacts intended for release.

The largest architecture work is not React or Next.js. It is resolving three conflicting alpha contracts before they become stable promises:

1. **Flutter has two incompatible sources of truth.** `entity_graph_flutter` owns a Dart graph; KnowMe's `prometheus_entity_management` treats Rust as canonical and Riverpod families as the projection/cache.
2. **The current `a2ui-react` package is not an A2UI renderer.** It consumes an AG-UI-like message/state event subset. Official A2UI now has maintained React and Flutter protocol engines.
3. **The current Tauri package is desktop-shaped despite mobile claims.** It has a Rust plugin and TS facade, but generated bindings are a stub and there is no runnable desktop/mobile consumer.

Stable 3.0 should consolidate these contracts rather than document around them.

## Stack decision

The user specified the target stacks, so no stack-discovery contest or `stack-recommendation.md` is warranted:

- React 19 with Vite 8;
- Next.js App Router;
- agentic A2UI;
- Flutter with Riverpod 3;
- Tauri 2 with one React/Vite frontend targeting desktop, iOS, and Android.

The research therefore ranks candidates inside these stacks. There is no close alternative-stack choice requiring elicitation.

## Source inventory and reuse boundary

### Current Prometheus monorepo

The repository already contains most lower-level capability:

- a React 19/Vite 8 example and a Next 16 App Router example;
- twelve alpha npm packages, including React, A2A, A2UI-named, sync, SDL, and Tauri packages;
- a 2,211-line `entity_graph_flutter` alpha with package-local tests;
- two Rust binaries/crates for CLI and MCP;
- and a Tauri Rust plugin with TypeScript bindings/facade.

The examples are not yet release evidence:

- Vite and Next duplicate much of the same UI;
- both still expose legacy hook/store patterns alongside v3 transports;
- both use non-portable sibling `link:` dependencies to `prometheus-entity-sync`;
- they do not cover all package/API families;
- and their full production build is not currently deterministic.

The correct default is to refactor these examples, not replace them.

### hybrid-mobile-architecture-src

This repository is KnowMe Builder, an MIT-licensed generator and template authority. Its own `AGENTS.md` explicitly says it contains no runnable application. Its value to this phase is:

- maintained Flutter, Tauri/React, Rust, A2UI, and hybrid profile structure;
- feature-layering and transport-boundary rules;
- version-authority and conformance patterns;
- production/runtime certification discipline;
- and source templates that should eventually consume the stable packages from this repository.

It should **not** be merged into this monorepo. Moving its templates would create two generator authorities and defeat its ownership-aware upgrade model. Use the templates as references, then update Builder in a coordinated downstream change after this repository becomes canonical for the packages and examples.

The migration-source inspection was explicit: reusable Flutter material exists under `assets/templates/flutter-feature` and `assets/templates/profiles/*/mobile`, and A2UI material is template/skill guidance. There is no top-level Flutter `lib/` package or A2UI runtime package to move from this repository. Therefore, Builder is rejected as a library-code migration source while retained as a template/conformance reference. The actual reusable Flutter runtime sources named by the goal are in KnowMe.

### know-me-system

KnowMe is a product monorepo, not a component library. It contains highly useful reusable slices:

- `flutter_packages/prometheus_entity_management`: 2,704 lines including generated code; Riverpod 3 provider families, view descriptors, a transport seam, a change bridge, and optimistic CRUD;
- `flutter_packages/gen_ui_widgets`: 2,701 lines; a safe wrapper around Flutter `genui`, typed A2UI action forwarding, ContentBlock rendering, and media resolver boundaries;
- `flutter_packages/gen_ui_flutter`: roughly 30 lines; an unused placeholder whose actual FRB bindings and native linking live in the KnowMe mobile app;
- a React 19/Vite 8/Tauri desktop product demonstrating component → hook → store → invoke layering;
- a Flutter/Riverpod mobile product demonstrating widget → provider → repository → FFI layering;
- agent-event, A2UI surface, media, and entity-runtime boundary patterns.

The KnowMe repository has no root LICENSE file in the assessed checkout. Even if ownership is shared, a public stable release must record the authorization and license under which extracted source is redistributed. The working tree also contains unrelated session-log changes and a modified UAR submodule. Migration must use a clean, named commit and filtered history—not the current working directory.

### What moves and what stays

| Source | Decision | Destination/relationship |
|---|---|---|
| KnowMe `prometheus_entity_management` generic models/providers/CRUD | Move and adapt with history after license confirmation | Canonical Flutter/Riverpod package in this monorepo |
| Current `entity_graph_flutter` graph, SDL, transport tests | Retain and refactor | Pure-Dart lower layer or deterministic Dart transport beneath the canonical Flutter binding |
| KnowMe `gen_ui_widgets` A2UI wrapper | Extract and adapt | Focused Flutter A2UI integration package; do not couple it to the graph core |
| KnowMe general ContentBlock/media widgets | Separate decision | Optional focused package only if its scope/license is approved; not required by entity graph core |
| KnowMe `gen_ui_flutter` placeholder | Do not move as-is | Keep KnowMe-specific FRB/native implementation with `gen_ui_core`; later extract a real adapter if reusable |
| KnowMe desktop/mobile app directories | Reference only | Port narrow scenarios and boundary patterns, not product code |
| KnowMe Builder templates/skills | Keep external | Update them downstream to consume the new packages/examples |

## Target monorepo topology

The following topology gives each ecosystem one authority without pretending one build tool can natively manage all of them:

```text
packages/
  entity-graph-core/                 TypeScript framework-neutral graph
  entity-graph-react/                React binding / compatibility package
  entity-graph-*/                    Existing JS bindings and integrations
  entity-graph-dart/                 Proposed pure-Dart graph, SDL and transport contracts
  prometheus_entity_management/      Proposed Flutter + Riverpod 3 binding
  a2ui_flutter/                      Proposed official-genui Flutter integration
  entity-graph-tauri/
    rust-plugin/                     Rust plugin
    src/                             TypeScript guest facade

examples/
  shared/                            schema, fixtures, scenario IDs, coverage metadata
  react-vite/                        React 19 + Vite 8 browser reference
  nextjs-app/                        RSC/SSR/hydration reference
  agentic-a2ui/                      official A2UI + AG-UI/A2A + graph reference agent
  flutter-riverpod/                  Flutter/Riverpod 3 reference
  tauri-universal/                   one React/Vite Tauri app: desktop + iOS + Android
  consumers/                         small Svelte/Solid/Alpine/HTMX/Web Component package smokes

pubspec.yaml                         Dart native workspace members
melos.yaml                           Dart-only scripts/version/bootstrap helper
Cargo.toml                           explicit Rust workspace if crate compatibility permits
pnpm-workspace.yaml                  JavaScript packages/examples only
```

Names are recommendations for the Spec stage, not file operations performed by Analyze. In particular, the public Flutter package name must be resolved before source migration.

### Orchestration boundary

- pnpm remains the only JavaScript package manager and root operator.
- Turbo runs JavaScript builds/tests.
- a Dart native workspace plus Melos runs Flutter/Dart analysis, code generation, tests, and publish checks.
- Cargo runs Rust crates and the Tauri plugin/app.
- root `pnpm` scripts invoke those ecosystem-specific gates and produce one certification report.
- Changesets versions/publishes npm packages only. Dart and Rust publication state remain explicit separate ledgers.

This avoids forcing Flutter into Turbo or hiding crates.io/pub.dev work behind npm semantics.

## Shared example contract

Five independent domains would make the examples impossible to compare and expensive to maintain. Every example should use the same small domain:

- `User`
- `Project`
- `Task`
- `Comment`
- `Activity`

The SDL/schema, IDs, seed data, filters, relations, mutation scenarios, and expected outcomes should be generated or mirrored from one checked contract. Platform adapters may differ, but scenario IDs and assertions should not.

### Required deterministic scenarios

1. **Cross-view normalization:** update one Task and observe list, detail, badge, relation, and activity views update without copied entity data.
2. **List behavior:** local/remote/hybrid query modes, filtering, sorting, cursor pagination, invalidation, and sorted realtime insertion.
3. **Engine behavior:** request dedupe, stale/revalidation, focus/reconnect, cancellation, error classification, and garbage collection.
4. **CRUD behavior:** isolated edit buffer, validation, optimistic apply, rollback, relation change, and cascade invalidation.
5. **Realtime behavior:** coalesced updates and delete propagation.
6. **Persistence/sync:** PGlite snapshot persistence plus mandatory Loro two-client convergence through a deterministic loopback channel; WebSocket reconnect is an integration lane. Yjs remains a secondary consumer fixture.
7. **Agent behavior:** agent state projects into graph entities, a proposed mutation requires approval, rejection restores the baseline, and approval persists.
8. **Schema/tooling:** SDL parses, generated types compile, and a schema evolution failure is visible.
9. **Accessibility:** keyboard navigation, focus restoration, labels/live regions, reduced motion, and minimum touch targets where applicable.
10. **Restart/reload:** persisted state rehydrates without duplicate entities or stale subscriptions.

Each scenario needs a stable identifier such as `GRAPH-XVIEW-001`, used by the React, Flutter, Tauri, and E2E tests. A machine-readable `examples/coverage.json` should map every stable public capability/package to at least one example route, scenario, and test. This is the replacement for vague claims that examples “show all features.”

## Example portfolio

### 1. React 19 / Vite 8

**Reuse:** existing `examples/vite-app`.  
**Framework candidate:** Vite 8.2.x at implementation time; Vite 8 requires Node 20.19+ or 22.12+ per the [official Vite guide](https://v8.vite.dev/guide/).

This is the broad interactive API showcase. It should contain explicit routes for:

- normalized graph inspector and cross-view update;
- entities and ID-only lists;
- views: local, remote, hybrid, filter, sort, pagination;
- CRUD and optimistic rollback;
- realtime coalescing;
- persistence and sync;
- Suspense/error/retry states;
- time travel/devtools;
- REST, GraphQL, and deterministic fixture transports;
- SDL/type generation;
- accessibility and performance/bundle evidence.

Changes required:

- migrate legacy feature stores/hooks to the v3 transport/query pattern;
- remove direct sibling `link:` dependencies from the default install path;
- make external sync integration opt-in or use a workspace/package fixture;
- upgrade from Vite 8.0.3 to a verified current 8.x version;
- add Vitest component/integration tests and Playwright production-build flows;
- enforce component → hook → store/adapter boundaries;
- consume shared schema/scenario fixtures rather than local duplicated mocks.

The chosen stable demonstration path is the existing `entity-graph-sync` bridge with Loro for peer convergence and the core PGlite adapter for local persistence. The release job must install the optional Loro dependency and treat skipped provider tests as failure. The sibling `prometheus-entity-sync` link remains an opt-in external contract job until it is consumable without absolute/sibling paths.

Do not use TanStack Query as a second owner of entity state. Keep one bridge route only to demonstrate ingestion from an existing query client, clearly labeled as interoperability rather than the recommended architecture.

### 2. Next.js

**Reuse:** existing `examples/nextjs-app`.  
**Framework candidate:** Next.js 16.2.12 observed in the registry.

The Next example should be narrower than Vite and prove framework-specific behavior:

- request-local server preload;
- serialization of normalized entities/lists;
- client graph hydration exactly once;
- React Server Component → Client Component boundaries;
- streaming/Suspense around client graph islands;
- server actions/API routes that mutate through store/adapter services rather than client secrets;
- cache/revalidation behavior without sharing a global graph between requests;
- hydration mismatch and duplicate-fetch regression tests.

Next's [Server and Client Components guidance](https://nextjs.org/docs/app/getting-started/server-and-client-components) supports a deep client provider boundary inside server-rendered layouts. The example must not mark the entire app `use client` merely to make the graph work. Because async Server Component unit support remains incomplete, use production-build Playwright coverage as recommended by the [Next testing guide](https://nextjs.org/docs/app/guides/testing).

Changes required:

- update Next 16.2.1 and security-affected transitive dependencies;
- repair the root lockfile and explicit Turbopack workspace root;
- distinguish server preload code from client transport/store code with `server-only`/`client-only` boundaries where useful;
- delete UI duplication that does not teach SSR/hydration behavior;
- test two concurrent server requests to prove no cross-user graph leakage.

### 3. Agentic A2UI

**Build:** a new example; reuse current packages and narrow KnowMe patterns.  
**Protocol candidates:** official `@a2ui/react` and `@a2ui/web_core`; use A2UI v0.9.1 as current production protocol, with v1.0 behind a versioned adapter until it is no longer candidate.

The current `@prometheus-ags/a2ui-react` package is misnamed for stable release. Its `StreamEvent` union contains `MESSAGE_*`, `TOOL_CALL_*`, `STATE_SNAPSHOT`, and `STATE_DELTA`; it has no A2UI surface lifecycle, component catalog, data model, JSONL parser, schema validation, or action protocol. Those are AG-UI/chat projection concerns.

Official guidance says web renderers should use [`@a2ui/web_core`](https://a2ui.org/guides/renderer-development/) for message processing, surface state, schema validation, data binding, and actions. The recommended package split is:

- move the existing state projection/chat primitives into an accurately named AG-UI integration, such as `entity-graph-agui-react`;
- rebuild `@prometheus-ags/a2ui-react` as a thin integration over official `@a2ui/react`;
- keep assistant-ui at example/application level for thread/composer behavior;
- let Prometheus own graph projection, action policy/approval, entity diffs, and transport adapters—not the A2UI protocol engine.

Protocol and package versions are distinct axes:

| Item | Status observed | 3.0 decision |
|---|---|---|
| npm `@a2ui/react` 0.10.2 / `@a2ui/web_core` 0.10.5 | Current library distribution versions | Adopt these maintained distributions after consumer verification. Their `0.10.x` package versions do not mean “A2UI protocol v0.10.” |
| A2UI protocol v0.9 | Previous stable | Accept only as an explicit compatibility fixture if existing persisted surfaces require it. |
| A2UI protocol v0.9.1 | Official documentation labels it current production | Stable 3.0 default protocol target. Use the official `web_core/v0_9` entry point, which supports v0.9/v0.9.1. |
| A2UI protocol v1.0 | Candidate | Compile/contract-test behind a version adapter; do not make it the stable default until the upstream status changes. |

This choice follows upstream protocol status, not the npm package version. The implementation gate must prove that the selected `0.10.x` packages still expose the documented v0.9.1 entry points before pinning them.

The example must be genuinely agentic while remaining deterministic in CI:

```text
user intent
  → local reference agent or configured external A2A endpoint
  → A2UI JSONL surface stream
  → official A2UI processor/renderer
  → typed user action
  → policy + optional EntityApproval
  → graph mutation through store/adapter
  → normalized views update
  → action/result returned to agent
```

Required example flows:

- agent creates a Task planning surface from graph data;
- fields bind to a surface data model;
- a user action proposes an entity mutation;
- approval shows a graph-backed diff;
- rejection restores the captured graph state;
- approval writes through a transport and updates all views;
- malformed/unknown components fail closed with a safe fallback;
- client capabilities/catalog version are sent to the agent;
- no service key or model API key is exposed to the browser.

Use a deterministic reference agent in the repository so CI requires no external service. An optional environment-configured agent endpoint can prove A2A/MCP/Flint integration in a separate job.

#### A2A candidate decision

The existing `@prometheus-ags/entity-graph-a2a` alpha is the preferred starting point for that reference agent. It already implements AgentCard discovery, task send/get/cancel, graph mutation/query parts, an in-memory task store, and artifact responses. It is not yet certified as the agent transport for stable 3.0 because this Analyze pass did not compare its self-described “A2A v1.0” types with the current upstream A2A specification before the research cap was reached.

Before it becomes primary release evidence, Spec/Plan must require:

- upstream A2A version and schema conformance fixtures;
- A2UI artifact/metadata and client-capability mapping;
- a streaming task/event path for progressive A2UI surfaces;
- durable/resumable task behavior or an explicit example-only in-memory boundary;
- cancellation, duplicate request/idempotency, authentication, tenant, and tool-policy tests;
- one deterministic A2UI action round-trip through the A2A task.

The build-vs-adopt call is therefore **adapt the existing package**, not adopt an uninspected agent framework or build a second server.

### 4. Flutter with Riverpod

**Build:** new example plus consolidation of two alpha implementations.  
**Framework candidates:** Riverpod 3 and official Flutter `genui`.

The canonical architecture should have three separable layers:

```text
Flutter widgets
  → Riverpod 3 provider families/controllers
  → EntityTransport
     ├── DartGraphTransport (deterministic/example/offline)
     └── Rust/FRB transport adapter (KnowMe/native host)
  → canonical store selected by the host transport
```

This preserves a general-purpose Flutter package while allowing KnowMe to keep Rust as its canonical store. The public provider API must not assume `gen_ui_core`, and the Rust adapter must not leak FFI calls into widgets/providers.

Recommended package responsibilities:

- `entity-graph-dart`: pure Dart entity/list/patch/view/SDL/change/error contracts and deterministic graph implementation;
- `prometheus_entity_management`: Flutter/Riverpod 3 providers, list/entity families, change bridge, CRUD/edit buffer, and lifecycle integration;
- host-specific adapters: Dart transport in this repository; KnowMe FRB implementation remains with its Rust core until it is truly generic;
- `a2ui_flutter`: official `genui` surface wrapper and typed action bridge, isolated from core entity state.

The example should demonstrate:

- `ProviderScope` bootstrap and transport overrides;
- entity/list provider families;
- cross-view updates and list invalidation;
- Riverpod 3 retry policy: transient network errors may retry, terminal domain/FFI errors explicitly do not;
- isolated CRUD edit buffer and optimistic rollback;
- realtime change stream;
- local persistence/restart;
- the same SDL and scenario fixtures as the TypeScript examples;
- one embedded official A2UI surface whose action passes widget → provider → repository/transport;
- responsive phone/tablet layouts, keyboard navigation, semantics, and golden tests.

Dependency analysis:

- current `entity_graph_flutter` claims Riverpod 3 but uses `flutter_riverpod` 2.6.1;
- KnowMe uses a validated Riverpod 3.3.1/annotation 4.0.2/generator 4.0.3/Freezed 3.2.5 set because of analyzer conflicts;
- current registry versions are Riverpod 3.4.2 and annotation 4.0.6;
- [Riverpod's migration guide](https://riverpod.dev/docs/3.0_migration) highlights automatic retry as a behavioral change;
- official `genui` 0.10.1 requires Dart >=3.10 and Flutter >=3.35.7 and remains pre-1.0.

Do not copy the latest individual versions into manifests. Resolve Riverpod, generator, Freezed, JSON generator, analyzer, Flutter, and Dart together from a clean stable SDK. A full stable 3.0 library should not impose the KnowMe beta Flutter floor unless a stable SDK cannot satisfy the required APIs and that decision is explicit.

### 5. Tauri desktop and mobile

**Build:** a new `examples/tauri-universal` from the official Tauri React template.  
**Framework candidates:** Tauri CLI 2.11.4, React 19, Vite 8.

Tauri officially targets desktop and mobile and `create-tauri-app` supplies a maintained React/pnpm template. One frontend and `src-tauri` project can target macOS, Windows, Linux, iOS, and Android. That does not mean one passing desktop test certifies all five.

Required flows:

- typed generated graph bindings, not the checked-in stub;
- Rust command → frontend graph update;
- frontend mutation → Rust state/persistence;
- event subscription and cleanup;
- snapshot persistence, process restart, and restore;
- offline mutation plus later reconciliation;
- platform capability/permission denial surfaced as typed errors;
- the same Task/Project scenarios used by Vite/Flutter;
- desktop window lifecycle and mobile pause/resume;
- touch targets, safe areas, keyboard behavior, and platform navigation.

Official [mobile plugin guidance](https://v2.tauri.app/develop/plugins/develop-mobile/) requires explicit Android/iOS initialization, native modules when needed, and capability/permission handling. The current entity graph plugin must be audited to decide whether its Rust-only commands are portable as-is and whether optional SQL persistence has equivalent mobile support. If native plugin modules are required, generate and check in their Kotlin/Swift sources using the Tauri plugin workflow.

Certification lanes:

- macOS/Windows/Linux production build and launch smoke;
- Android compile plus emulator/device CRUD/persistence/restart smoke;
- iOS compile plus simulator/device CRUD/persistence/restart smoke;
- artifact-specific permissions/capabilities test;
- no claim of mobile support until the plugin, not merely the shell, passes.

The KnowMe Tauri product is desktop-only and carries UAR, inference, auth, PGlite, and product dependencies. Use its layer boundaries and UI patterns as references, not as the example skeleton.

## Feature coverage allocation

| Capability | Vite | Next | A2UI | Flutter | Tauri | Consumer fixture |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Core graph/entities/patches/lists | Primary | Hydrate | Projection | Mirror | IPC mirror | Yes |
| REST/GraphQL transport | Primary | Server/client boundary | Optional agent tool | Transport seam | Rust/TS seam | — |
| Local/remote/hybrid views | Primary | Client island | Agent reads | Provider families | Frontend | — |
| CRUD/edit/optimistic rollback | Primary | Server mutation | Approval flow | Primary | IPC flow | — |
| Realtime coalescing | Primary | Hydrated client | State/event stream | Change stream | Rust events | — |
| Suspense/error/retry | Primary | RSC + client | Stream errors | AsyncValue | Typed IPC errors | — |
| SSR/RSC isolation | — | Primary | — | — | — | — |
| Official A2UI surfaces/actions | Optional view | Optional route | Primary | One native surface | Reuse web surface | — |
| AG-UI state mapping | Demo | — | Primary | Protocol adapter only | Web surface | — |
| A2A server/client | — | Endpoint option | Primary | Optional | Optional | — |
| SDL/generation | Primary | Compile use | Catalog mapping | Primary | Generated bindings | — |
| Persistence/restart | Browser | Hydration | Session entities | Primary | Primary | — |
| Svelte/Solid/Alpine/HTMX/Web Components | — | — | — | — | — | Primary |

This division is deliberate. “Full examples” means the suite proves the full product surface; it does not mean every app repeats every route.

## Release-system implications

The examples must be certification inputs, not documentation-only demos.

### Required root gates

1. clean frozen installation on current `origin/main`;
2. JavaScript typecheck, test, lint, and deterministic production builds;
3. Dart format, analyze, codegen-drift check, tests, golden tests, and publish dry-run;
4. Cargo format, clippy, tests, locked builds, and Tauri platform jobs;
5. packed npm consumer tests for ESM, CommonJS, and conditional types;
6. packed-package metadata/type-resolution checks using Publint and Are The Types Wrong only after Spec/Plan records current maintenance/version evidence; otherwise use an approved maintained equivalent plus the mandatory direct Node ESM/CJS/type consumer smokes;
7. per-example Playwright/integration scenarios driven by shared IDs;
8. skills/docs/example coverage validation;
9. audit disposition and software-bill/package inventory;
10. registry dry runs and provenance verification.

Use npm trusted publishing/provenance and Changesets for npm packages, but do not let a Changesets PR imply that Dart or Rust artifacts were certified or published. The explicit registry-publication target for this phase remains npm. Flutter/Rust source consolidation and examples are mandatory because the expanded phase goal names them; pub.dev and crates.io publication are conditional Spec choices. `progress.json` therefore needs separate npm publication evidence and Dart/Rust/application certification evidence, adding pub.dev/crates.io publication ledgers only if those registries enter the approved release scope.

### Version policy

The Spec stage must decide which artifacts share `3.0.0`:

- the twelve npm packages currently do;
- the Rust CLI/MCP crates currently use `3.0.0-alpha.0`;
- `entity_graph_flutter` uses `3.0.0-alpha.0`;
- the imported KnowMe packages use unpublished `0.1.0` versions.

Recommended policy:

- fixed `3.0.0` for the coherent public entity-graph packages and compatibility bindings;
- clearly experimental packages may use independent pre-1.0 protocol-adapter versions only if they are excluded from the “all stable at 3.0” claim;
- otherwise, if A2UI/Tauri/Flutter are promised as full stable 3.0, their public adapters must share the release certification and compatibility window even if registries use ecosystem-specific formatting.

Do not silently label official pre-1.0 A2UI APIs as a permanent stable promise. Pin the supported protocol/version and isolate it behind a small adapter.

## Source migration method

No files are moved during Analyze. The future migration should:

1. obtain explicit license/relicensing authority for the selected KnowMe source;
2. select a clean source commit and record it in a provenance document;
3. use a temporary clone plus path filtering to preserve history for each selected package;
4. merge filtered history into new canonical destinations;
5. separate generated Dart files from authored source and establish a codegen-drift gate;
6. adapt imports/names only after the historical merge;
7. add package-local tests before removing KnowMe's copies;
8. update KnowMe to consume path/git/released packages from the new authority;
9. update KnowMe Builder templates and version authority downstream;
10. delete duplicate sources only in coordinated repository changes with rollback points.

Copying the dirty KnowMe working tree or moving all `flutter_packages/` would be unsafe and would import an empty package plus product-specific runtime assumptions.

## Build-vs-adopt summary

### Adopt

- Vite 8, Next.js App Router, Tauri 2/create-tauri-app;
- official `@a2ui/react` and `@a2ui/web_core`;
- Flutter `genui`;
- Riverpod 3 code generation stack;
- Melos for the Dart sub-workspace;
- Changesets for npm release state;
- Publint and Are The Types Wrong are strong packed-artifact gate candidates, but final adoption needs a maintenance/version check because Analyze reached its Tier 3 cap.

### Adapt

- existing Vite and Next examples;
- current AG-UI/chat/diff/approval code under accurate package boundaries;
- current Dart graph/SDL/tests;
- KnowMe Riverpod providers/view/CRUD concepts;
- KnowMe safe Flutter A2UI wrapper;
- current Tauri Rust/TypeScript plugin;
- KnowMe/Builder architecture patterns.

### Reference only

- KnowMe desktop and mobile applications;
- KnowMe Builder profiles/templates;
- assistant-ui as an optional A2UI example shell only after a current maintenance check; fallback is a small accessible example-owned thread/composer shell.

### Reject as-is

- moving the 30-line unused `gen_ui_flutter` placeholder;
- maintaining both Dart-native and Rust-only Flutter public models as peers;
- reimplementing official A2UI parsing/schema/surface state;
- copying the KnowMe product or dirty working tree into examples;
- claiming Tauri mobile support from a desktop build;
- making each example independently reproduce the entire suite.

The complete machine-readable verdicts and evidence are in `library-candidates.json`.

## Scope and sequencing implications

This is a large release-hardening effort with at least seven independently verifiable workstreams:

1. package/module/release pipeline repair from the assessment;
2. shared example domain and coverage contract;
3. Vite + Next modernization;
4. official A2UI package split/bridge and agentic example;
5. Flutter source migration/consolidation and Riverpod example;
6. Tauri plugin completion and universal example;
7. skills, docs, consumer fixtures, and cross-ecosystem certification.

Flutter licensing/provenance, A2UI package naming/protocol pin, and Tauri mobile persistence are architectural dependencies, not cleanup tasks. The Plan stage should put them before broad UI implementation.

## Open questions for Spec

1. **KnowMe source license:** Under what explicit license should selected KnowMe Flutter source be redistributed in this public repository? The assessed source has no root LICENSE file.
2. **Flutter public name:** Is `prometheus_entity_management` the canonical pub.dev package, with `entity_graph_flutter` folded into a lower layer/compatibility shim, or should the existing alpha name remain public?
3. **Flutter canonical-store promise:** Must every Flutter host use Rust as canonical, or is Rust one transport while a Dart graph remains supported? Recommendation: generic transport contract with both modes; KnowMe selects Rust.
4. **A2UI version:** Recommendation: v0.9.1 current production for 3.0, versioned adapter for candidate v1.0. Confirm whether the release must wait for A2UI v1.0.
5. **A2UI package compatibility:** May the alpha `@prometheus-ags/a2ui-react` be repurposed to actual A2UI and its current AG-UI API move to a new package? Recommendation: yes, because leaving the name inaccurate is worse than alpha migration work.
6. **Tauri mobile certification:** Which physical-device evidence is required for iOS/Android, and is SQL persistence required on both? Recommendation: at least one current device per mobile OS for persistence/restart if those capabilities are advertised.
7. **Registry scope:** Are Flutter and Rust packages part of the same public 3.0 launch event, or only source-coordinated artifacts? The release workflow and version policy depend on this answer.
8. **ContentBlock package scope:** Should the generic KnowMe ContentBlock/media widgets become a public package here, or should only the A2UI surface wrapper move? Recommendation: move only the focused A2UI integration for 3.0; assess ContentBlock separately.

These questions do not prevent Spec from defining defaults. The recommendations above are sufficiently conservative to proceed unless the product contract says otherwise.

## Research record

The Analyze research cap was observed:

- Tier 1 GitHub queries: 8/8;
- Tier 2 Context7/docfork: unavailable, 0 queries;
- Tier 3 registry queries: 8/8;
- Tier 4 official web queries: 8/8;
- elapsed research stayed within the 20-minute cap.

Key current observations:

- Vite registry: 8.2.0;
- Next registry: 16.2.12;
- Tauri CLI registry: 2.11.4;
- official `@a2ui/react`: 0.10.2; `@a2ui/web_core`: 0.10.5;
- Flutter `genui`: 0.10.1;
- `flutter_riverpod`: 3.4.2; `riverpod_annotation`: 4.0.6;
- Melos: 8.2.2.

Version observations are not automatic upgrade instructions. The Spec/Plan must encode compatible version sets and clean-build evidence.

## Analyze handoff

Candidate set: 20 candidates—8 adopt, 11 adapt/reference decisions, and 1 rejected-as-is boundary—plus 8 repository-specific build requirements. The central calls are:

- reuse/harden Vite and Next;
- adopt official A2UI engines and correct the current package naming/contract;
- consolidate Flutter rather than ship two stores;
- extract reusable KnowMe Flutter code with history and license evidence;
- keep the KnowMe runtime and Builder generator external;
- complete the Tauri plugin through real desktop/mobile evidence;
- and make a shared coverage manifest the definition of “all features.”

No stack recommendation artifact is produced because the requested stacks are explicit.

## Unresolved review findings

The second and final isolated review round retained one CRITICAL finding. Its requested substance has been added above and to `library-candidates.json`, but the KBD two-round cap prevents a third judge pass. The finding is preserved verbatim for Spec:

> **CRITICAL — `library-candidates.json`**  
> **Claim:** The analysis does not evaluate the existing A2A package or any A2A implementation candidate despite making A2A a primary part of the agentic example and release surface.  
> **Evidence:** The file tree contains `packages/entity-graph-a2a`; analysis.md says the monorepo has packages “including React, A2A, A2UI-named, sync, SDL, and Tauri packages” and the feature coverage table marks “A2A server/client” as “Primary” for the A2UI example, but `library-candidates.json` has no candidate for `entity-graph-a2a`, A2A protocol/runtime, or an A2A build-required item.  
> **Suggested fix:** Add an explicit candidate/build-required entry for the existing A2A package and the A2A runtime/protocol choice, with verdict, maintenance/provenance evidence, and required certification scenarios.

Disposition after the final review: candidate `cand-019` now evaluates the existing package with an `adapt` verdict and explicit risks; `build-a2a-conformance` records the missing upstream/version/A2UI contract work; the agentic example section now lists its certification scenarios. The finding remains unresolved only in the procedural sense that those revisions were not independently re-vetted.
