/// Riverpod 3 providers for the entity graph.
///
/// Exposes [EntityListNotifier] and [EntityNotifier] — both extend
/// [AutoDisposeAsyncNotifier]. Create providers with the standard Riverpod
/// [AsyncNotifierProvider.autoDispose] constructor:
///
/// ```dart
/// final activeInvoicesProvider =
///     AsyncNotifierProvider.autoDispose<EntityListNotifier<Invoice>, EntityListSnapshot<Invoice>>(
///   () => EntityListNotifier(EntityListConfig(
///     type: 'Invoice',
///     queryKey: 'invoices:active',
///     fromGraph: Invoice.fromGraph,
///   )),
/// );
/// ```
///
/// Architecture mirrors the component → hook → store layering:
///   Widget          → watches the provider
///   AsyncNotifier   → orchestrates graph reads + transport fetches
///   EntityGraph     → canonical data store (never modified by widgets)
library;

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'errors.dart';
import 'graph.dart';
import 'transport.dart';

// ─── Graph singleton provider ─────────────────────────────────────────────

/// Provider exposing the singleton [EntityGraph].
/// Override in tests via ProviderContainer overrides.
final entityGraphProvider = Provider<EntityGraph>(
  (ref) => EntityGraph.instance,
  name: 'entityGraph',
);

// ─── Entity list snapshot ─────────────────────────────────────────────────

/// Snapshot returned by [EntityListNotifier].
class EntityListSnapshot<T> {
  const EntityListSnapshot({
    required this.items,
    required this.listState,
    this.error,
  });

  final List<T> items;
  final ListState listState;
  final EntityGraphError? error;

  bool get isLoading => listState.isFetching;
  bool get isFetchingMore => listState.isFetchingMore;
  bool get hasError => error != null;
  int? get total => listState.total;
  bool get hasNextPage => listState.hasNextPage;
}

// ─── EntityListNotifier ───────────────────────────────────────────────────

/// Configuration for an entity list notifier.
class EntityListConfig<T extends Object> {
  const EntityListConfig({
    required this.type,
    required this.queryKey,
    required this.fromGraph,
    this.query = const ListQuery(),
    this.enabled = true,
  });

  final String type;
  final String queryKey;

  /// Map a raw graph row [Map<String, Object?>] to a typed model [T].
  final T Function(Map<String, Object?> row) fromGraph;

  final ListQuery query;
  final bool enabled;
}

/// Riverpod AsyncNotifier that mirrors useEntities / useEntityQuery hooks.
///
/// Create a provider using [AsyncNotifierProvider.autoDispose]:
/// ```dart
/// final myProvider = AsyncNotifierProvider.autoDispose<
///     EntityListNotifier<Invoice>, EntityListSnapshot<Invoice>>(
///   () => EntityListNotifier(EntityListConfig(...)),
/// );
/// ```
///
/// Features:
/// - Fetches the first page on build when [EntityListConfig.enabled].
/// - Subscribes to [EntityGraph.changes] for reactive cross-view updates.
/// - Exposes [fetchNextPage] for cursor-based pagination.
/// - Exposes [refetch] for explicit refresh.
class EntityListNotifier<T extends Object>
    extends AutoDisposeAsyncNotifier<EntityListSnapshot<T>> {
  EntityListNotifier(this._config);

  final EntityListConfig<T> _config;
  StreamSubscription<GraphChange>? _graphSub;

  @override
  Future<EntityListSnapshot<T>> build() async {
    final graph = ref.read(entityGraphProvider);

    _graphSub?.cancel();
    _graphSub = graph.changes.listen(_onGraphChange);
    ref.onDispose(() => _graphSub?.cancel());

    if (!_config.enabled) {
      return _buildSnapshot(graph);
    }

    await _doFetch(graph);
    return _buildSnapshot(graph);
  }

  void _onGraphChange(GraphChange change) {
    if (change is EntityChanged && change.type == _config.type) {
      _refreshFromGraph();
    } else if (change is ListChanged && change.queryKey == _config.queryKey) {
      _refreshFromGraph();
    }
  }

  void _refreshFromGraph() {
    final graph = ref.read(entityGraphProvider);
    state = AsyncValue.data(_buildSnapshot(graph));
  }

  EntityListSnapshot<T> _buildSnapshot(EntityGraph graph) {
    final ls = graph.listState(_config.queryKey);
    final items = ls.ids
        .map((id) => graph.readEntity(_config.type, id))
        .whereType<Map<String, Object?>>()
        .map(_config.fromGraph)
        .toList(growable: false);

    final errorStr = ls.error;
    final error = errorStr != null ? TransientError(errorStr) : null;

    return EntityListSnapshot(items: items, listState: ls, error: error);
  }

  Future<void> _doFetch(EntityGraph graph, {String? cursor}) async {
    final isFetchingMore = cursor != null;
    if (isFetchingMore) {
      graph.setListFetchingMore(_config.queryKey, fetchingMore: true);
    } else {
      graph.setListFetching(_config.queryKey, fetching: true);
    }

    try {
      final transport = EntityTransportRegistry.instance.get<T>(_config.type);
      final query = ListQuery(
        filter: _config.query.filter,
        sort: _config.query.sort,
        search: _config.query.search,
        limit: _config.query.limit,
        cursor: cursor ?? _config.query.cursor,
      );
      final result = await transport.list(query);

      final entries = result.rows
          .map((row) => (id: transport.identify(row), data: _rowToMap(row)))
          .toList();
      graph.upsertEntities(_config.type, entries);

      final ids = result.rows.map(transport.identify).toList();
      if (isFetchingMore) {
        graph.appendListResult(
          _config.queryKey,
          ids,
          total: result.total,
          nextCursor: result.nextCursor,
          hasNextPage: result.nextCursor != null,
        );
      } else {
        graph.setListResult(
          _config.queryKey,
          ids,
          total: result.total,
          nextCursor: result.nextCursor,
          hasNextPage: result.nextCursor != null,
        );
      }
    } on TerminalError {
      rethrow;
    } on EntityGraphError catch (e) {
      graph.setListError(_config.queryKey, e.message);
    } on Object catch (e) {
      final typed = toEntityGraphError(e);
      graph.setListError(_config.queryKey, typed.message);
    }
  }

  /// Explicitly refetch the first page.
  Future<void> refetch() async {
    state = const AsyncValue.loading();
    final graph = ref.read(entityGraphProvider);
    await _doFetch(graph);
    state = AsyncValue.data(_buildSnapshot(graph));
  }

  /// Load the next page (cursor-based pagination).
  Future<void> fetchNextPage() async {
    final graph = ref.read(entityGraphProvider);
    final ls = graph.listState(_config.queryKey);
    if (!ls.hasNextPage || ls.nextCursor == null) return;
    await _doFetch(graph, cursor: ls.nextCursor);
    state = AsyncValue.data(_buildSnapshot(graph));
  }

  Map<String, Object?> _rowToMap(T row) {
    if (row is Map<String, Object?>) return row;
    try {
      // ignore: avoid_dynamic_calls
      final dynamic dyn = row;
      // ignore: avoid_dynamic_calls
      return (dyn.toJson() as Map<String, dynamic>).cast<String, Object?>();
    } on Object catch (_) {
      return {'_raw': row};
    }
  }
}

