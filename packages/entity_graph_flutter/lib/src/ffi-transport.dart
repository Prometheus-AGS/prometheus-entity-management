// Repository source names use kebab-case by policy.
// ignore_for_file: file_names

/// Optional Rust/FFI transport seam.
///
/// This file intentionally imports no generated FFI package. Applications may
/// implement [FfiEntityBridge] with flutter_rust_bridge, dart:ffi, a Tauri
/// plugin, or a test double. The Dart graph remains the canonical state owner.
library;

import 'dart:async';

import 'transport.dart';

/// Host-owned bridge implemented by optional native integration packages.
abstract interface class FfiEntityBridge<T extends Object> {
  String identify(T row);

  Map<String, Object?> toGraph(T row);

  Future<ListResult<T>> list(ListQuery query);

  Future<T?> get(String id);

  Future<T> create(Map<String, Object?> data);

  Future<T> update(String id, Map<String, Object?> patch);

  Future<void> delete(String id);

  /// Native change feed, or `null` when the bridge has no realtime support.
  Stream<ChangeEvent<T>>? changes();
}

/// Adapts an optional native bridge to the transport-neutral package contract.
final class FfiEntityTransportAdapter<T extends Object>
    extends EntityTransport<T> {
  const FfiEntityTransportAdapter({
    required this.bridge,
    this.authoritative = false,
    this.staleTime,
  });

  final FfiEntityBridge<T> bridge;

  @override
  final bool authoritative;

  @override
  final Duration? staleTime;

  @override
  String identify(T row) => bridge.identify(row);

  @override
  Map<String, Object?> toGraph(T row) => bridge.toGraph(row);

  @override
  Future<ListResult<T>> list(ListQuery query) => bridge.list(query);

  @override
  Future<T?> get(String id) => bridge.get(id);

  @override
  Future<T> create(Map<String, Object?> data) => bridge.create(data);

  @override
  Future<T> update(String id, Map<String, Object?> patch) =>
      bridge.update(id, patch);

  @override
  Future<void> delete(String id) => bridge.delete(id);

  @override
  StreamSubscription<ChangeEvent<T>>? subscribe(
    void Function(ChangeEvent<T> event) onChange,
  ) => bridge.changes()?.listen(onChange);
}
