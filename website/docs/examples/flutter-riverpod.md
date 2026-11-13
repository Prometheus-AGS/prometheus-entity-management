---
title: Flutter/Riverpod scenario tour
sidebar_position: 2
---

# Flutter/Riverpod scenario tour

The Flutter application projects one graph through generated Riverpod
providers, demonstrates optimistic and offline-aware CRUD, relationships,
realtime invalidation, policy-gated A2UI 1.0 rendering through `a2ui_flutter` 0.3.0,
responsive layouts, and an optional FFI transport. The A2UI 1.0 acceptance gate
is `pnpm run verify:flutter-a2ui-v1 -- --report <file>`: it checks the
`a2ui_flutter` 0.3.0 and `a2ui_core` 0.7.0 pins and runs the integration test on a
booted iOS simulator, including a denied action, an allowed action and a refused
unknown-component batch. The 3.0 test counts, goldens and Android emulator
receipts predate the A2UI 1.0 migration and are not re-certified by that gate.
Physical devices, signing, and app-store delivery remain outside this evidence
boundary.

A separate assembled debugger flow now launches the configured Flutter app,
connects from outside the isolate over Dart VM-service WebSocket JSON-RPC, and
exercises two published DevTools controllers through real Riverpod views. It
passed with 46 lifecycle, mutation, view, time-travel, and multi-client import
events plus redaction, payload-bound, preview-conflict, rewind/live,
history-retention, and teardown assertions. The official Flutter DevTools
extension build and package layout are validated separately.

The reusable library is public as
[`entity_graph_flutter@3.1.0`](https://pub.dev/packages/entity_graph_flutter).
That registry publication is separate from the example's platform evidence.
