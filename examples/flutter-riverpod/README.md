# Prometheus Flutter entity-graph showcase

This phone/tablet application demonstrates `entity_graph_flutter`, generated
Riverpod 3 providers, normalized CRUD and relationships, local-first queueing,
realtime changes, an optional FFI transport, and policy-gated official GenUI
surfaces in one Prometheus-branded example.

The example is **implemented 3.0 showcase evidence**: Flutter 3.44.8 stable
passes generation, formatting, analysis, 70 package tests, 25 showcase tests,
and three deterministic goldens. The shared integration flow also passes on an
iOS 26.5 simulator and Android API 35 emulator. This does not authorize
publication or certify physical devices.

## Architecture

```text
Widget -> generated Riverpod provider/controller -> ShowcaseController
  -> EntityGraph -> DemoRepository / EntityTransport

Untrusted A2UI JSONL -> atomic preflight -> official GenUI renderer
  -> action policy -> human approval -> CRUD controller -> EntityGraph
```

`main.dart` creates one graph and overrides `entityGraphProvider`. Lists retain
IDs, list/detail UI rejoins canonical rows, provider controllers orchestrate,
and transports own I/O. Widgets never call the graph or repository directly.

## Explore the app

The Entity graph tab demonstrates:

- normalized list/detail identity;
- local, remote, and hybrid completeness;
- create, rename, delete, deterministic rollback, and relationship moves;
- offline queued writes and reconnect convergence;
- realtime task/project projection; and
- loading, error, empty, busy, and accessible status states.

The A2UI agent tab renders a deterministic `surface-task-sync` fixture through
`genui` 0.10.1. Only Card, Column, Row, Text, Button, and Divider are admitted.
Task update is allowed, archive requires human approval, delete is denied, and
malformed, hostile, or undeclared input fails before live surface mutation.

## Run

```bash
flutter pub get
dart analyze --fatal-infos --fatal-warnings
flutter test test
flutter run
```

Focused visual test:

```bash
flutter test test/showcase_golden_test.dart
```

The shared Android/iOS smoke flow is
`integration_test/mobile_smoke_test.dart`; platform execution is defined in
`.github/workflows/flutter-example-platform.yml`. Its task-5 receipt records
the passing local iOS simulator and Android emulator executions; the workflow
file alone is not treated as a hosted-run receipt.

## Evidence boundary

- The app is `publish_to: none` and adds no public Dart declaration.
- The deterministic offline queue is in memory; durable persistence is not
  claimed.
- Physical-device and native assistive-technology certification are not
  claimed.
- `FfiEntityTransportAdapter` demonstrates a typed optional boundary; no Rust
  runtime is bundled.
- GenUI remains exact-pinned and experimental rather than a stable public
  Prometheus package surface.

See [the release guide](../../release/flutter-riverpod-a2ui-example.md) for the
scenario matrix, trust boundaries, evidence paths, and remaining limits.
