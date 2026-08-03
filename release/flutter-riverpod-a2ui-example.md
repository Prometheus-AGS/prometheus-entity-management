# Flutter, Riverpod, and A2UI showcase

The `v3-flutter-riverpod-a2ui-example` change owns the Prometheus-branded
application at `examples/flutter-riverpod`. It demonstrates the canonical
`entity_graph_flutter` package in a complete phone/tablet UI while keeping
experimental GenUI protocol handling behind an application-local boundary.

The showcase is currently **partial** release evidence. Host analysis, 25
tests, and three deterministic goldens pass. Flutter 3.44.8 stable resolution
and Android/iOS integration execution remain required before the showcase can
be marked implemented.

## Runtime architecture

```text
Widget
  -> generated Riverpod provider/controller
    -> application showcase controller
      -> EntityGraph
        -> DemoRepository / EntityTransport
          -> deterministic service, realtime callback, or optional FFI bridge

Untrusted A2UI JSONL
  -> atomic envelope preflight
    -> official GenUI processor and safe component catalog
      -> exact action schema
        -> tenant policy and human approval
          -> generated CRUD controller
            -> EntityGraph
```

The app creates one `EntityGraph` in `main.dart` and supplies it through
`entityGraphProvider`. Widgets watch generated Riverpod providers and submit
intent through controllers. Canonical rows, patches, sync metadata, and list
IDs remain graph-owned; transports own external I/O. The optional
`FfiEntityTransportAdapter` forwards calls and never owns a second graph.

## Demonstrated scenarios

| Scenario | Host evidence | Remaining certification |
| --- | --- | --- |
| Normalized list/detail identity | Controller and widget tests | Stable-SDK/device execution |
| Optimistic create/update/delete | Generated CRUD/mutation controller tests | Android/iOS smoke |
| Exact rollback | Deterministic rejected-write test | Android/iOS smoke |
| Relationship invalidation | Old/new project list and entity invalidation test | Device execution |
| Local/remote/hybrid views | Controller and rendered workspace tests | Stable-SDK reconciliation |
| Realtime projection | Typed callback change test | Native runtime receipt |
| Offline queue/reconnect | In-memory queued-write convergence test | Durable persistence is not claimed |
| Policy-gated A2UI | Official renderer, malformed/unknown/denied/approved tests | Device rendering |
| Responsive and accessible UI | Phone/tablet widgets, semantic lifecycle assertions | Platform accessibility receipt |
| Optional native transport | Typed FFI bridge test | No bundled Rust runtime is claimed |

## A2UI trust boundary

The shared semantic contract names A2UI 0.9.1. `genui` 0.10.1 consumes the
official `v0.9` wire identifier, so the app adapts only that version label at
one named boundary. It preserves the shared tenant, surface, entity IDs, and
action outcomes without claiming byte-identical React/Flutter protocol output.

Before GenUI receives any frame, the complete JSONL batch is checked for:

- the expected version, catalog, and `surface-task-sync` identity;
- exactly one message per envelope and one complete surface;
- unique component IDs and a root component;
- the allowlisted Card, Column, Row, Text, Button, and Divider catalog;
- event-only actions from `task.update`, `task.archive`, and `task.delete`;
- rejection of client functions, unknown components, and undeclared actions.

Application policy then verifies tenant and task scope. Update is allowed,
archive requires trusted human approval, and delete is denied for the
deterministic fixture. Agent-supplied context cannot authorize itself.

## Run the current host boundary

From `examples/flutter-riverpod`:

```bash
flutter pub get
dart analyze --fatal-infos --fatal-warnings
flutter test test
flutter run
```

Focused visual verification:

```bash
flutter test test/showcase_golden_test.dart
```

The host suite contains 25 tests. The retained phone entity, tablet entity,
and phone A2UI goldens and their SHA-256 values are recorded in
`.kbd-orchestrator/phases/full-3.0-release/evidence/v3-flutter-riverpod-a2ui-example/task-3-tests.md`.

## Platform lane

`.github/workflows/flutter-example-platform.yml` defines a Flutter 3.44.8
stable Android API 35 emulator lane and an available-iPhone simulator lane.
Both invoke `integration_test/mobile_smoke_test.dart`. The workflow definition
has passed `actionlint`, but neither platform lane has executed for this change
yet. Its presence is not a device receipt.

## Evidence and publication boundary

This application adds no public Dart declaration and no npm export. The
checked-in Dart declaration ledger therefore remains unchanged at 81 entries.
The example is `publish_to: none`; it does not authorize pub.dev, npm, or
stable 3.0.0 publication.

Current evidence does not prove:

- frozen resolution or all tests under Flutter 3.44.8 stable;
- Android or iOS runtime, rendering, accessibility, or physical-device behavior;
- durable offline persistence—the deterministic example queue is in memory;
- a bundled Rust runtime or `flutter_rust_bridge` dependency;
- pub.dev ownership, immutable release-wide certification, or registry promotion.

Those claims remain owned by the clean/platform gate and later release
certification tasks.
