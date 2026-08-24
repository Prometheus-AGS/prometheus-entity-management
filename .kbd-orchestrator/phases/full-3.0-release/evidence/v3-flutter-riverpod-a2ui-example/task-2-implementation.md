# Task 2 — Flutter/Riverpod/A2UI implementation

Date: 2026-08-03
Change: `v3-flutter-riverpod-a2ui-example`
Task: Implement the complete plan scope without weakening its exclusions.

## Outcome

The complete application implementation is present at
`examples/flutter-riverpod`. The app uses the shared deterministic
`Task`/`Project`/`User` IDs, one isolated `EntityGraph`, generated Riverpod 3
providers/controllers, an exact `genui 0.10.1` dependency, standard Android and
iOS host projects, and a feature-based application layout.

This is an implementation boundary, not the test or platform-certification
boundary. Widget/golden/protocol tests remain task 3; coverage, public ledgers,
skills, and documentation remain task 4; clean stable-SDK and platform smoke
lanes remain task 5.

## Implemented scope

| Plan requirement | Implementation |
| --- | --- |
| Generated Riverpod providers | The app-generated `demoRepositoryProvider` and `showcaseControllerProvider` coordinate the canonical package's generated list, entity, CRUD, mutation, and realtime provider families |
| Consolidated graph | `main.dart` creates exactly one application graph and overrides `entityGraphProvider`; lists retain IDs and every UI projection rejoins graph rows |
| Official GenUI protocol handling | `SafeA2uiSurface` delegates parsing, surface lifecycle, data binding, rendering, and user-event construction to `genui 0.10.1` / `a2ui_core 0.1.0` |
| Safe widget/action catalog | Only Card, Column, Row, Text, Button, and Divider render; client functions and unknown components/actions are rejected by atomic JSONL preflight before GenUI receives any frame |
| Optimistic/offline CRUD | Generated CRUD and mutation controllers expose create, optimistic rename, graph-owned delete, deterministic rollback, local-first writes, queued-sync status, and reconnect convergence |
| Relationships | Task detail joins Project and User graph entities; project moves invalidate both old and new task lists and related project entities |
| Realtime/change invalidation | The callback-backed transport emits typed task/project changes; generated bridges write canonical rows and invalidate list membership |
| Shared deterministic fixtures | Uses `tenant-prometheus-demo`, `surface-task-sync`, `task-sync`, `project-atlas`, `user-grace`, and the shared update/archive/delete policy outcomes |
| Accessibility and lifecycle states | Semantic live regions, descriptive controls, responsive phone/tablet layout, and explicit loading/error/empty/status projections are implemented |
| Optional Rust adapter | `DemoRustTaskBridge` implements `FfiEntityBridge`; `FfiEntityTransportAdapter` forwards transport I/O without storing or owning graph state |

## Source consolidation decision

The dirty KnowMe product tree was not copied. The implementation adapted only
the observed safe catalog/action/lifecycle boundary from the already retained
provenance snapshot. KnowMe media widgets, product routing, Rust runtime,
ContentBlock package, and host application state were excluded. The canonical
`entity_graph_flutter` package remains the only graph library.

## Protocol compatibility boundary

The shared semantic fixture describes A2UI 0.9.1. Flutter GenUI 0.10.1 accepts
the official wire identifier `v0.9`. The Flutter fixture therefore preserves
the same tenant, surface, entity, actions, and allow/approval/deny outcomes but
adapts the wire version at one named boundary. It does not claim byte-identical
cross-runtime protocol parity.

## Security boundaries

- Untrusted agent JSONL is validated as one complete batch before the official
  runtime receives any message.
- Surface ID, catalog ID, protocol version, component types, unique IDs, root
  presence, event-only actions, and declared action names fail closed.
- Application policy independently verifies tenant, task identity, update
  payload, approval requirement, and explicit delete denial before Riverpod can
  mutate the graph.
- The optional FFI bridge exposes only the typed transport contract and cannot
  replace the application-owned graph.

These controls trace to actual agent-output, tenant, action-execution, and
native-transport trust boundaries.

## Task-2 verification

Executed from `examples/flutter-riverpod`:

```text
dart format lib
dart analyze --fatal-infos --fatal-warnings
```

Result: `No issues found!`

The root pub workspace resolved `genui 0.10.1`, `a2ui_core 0.1.0`,
`flutter_riverpod 3.3.2`, `riverpod_annotation 4.0.3`, and
`riverpod_generator 4.0.4`. Riverpod source generation completed and the
generated controller surface is checked in.

## Deferred evidence

- The active shell is Flutter 3.47 beta. The supported Flutter 3.44.8 stable
  floor and its SDK-pinned lock resolution remain unclaimed until the clean
  task-5 toolchain receipt.
- No Flutter test, golden, Android build, iOS build, simulator, emulator, or
  physical-device claim is made by this task.
- `examples/coverage.json` remains `planned` until the corresponding task-4 and
  task-5 evidence exists.
- GenUI upstream describes the package as highly experimental. The dependency
  is exact-pinned and isolated behind the app-local adapter; it is not promoted
  as a stable Prometheus package API.

Publication authorized: **no**.
