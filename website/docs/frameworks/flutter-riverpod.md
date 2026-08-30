---
title: Flutter + Riverpod 3
sidebar_position: 2
---

# Flutter and Riverpod 3

`entity_graph_flutter` owns the canonical Dart graph. Generated Riverpod
families project entities and lists without copying entity data into widgets.
The package covers local/remote/hybrid views, optimistic rollback, realtime
invalidation, transports, an optional FFI seam, and cross-view widget goldens.

Install the public `3.1.0` package from pub.dev:

```bash
flutter pub add entity_graph_flutter:^3.1.0
```

The published archive passed a clean consumer import and analyzer check. pub.dev
does not yet associate the package with a verified publisher, so publisher
assignment remains an operational follow-up rather than an installation block.
The companion showcase accepts strict A2UI 1.0-RC surface envelopes and
normalizes them to GenUI 0.10.2 only after application-owned policy validation.
Start with `packages/entity_graph_flutter/README.md` and the
[Flutter example evidence](../examples/flutter-riverpod.md).

## Optional DevTools

Version `3.1.0` includes a separate, optional
`package:entity_graph_flutter/devtools.dart` library with a reference-counted
controller per graph and a store-explicit Dart VM-service bridge. It observes
real graph publications and Riverpod logical views, projects canonical/patch/
merged dirty state and relationships, retains bounded history/snapshots,
supports conflict-safe preview/restore, and provides rewind/return-live.

The controller and official Flutter DevTools companion are included in the
published package. Values remain metadata-only unless the host
explicitly supplies inclusion and redaction policy. Treat the VM-service URI as
a debugger secret and attach only from a host-controlled development mode.

The complete controller gate is:

```bash
pnpm run verify:devtools-flutter-controller
```

It passed through two external VM-service clients on a configured iOS simulator
with two isolated graphs and 46 versioned events in the frozen-candidate run. The official Flutter DevTools
extension build and package layout are validated separately.
