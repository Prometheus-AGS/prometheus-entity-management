# Tasks: v4-dart-sdk

- [ ] Create `packages/dart/prometheus_entity_sync/pubspec.yaml` with `drift`, `web_socket_channel`, `msgpack_dart` dependencies
- [ ] Implement `lib/src/sync_client.dart` — `SyncClient` class with WebSocket lifecycle and `statusStream`
- [ ] Implement `lib/src/codec.dart` — MessagePack encode/decode for PSyncV1 messages matching Rust codec byte layout
- [ ] Implement `lib/src/reconnect.dart` — exponential backoff (1s → 30s, ±20% jitter) with `dart:async` Timer
- [ ] Implement `lib/src/operation_queue.dart` — `drift` table `_operation_queue` for offline write buffering
- [ ] Implement `lib/src/delta_applier.dart` — apply `Delta` ops as `drift` batch transactions to local database
- [ ] Create `lib/src/sync_status_widget.dart` — `StatelessWidget` wrapping `StreamBuilder` on `statusStream`
- [ ] Create `example/` — Flutter app demonstrating entity list with live `drift` query + offline edit
- [ ] Write `test/sync_client_test.dart` — unit tests using `MockWebSocketChannel` from `web_socket_channel/testing.dart`
- [ ] Write `test/reconnect_test.dart` — reconnect backoff timing tests using `fake_async`
- [ ] Write `test/operation_queue_test.dart` — offline queue → reconnect → drain integration test
- [ ] Write `test/delta_applier_test.dart` — apply upsert/delete/crdt_patch ops to in-memory `drift` database
- [ ] Run `dart analyze` — zero errors/warnings
- [ ] Run `flutter test` — all tests green
- [ ] Integration test on iOS simulator: INSERT while offline → reconnect → server sees INSERT
- [ ] Integration test on Android emulator: same offline-reconnect flow
- [ ] Verify `pubspec.yaml` meets `dart pub publish` requirements (description, homepage, topics)
