---
title: Flutter/Riverpod scenario tour
sidebar_position: 2
---

# Flutter/Riverpod scenario tour

The Flutter application projects one graph through generated Riverpod
providers, demonstrates optimistic and offline-aware CRUD, relationships,
realtime invalidation, policy-gated A2UI 1.0-RC input over GenUI 0.10.2,
responsive layouts, and an optional FFI transport. Flutter 3.44.8 generation,
analysis, 70 package tests, 25
showcase tests, and three deterministic phone/tablet goldens are recorded. The
shared application smoke flow also passed on an Android API 35 emulator and an
iOS 26.5 simulator. Physical devices, signing, and app-store delivery remain
outside this evidence boundary.

A separate assembled debugger flow now launches the configured Flutter app,
connects from outside the isolate over Dart VM-service WebSocket JSON-RPC, and
exercises two repository-source DevTools controllers through real Riverpod
views. It passed with 28 lifecycle, mutation, view, and time-travel events plus
redaction, payload-bound, preview-conflict, rewind/live, history-clear, and
teardown assertions. That controller evidence does not make the pending
Flutter DevTools extension UI complete and is not present in pub.dev `3.0.1`.

The reusable library is public as
[`entity_graph_flutter@3.0.1`](https://pub.dev/packages/entity_graph_flutter).
That registry publication is separate from the example's platform evidence.
