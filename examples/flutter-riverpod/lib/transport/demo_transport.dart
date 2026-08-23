/// App-owned deterministic demo transport.
///
/// The transport is the only I/O boundary in the example: it keeps an
/// in-memory "server", honors the transport-agnostic [ListQuery], supports
/// realtime subscriptions for the change bridge, and exposes scripted failure
/// and coalesced-burst hooks so tests can prove rollback and realtime
/// semantics without network access.
library;

import 'dart:async';

import 'package:entity_graph_flutter/entity_graph_flutter.dart';

/// Coalesces queued realtime events by entity identity before one flush.
///
/// This mirrors the JavaScript realtime manager's 16 ms window at the demo
/// source: N queued events collapse to one event per entity, so the graph
/// receives each entity's final state exactly once per flush.
class CoalescedChangeBuffer<T extends Object> {
  final Map<String, ChangeEvent<T>> _pending = {};

  /// Total events queued since the last flush (before coalescing).
  var queuedSinceFlush = 0;

  void queue(ChangeEvent<T> event) {
    queuedSinceFlush += 1;
    _pending[event.id] = event;
  }

  /// Returns one event per entity id and resets the buffer.
  List<ChangeEvent<T>> flush() {
    final events = List<ChangeEvent<T>>.unmodifiable(_pending.values);
    _pending.clear();
    return events;
  }
}

/// In-memory [EntityTransport] with deterministic latency and failure hooks.
class DemoEntityTransport<T extends Object> extends EntityTransport<T> {
  DemoEntityTransport({
    required List<T> seed,
    required this.identifyRow,
    required this.encodeRow,
    required this.decodeRow,
  }) {
    for (final row in seed) {
      _store[identifyRow(row)] = encodeRow(row);
    }
  }

  /// Stable id derivation for a row.
  final String Function(T row) identifyRow;

  /// Row normalization into canonical graph fields.
  final Map<String, Object?> Function(T row) encodeRow;

  /// Canonical row decoding into the transport model.
  final T Function(Map<String, Object?> row) decodeRow;
  final Map<String, Map<String, Object?>> _store = {};
  final StreamController<ChangeEvent<T>> _changes =
      StreamController<ChangeEvent<T>>.broadcast();
  final CoalescedChangeBuffer<T> realtimeBuffer = CoalescedChangeBuffer<T>();

  /// When true, the next [update] call fails with a transient error so the
  /// optimistic rollback path is exercised deterministically.
  var failNextUpdate = false;

  /// When true, every [list] call fails with a transient error so the error
  /// state lane is exercised deterministically.
  var failList = false;

  @override
  bool get authoritative => false;

  @override
  Duration? get staleTime => const Duration(seconds: 30);

  @override
  String identify(T row) => identifyRow(row);

  @override
  Map<String, Object?> toGraph(T row) => encodeRow(row);

  @override
  Future<ListResult<T>> list(ListQuery query) async {
    if (failList) {
      throw TransientError('demo transport injected list failure');
    }
    var rows = _store.values.map(decodeRow).toList();
    for (final clause in query.filter ?? const <FilterClause>[]) {
      rows = rows.where((row) => _matches(encodeRow(row), clause)).toList();
    }
    final sorts = query.sort ?? const <SortClause>[];
    if (sorts.isNotEmpty) {
      rows.sort((left, right) {
        for (final sort in sorts) {
          final a = '${encodeRow(left)[sort.field] ?? ''}';
          final b = '${encodeRow(right)[sort.field] ?? ''}';
          final order = a.compareTo(b);
          if (order != 0) {
            return sort.direction == SortDirection.asc ? order : -order;
          }
        }
        return 0;
      });
    }
    final limit = query.limit;
    if (limit != null && rows.length > limit) {
      rows = rows.sublist(0, limit);
    }
    return ListResult(rows: rows, total: rows.length);
  }

  @override
  Future<T?> get(String id) async {
    final row = _store[id];
    return row == null ? null : decodeRow(row);
  }

  @override
  Future<T> create(Map<String, Object?> data) async {
    final id = data['id']! as String;
    _store[id] = Map<String, Object?>.from(data);
    return decodeRow(_store[id]!);
  }

  @override
  Future<T> update(String id, Map<String, Object?> patch) async {
    if (failNextUpdate) {
      failNextUpdate = false;
      throw TransientError('demo transport injected update failure for $id');
    }
    final current = _store[id];
    if (current == null) {
      throw TerminalError('demo transport has no row $id', statusCode: 404);
    }
    _store[id] = {...current, ...patch};
    return decodeRow(_store[id]!);
  }

  @override
  Future<void> delete(String id) async {
    if (_store.remove(id) == null) {
      throw TerminalError('demo transport has no row $id', statusCode: 404);
    }
  }

  @override
  StreamSubscription<ChangeEvent<T>>? subscribe(
    void Function(ChangeEvent<T> event) onChange,
  ) => _changes.stream.listen(onChange);

  /// Queues a realtime burst and flushes it once, coalesced by entity id.
  ///
  /// Returns the coalesced events that were emitted so tests can assert the
  /// queued→coalesced collapse without touching the graph themselves.
  List<ChangeEvent<T>> simulateRealtimeBurst(List<ChangeEvent<T>> events) {
    for (final event in events) {
      realtimeBuffer.queue(event);
    }
    final flushed = realtimeBuffer.flush();
    for (final event in flushed) {
      final row = event.row;
      if (row != null && event.op != ChangeOp.delete) {
        _store[event.id] = encodeRow(row);
      } else if (event.op == ChangeOp.delete) {
        _store.remove(event.id);
      }
      _changes.add(event);
    }
    return flushed;
  }

  bool _matches(Map<String, Object?> row, FilterClause clause) {
    final value = row[clause.field];
    final expected = clause.value;
    return switch (clause.op) {
      FilterOperator.eq => value == expected,
      FilterOperator.neq => value != expected,
      FilterOperator.contains =>
        value is String && expected is String && value.contains(expected),
      FilterOperator.startsWith =>
        value is String && expected is String && value.startsWith(expected),
      FilterOperator.inList => expected is List && expected.contains(value),
      FilterOperator.isNull => value == null,
      FilterOperator.isNotNull => value != null,
      _ => true,
    };
  }
}
