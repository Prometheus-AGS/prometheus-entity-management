/// Transport registry — mirrors entity-graph-core's transport/registry.ts
/// and transport/types.ts.
///
/// Register ONE transport per entity type at app boot:
///
/// ```dart
/// EntityTransportRegistry.instance.register(
///   'Invoice',
///   RestEntityTransport<Invoice>(
///     identify: (row) => row.id,
///     list: (query) async { ... },
///   ),
/// );
/// ```
library;

import 'dart:async';

import 'errors.dart';

// ─── Query / result types ───────────────────────────────────────────────────

/// Filter operator — mirrors FilterOperator in view/types.ts.
enum FilterOperator {
  eq,
  neq,
  gt,
  gte,
  lt,
  lte,
  contains,
  startsWith,
  endsWith,
  isNull,
  isNotNull,
  inList,
  nin,
}

/// Atomic filter clause.
class FilterClause {
  const FilterClause({
    required this.field,
    required this.op,
    this.value,
  });

  final String field;
  final FilterOperator op;
  final Object? value;

  Map<String, Object?> toJson() => {
        'field': field,
        'op': op.name,
        if (value != null) 'value': value,
      };
}

/// Sort direction.
enum SortDirection { asc, desc }

/// Single sort key.
class SortClause {
  const SortClause({required this.field, this.direction = SortDirection.asc});

  final String field;
  final SortDirection direction;

  Map<String, Object?> toJson() => {
        'field': field,
        'direction': direction.name,
      };
}

/// Transport-agnostic list query — mirrors ListQuery in transport/types.ts.
class ListQuery {
  const ListQuery({
    this.filter,
    this.sort,
    this.search,
    this.limit,
    this.cursor,
  });

  final List<FilterClause>? filter;
  final List<SortClause>? sort;
  final String? search;
  final int? limit;
  final String? cursor;
}

/// Page of results returned by [EntityTransport.list].
class ListResult<T> {
  const ListResult({
    required this.rows,
    this.total,
    this.nextCursor,
  });

  final List<T> rows;

  /// `null` when the backend doesn't report total cheaply.
  final int? total;
  final String? nextCursor;
}

/// Change operation for realtime events.
enum ChangeOp { insert, update, delete }

/// Realtime change event — mirrors ChangeEvent in transport/types.ts.
class ChangeEvent<T> {
  const ChangeEvent({
    required this.op,
    required this.id,
    this.row,
  });

  final ChangeOp op;
  final String id;
  final T? row;
}

// ─── Transport contract ─────────────────────────────────────────────────────

/// Per-entity transport contract — mirrors EntityTransport<T> in
/// transport/types.ts.
///
/// Register one per entity type via [EntityTransportRegistry].
/// Override [get] and [subscribe] for single-entity fetches and realtime.
abstract class EntityTransport<T extends Object> {
  const EntityTransport();

  /// Derive the stable string id of a row.
  String identify(T row);

  /// `true` when the local cache is authoritative (local-first sync tier).
  bool get authoritative;

  /// Stale-while-revalidate window. `null` → use the engine default (30 s).
  Duration? get staleTime;

  /// Fetch a list of rows.
  Future<ListResult<T>> list(ListQuery query);

  /// Fetch a single row by id.
  /// Default implementation throws [UnimplementedError].
  Future<T?> get(String id) {
    throw UnimplementedError('EntityTransport.get not implemented for $runtimeType');
  }

  /// Subscribe to realtime change events. Returns a [StreamSubscription] or
  /// `null` if this transport has no realtime support.
  StreamSubscription<ChangeEvent<T>>? subscribe(
    void Function(ChangeEvent<T> event) onChange,
  ) =>
      null;
}

// ─── Registry ───────────────────────────────────────────────────────────────

/// Process-global registry of [EntityTransport] instances keyed by entity type.
///
/// Mirrors transport/registry.ts from entity-graph-core.
/// Register at app boot, once per entity type.
class EntityTransportRegistry {
  EntityTransportRegistry._();

  static final EntityTransportRegistry instance = EntityTransportRegistry._();

  final Map<String, EntityTransport<Object>> _transports = {};

  /// Register the transport for [type].
  /// Re-registering silently replaces the prior entry (useful in tests).
  void register<T extends Object>(
    String type,
    EntityTransport<T> transport,
  ) {
    _transports[type] = transport as EntityTransport<Object>;
  }

  /// Look up the transport for [type]. Throws [TerminalError] if none registered.
  EntityTransport<T> get<T extends Object>(String type) {
    final t = _transports[type];
    if (t == null) {
      throw TerminalError(
        '[entity_graph_flutter] No transport registered for entity type "$type". '
        'Call EntityTransportRegistry.instance.register("$type", ...) at app boot.',
      );
    }
    return t as EntityTransport<T>;
  }

  /// Test helper — clears all registered transports.
  void reset() => _transports.clear();

  /// All currently registered entity type names.
  List<String> get registeredTypes => List.unmodifiable(_transports.keys);
}
