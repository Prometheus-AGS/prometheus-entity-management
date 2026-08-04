# Flutter, Riverpod, and A2UI showcase

The `v3-flutter-riverpod-a2ui-example` change owns the Prometheus-branded
application at `examples/flutter-riverpod`. It demonstrates the canonical
`entity_graph_flutter` package in a complete phone/tablet UI while keeping
experimental GenUI protocol handling behind an application-local boundary.

The showcase is **implemented** release evidence. Flutter 3.44.8 stable passes
generation, formatting, analysis, 70 package tests, 25 showcase tests, and
three deterministic goldens. The shared application smoke flow also passes on
an iOS 26.5 simulator and clean Android API 35 emulator.

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

| Scenario | Certified evidence | Explicit limit |
| --- | --- | --- |
| Normalized list/detail identity | Stable controller/widget tests plus both platform smoke lanes | Physical devices are not certified |
| Optimistic create/update/delete | Generated CRUD/mutation tests plus both platform smoke lanes | Hosted backends are not exercised |
| Exact rollback | Deterministic rejected-write test | Demo transport only |
| Relationship invalidation | Old/new project list and entity invalidation test | Hosted realtime is not exercised |
| Local/remote/hybrid views | Stable controller and rendered workspace tests | Deterministic fixtures only |
| Realtime projection | Typed callback change test | No hosted native runtime claim |
| Offline queue/reconnect | In-memory queued-write convergence test | Durable persistence is not claimed |
| Policy-gated A2UI | Official renderer, malformed/unknown/denied/approved tests plus device smoke | GenUI remains exact-pinned and experimental |
| Responsive and accessible UI | Stable phone/tablet goldens and semantic lifecycle assertions | Native assistive-technology certification is not claimed |
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

## Run the certified host boundary

From the repository root with Flutter 3.44.8 stable:

```bash
pnpm run dart:bootstrap:frozen
pnpm run dart:ci
```

Focused visual verification:

```bash
flutter test test/showcase_golden_test.dart
```

The showcase suite contains 25 tests. The retained phone entity, tablet
entity, and phone A2UI goldens and the stable host/platform receipts are
recorded under
`.kbd-orchestrator/phases/full-3.0-release/evidence/v3-flutter-riverpod-a2ui-example/`.

## Platform lane

`.github/workflows/flutter-example-platform.yml` defines a Flutter 3.44.8
stable Android API 35 emulator lane and an available-iPhone simulator lane.
Both invoke `integration_test/mobile_smoke_test.dart`. Task 5 executed that
same flow locally on an iPhone 17/iOS 26.5 simulator and a clean Android API 35
AOSP ATD arm64 emulator; both built, installed, rendered, rejected the hostile
A2UI fixture, and passed 1/1. The checked-in workflow remains the repeatable CI
surface rather than evidence that a separate hosted run occurred.

## Evidence and publication boundary

This application adds no public Dart declaration and no npm export. The
checked-in Dart declaration ledger therefore remains unchanged at 81 entries.
The example is `publish_to: none`; it does not authorize pub.dev, npm, or
stable 3.0.0 publication.

Current evidence does not prove:

- physical-device behavior or native assistive-technology certification;
- durable offline persistence—the deterministic example queue is in memory;
- a bundled Rust runtime or `flutter_rust_bridge` dependency;
- pub.dev ownership, immutable release-wide certification, or registry promotion.

Those claims remain owned by later release-certification and publication tasks.
