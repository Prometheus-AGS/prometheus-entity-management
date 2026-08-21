# Design: v3-flutter-riverpod-a2ui-example

## Candidate reuse decisions

### cand-005 — Flutter GenUI (genui)

- **Verdict:** adopt
- **Decision:** Reuse the official protocol engine and adapt KnowMe's safe catalog/action wrapper rather than own a second Flutter protocol parser.
- **Evidence:**
  - Tier 1: The official Flutter repository is active and provides the maintained GenUI/A2UI implementation. (https://github.com/flutter/genui)
  - Tier 3: pub.dev reported genui 0.10.1 with Dart >=3.10 and Flutter >=3.35.7. (https://pub.dev/packages/genui)
  - Tier 4: GenUI implements A2UI parsing, surface lifecycle, reactive data binding, catalogs, rendering, and user-action emission. (https://pub.dev/documentation/genui/latest/genui/)

### cand-009 — KnowMe gen_ui_widgets

- **Verdict:** adapt
- **Decision:** Extract the safe A2UI wrapper into a focused Flutter A2UI integration; keep or separately package generic ContentBlock widgets only if their public scope is approved.
- **Evidence:**
  - Tier 1: The 2,701-line package delegates A2UI parsing/state/schema work to genui and forwards typed actions to the host, but has no package-local tests and includes broader KnowMe ContentBlock/media concerns. (file:///Users/gqadonis/Projects/know-me/know-me-system/flutter_packages/gen_ui_widgets)

### cand-013 — KnowMe desktop and mobile applications

- **Verdict:** reference
- **Decision:** Port small boundary patterns and scenario slices, not entire product directories. Never copy from the dirty working tree.
- **Evidence:**
  - Tier 1: KnowMe contains a production-scale React 19/Tauri desktop, Flutter/Riverpod mobile app, A2UI adapters, and entity runtime boundary patterns. (file:///Users/gqadonis/Projects/know-me/know-me-system)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

## Implementation design

### D-1 · genui owns the protocol; the app owns the surface content

`genui 0.10.1` (pinned exact; depends on `a2ui_core ^0.1.0`) provides `SurfaceController`, the `Surface` widget, and `BasicCatalogItems`. Mirroring the `v3-agentic-a2ui-example` precedent, the example never calls an LLM: a keyless app-owned demo agent emits a fixed A2UI v0.9 message sequence (`CreateSurfaceMessage` → `UpdateComponentsMessage` → `UpdateDataModelMessage` for `surface-task-sync`) built from the shared scenario seed (`task-sync`, `project-atlas`, `tenant-a`). The catalog is `BasicCatalogItems.asNoAssetCatalog()` so no audio/image/video asset lookups can leak into hermetic goldens. Component wire format is `{id, component, ...props}`; button actions use `{event: {name, context}}` with data-bound context values resolved by genui against the surface data model.

### D-2 · Safe action catalog wrapper (cand-009 adapt)

An app-owned `A2uiActionPolicy` sits between `SurfaceController.onSubmit` (UiInteractionPart carrying the action map) and the entity graph. It is fail-closed: unknown action names, malformed payloads, and tenant mismatches are rejected before any graph access; `task.update` is allowlisted and applied through the graph; `task.delete` is intentionally not allowlisted so the denial receipt renders in the panel; destructive-but-allowlisted actions route through an explicit human approval dialog. This is the Dart counterpart of `createEntityGraphA2uiActionPolicy` in `@prometheus-ags/a2ui-react`; no second protocol parser is created.

### D-3 · Graph ownership and transports

All entity state lives in `EntityGraph.instance` via the generated Riverpod providers (`entityListProvider` hybrid for the task list, `entityProvider` for detail, `entityCrudProvider`/`entityMutationsProvider` for optimistic CRUD). The demo backend is an app-owned in-memory `EntityTransport` with deterministic seed data, scripted failure injection for the rollback path, and a scripted realtime burst (three events, one coalesced flush). The optional Rust transport demonstration is a labeled availability probe over the package's documented FFI seam that reports its unlinked status; it never owns graph data.

### D-4 · Adapter-boundary persistence and offline convergence

A `DemoPersistenceAdapter` exposes exactly `loadGraph`/`saveGraph`; `deleteAll` is denied fail-closed, satisfying the adapter-boundary scenario. Offline convergence is demonstrated at the model level: two in-memory clients persist snapshots, mutate disjoint fields offline, reconnect, merge, and reload with zero conflicts — the same expected values as `example.offline.persistence-convergence`.

### D-5 · Verification lanes and honest platform limits

Unit tests cover policy denial/malformed/tenant paths, the adapter boundary, and offline convergence. A protocol test replays the golden message fixtures through `SurfaceController` and asserts the approved/denied/malformed outcomes end to end. Widget tests cover list/detail/A2UI panel rendering, optimistic confirm and rollback, loading/error/empty states, and semantics labels. Goldens are pinned at phone and tablet sizes with Linux variants and the package's tolerance comparator. Android/iOS smoke is compile-level (`flutter build apk --debug`, `flutter build ios --simulator --no-codesign`) when the toolchain is present; the absence of booted emulators/devices is recorded as a retained platform limit, not waived silently.