// ─── EntitySnapshot ───────────────────────────────────────────────────────

/// Snapshot returned by [EntityNotifier].
class EntitySnapshot<T> {
  const EntitySnapshot({
    required this.entity,
    required this.state,
  });

  final T? entity;
  final EntityState state;

  bool get isLoading => state.isFetching;
  bool get hasError => state.error != null;
  String? get errorMessage => state.error;
}

// ─── EntityNotifier ───────────────────────────────────────────────────────

/// Configuration for a single-entity notifier.
class EntityConfig<T extends Object> {
  const EntityConfig({
    required this.type,
    required this.id,
    required this.fromGraph,
    this.enabled = true,
  });

  final String type;
  final String? id;
  final T Function(Map<String, Object?> row) fromGraph;
  final bool enabled;
}

/// Riverpod AsyncNotifier for a single entity — mirrors useEntity hook.
///
/// Create a provider using [AsyncNotifierProvider.autoDispose]:
/// ```dart
/// final myProvider = AsyncNotifierProvider.autoDispose<
///     EntityNotifier<Invoice>, EntitySnapshot<Invoice>>(
///   () => EntityNotifier(EntityConfig(
///     type: 'Invoice',
///     id: invoiceId,
///     fromGraph: Invoice.fromGraph,
///   )),
/// );
/// ```
class EntityNotifier<T extends Object>
    extends AutoDisposeAsyncNotifier<EntitySnapshot<T>> {
  EntityNotifier(this._config);

  final EntityConfig<T> _config;
  StreamSubscription<GraphChange>? _graphSub;

  @override
  Future<EntitySnapshot<T>> build() async {
    final graph = ref.read(entityGraphProvider);

    _graphSub?.cancel();
    _graphSub = graph.changes.listen(_onGraphChange);
    ref.onDispose(() => _graphSub?.cancel());

    if (!_config.enabled || _config.id == null) {
      return _buildSnapshot(graph);
    }

    await _doFetch(graph);
    return _buildSnapshot(graph);
  }

  void _onGraphChange(GraphChange change) {
    if (change is EntityChanged &&
        change.type == _config.type &&
        (change.id == _config.id || change.id == '*')) {
      _refreshFromGraph();
    }
  }

  void _refreshFromGraph() {
    final graph = ref.read(entityGraphProvider);
    state = AsyncValue.data(_buildSnapshot(graph));
  }

  EntitySnapshot<T> _buildSnapshot(EntityGraph graph) {
    final id = _config.id;
    if (id == null) {
      return EntitySnapshot(entity: null, state: const EntityState());
    }
    final row = graph.readEntity(_config.type, id);
    final es = graph.entityState(_config.type, id);
    final entity = row != null ? _config.fromGraph(row) : null;
    return EntitySnapshot(entity: entity, state: es);
  }

  Future<void> _doFetch(EntityGraph graph) async {
    final id = _config.id;
    if (id == null) return;
    graph.setEntityFetching(_config.type, id, fetching: true);
    try {
      final transport = EntityTransportRegistry.instance.get<T>(_config.type);
      final row = await transport.get(id);
      if (row != null) {
        graph.upsertEntity(_config.type, id, _rowToMap(row));
        graph.setEntityFetched(_config.type, id);
      } else {
        graph.setEntityError(_config.type, id, 'Not found');
      }
    } on EntityGraphError catch (e) {
      graph.setEntityError(_config.type, id, e.message);
    } on Object catch (e) {
      final typed = toEntityGraphError(e);
      graph.setEntityError(_config.type, id, typed.message);
    }
  }

  /// Explicitly refetch the entity.
  Future<void> refetch() async {
    state = const AsyncValue.loading();
    final graph = ref.read(entityGraphProvider);
    await _doFetch(graph);
    state = AsyncValue.data(_buildSnapshot(graph));
  }

  Map<String, Object?> _rowToMap(T row) {
    if (row is Map<String, Object?>) return row;
    try {
      // ignore: avoid_dynamic_calls
      final dynamic dyn = row;
      // ignore: avoid_dynamic_calls
      return (dyn.toJson() as Map<String, dynamic>).cast<String, Object?>();
    } on Object catch (_) {
      return {'_raw': row};
    }
  }
}
