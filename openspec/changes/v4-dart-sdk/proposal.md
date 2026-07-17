# Proposal: v4-dart-sdk — Dart/Flutter sync client SDK

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 6 · Depends on: v4-psync-protocol, v4-pes-server-binary

## Summary

Implement `prometheus_entity_sync` — a pure Dart package (no FFI) providing a bidirectional sync client for Flutter apps. Uses SQLite via `drift` for local persistence and `web_socket_channel` for the PSyncV1 connection.

## Package API

```dart
class SyncClient {
  SyncClient({
    required String serverUrl,
    required Future<String> Function() getToken,
    required GeneratedDatabase db,  // drift database
  });

  Future<void> connect();
  Future<void> subscribeBucket(String bucket, {String? resumeLsn});
  Stream<SyncStatus> get statusStream;
  Future<void> write(String entityType, String entityId, SyncOp op);
  Future<void> disconnect();
}

enum SyncStatus { connecting, syncing, live, error, disconnected }

// Flutter widget integration
class SyncStatusWidget extends StatelessWidget {
  const SyncStatusWidget({required this.client, required this.child});
}
```

## Local persistence

A `drift` database with tables mirroring the synced entity schema. Delta ops are applied as `drift` batch transactions. The `_operation_queue` table buffers outgoing writes when offline.

## Offline handling

On disconnect: queue writes in `_operation_queue`. On reconnect: send `Subscribe` with `resumeLsn` from last confirmed `Ack` to avoid re-receiving the full snapshot.

## Flutter example app

Demonstrates: entity list (live query via `drift`), add/edit offline, sync indicator, reconnect.

## Success criteria

- [ ] Flutter integration test: INSERT while offline → reconnect → server and other clients see INSERT in order
- [ ] `dart analyze` produces zero errors/warnings
- [ ] `flutter test` green
- [ ] `pubspec.yaml` ready for `dart pub publish` to pub.dev
- [ ] Example app runs on iOS simulator and Android emulator
