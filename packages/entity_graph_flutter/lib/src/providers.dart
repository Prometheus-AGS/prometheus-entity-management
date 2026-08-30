/// Riverpod 3 bindings for the canonical Dart entity graph.
///
/// Provider families select and orchestrate [EntityGraph]; they never own a
/// second entity cache. Widgets read providers, providers invoke transports,
/// and every confirmed or optimistic write flows through the graph.
library;

import 'dart:async';

import 'package:riverpod_annotation/riverpod_annotation.dart';

import 'errors.dart';
import 'graph.dart';
import 'transport.dart';
import 'view.dart';

part 'providers.g.dart';

/// Converts a canonical graph row into a feature model.
typedef EntityDecoder<T extends Object> = T Function(Map<String, Object?> row);

/// Converts a transport model into canonical graph fields.
typedef EntityEncoder<T extends Object> = Map<String, Object?> Function(T row);

/// Bounded Riverpod 3 retry policy shared by fetch providers.
///
/// Terminal errors never retry. Transient failures receive at most two retry
/// attempts with exponential backoff, so a provider cannot loop indefinitely.
Duration? entityProviderRetry(int retryCount, Object error) {
  final typed = toEntityGraphError(error);
  if (typed is TerminalError || retryCount >= 2) return null;
  return Duration(milliseconds: 200 * (1 << retryCount));
}

/// Process-wide graph owner. Override with an isolated [EntityGraph] in tests
/// or a deliberately scoped application graph.
@Riverpod(keepAlive: true)
EntityGraph entityGraph(Ref ref) => EntityGraph.instance;

/// Process-wide transport registry. It is injectable without changing the
/// graph's state ownership.
@Riverpod(keepAlive: true)
EntityTransportRegistry entityTransportRegistry(Ref ref) =>
    EntityTransportRegistry.instance;

/// Result of mounting an entity type's optional realtime feed.
class EntityChangeBinding {
  const EntityChangeBinding({required this.isActive});

  final bool isActive;
}

/// Mounts at most one generated-provider instance per entity type and
/// translates transport changes into canonical graph writes/invalidation.
@Riverpod(keepAlive: true, retry: entityProviderRetry)
class EntityChangeBridge<T extends Object> extends _$EntityChangeBridge<T> {
  @override
  EntityChangeBinding build({required String type}) {
    final graph = ref.watch(entityGraphProvider);
    final registry = ref.watch(entityTransportRegistryProvider);
    final transport = registry.get<T>(type);
    final subscription = transport.subscribe((event) {
      switch (event.op) {
        case ChangeOp.insert:
        case ChangeOp.update:
          final row = event.row;
          if (row != null) {
            graph.upsertEntity(type, event.id, transport.toGraph(row));
            graph.setEntityFetched(type, event.id);
          }
          graph.invalidateListsForType(type);
        case ChangeOp.delete:
          graph.removeEntity(type, event.id);
      }
    });
    if (subscription != null) ref.onDispose(subscription.cancel);
    return EntityChangeBinding(isActive: subscription != null);
  }
}

/// Stable list data derived from ID-only graph membership.
class EntityListSnapshot<T extends Object> {
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

/// Compatibility configuration for applications that construct providers in
/// factories. New code normally passes these fields directly to
/// [entityListProvider].
class EntityListConfig<T extends Object> {
  const EntityListConfig({
    required this.type,
    required this.queryKey,
    required this.fromGraph,
    this.toGraph,
    this.query = const ListQuery(),
    this.completeness = ViewCompleteness.remote,
    this.enabled = true,
    this.subscribe = true,
  });

  final String type;
  final String queryKey;
  final EntityDecoder<T> fromGraph;
  final EntityEncoder<T>? toGraph;
  final ListQuery query;
  final ViewCompleteness completeness;
  final bool enabled;
  final bool subscribe;
}

/// Generated Riverpod family for normalized local, remote, and hybrid lists.
@Riverpod(retry: entityProviderRetry)
class EntityList<T extends Object> extends _$EntityList<T> {
  StreamSubscription<GraphChange>? _graphSubscription;
  GraphViewRegistration? _viewRegistration;
  var _disposed = false;
  var _revalidating = false;
  var _ready = false;

  @override
  Future<EntityListSnapshot<T>> build({
    required String type,
    required String queryKey,
    required EntityDecoder<T> fromGraph,
    EntityEncoder<T>? toGraph,
    ListQuery query = const ListQuery(),
    ViewCompleteness completeness = ViewCompleteness.remote,
    bool enabled = true,
    bool subscribe = true,
  }) async {
    _disposed = false;
    _ready = false;
    final graph = ref.watch(entityGraphProvider);
    _viewRegistration?.dispose();
    _viewRegistration = graph.registerView(
      GraphViewDefinition(
        viewId: 'entity-list:${type.length}:$type:$queryKey',
        label: '$type list',
        kind: GraphViewKind.list,
        entityType: type,
        queryKey: queryKey,
      ),
    );
    if (subscribe) {
      ref.watch(entityChangeBridgeProvider<T>(type: type));
    }

    await _graphSubscription?.cancel();
    _graphSubscription = graph.changes.listen(_onGraphChange);
    ref.onDispose(() {
      _disposed = true;
      _viewRegistration?.dispose();
      unawaited(_graphSubscription?.cancel());
    });

    if (!enabled || completeness == ViewCompleteness.local) {
      _ready = true;
      return _buildSnapshot(graph);
    }
    if (completeness == ViewCompleteness.hybrid) {
      _ready = true;
      unawaited(_loadHybrid(graph));
      return _buildSnapshot(graph);
    }

    await _doFetch(graph);
    _ready = true;
    return _buildSnapshot(graph);
  }

  void _onGraphChange(GraphChange change) {
    if (_disposed || !_ready) return;
    if (change is GraphReset ||
        change is EntityChanged && change.type == type ||
        change is EntityRemoved && change.type == type ||
        change is ListChanged && change.queryKey == queryKey) {
      state = AsyncValue.data(_buildSnapshot(ref.read(entityGraphProvider)));
      final list = ref.read(entityGraphProvider).listState(queryKey);
      if (change is ListChanged &&
          list.stale &&
          enabled &&
          completeness != ViewCompleteness.local &&
          !_revalidating) {
        unawaited(_loadHybrid(ref.read(entityGraphProvider)));
      }
    }
  }

  Future<void> _loadHybrid(EntityGraph graph) async {
    if (_revalidating) return;
    _revalidating = true;
    try {
      await _runWithRetry(() => _doFetch(graph));
      if (!_disposed) state = AsyncValue.data(_buildSnapshot(graph));
    } on Object catch (error, stackTrace) {
      if (!_disposed) state = AsyncValue.error(error, stackTrace);
    } finally {
      _revalidating = false;
    }
  }

  EntityListSnapshot<T> _buildSnapshot(EntityGraph graph) {
    final stored = graph.listState(queryKey);
    final useLocal =
        completeness == ViewCompleteness.local ||
        completeness == ViewCompleteness.hybrid &&
            (stored.lastFetched == null || stored.stale);
    final ids = useLocal
        ? evaluateLocalEntityIds(graph, type, query)
        : stored.ids;
    final items = ids
        .map((id) => graph.readEntity(type, id))
        .whereType<Map<String, Object?>>()
        .map(fromGraph)
        .toList(growable: false);
    final effectiveState = useLocal
        ? stored.copyWith(ids: ids, total: ids.length)
        : stored;
    _viewRegistration?.update(
      ids.map((id) => GraphEntityIdentity(type: type, id: id)),
    );
    final error = stored.error == null ? null : TransientError(stored.error!);
    return EntityListSnapshot(
      items: List.unmodifiable(items),
      listState: effectiveState,
      error: error,
    );
  }

  Future<void> _doFetch(EntityGraph graph, {String? cursor}) async {
    final fetchingMore = cursor != null;
    if (fetchingMore) {
      graph.setListFetchingMore(queryKey, fetchingMore: true);
    } else {
      graph.setListFetching(queryKey, fetching: true);
    }

    try {
      final transport = ref.read(entityTransportRegistryProvider).get<T>(type);
      final result = await transport.list(query.copyWith(cursor: cursor));
      final entries = result.rows
          .map(
            (row) => (
              id: transport.identify(row),
              data: entityToGraphRow(row, toGraph ?? transport.toGraph),
            ),
          )
          .toList();
      graph.upsertEntities(type, entries);
      final ids = result.rows.map(transport.identify).toList();
      if (fetchingMore) {
        graph.appendListResult(
          queryKey,
          ids,
          entityType: type,
          total: result.total,
          nextCursor: result.nextCursor,
          hasNextPage: result.nextCursor != null,
        );
      } else {
        graph.setListResult(
          queryKey,
          ids,
          entityType: type,
          total: result.total,
          nextCursor: result.nextCursor,
          hasNextPage: result.nextCursor != null,
        );
      }
    } on Object catch (error) {
      final typed = toEntityGraphError(error);
      graph.setListError(queryKey, typed.message);
      throw typed;
    }
  }

  /// Explicitly revalidate the first page with the bounded retry policy.
  Future<void> refetch() async {
    state = const AsyncValue.loading();
    final graph = ref.read(entityGraphProvider);
    state = await AsyncValue.guard(() async {
      await _runWithRetry(() => _doFetch(graph));
      return _buildSnapshot(graph);
    });
  }

  /// Load the next cursor page and retain normalized ID membership.
  Future<void> fetchNextPage() async {
    final graph = ref.read(entityGraphProvider);
    final list = graph.listState(queryKey);
    if (!list.hasNextPage || list.nextCursor == null) return;
    await _runWithRetry(() => _doFetch(graph, cursor: list.nextCursor));
    if (!_disposed) state = AsyncValue.data(_buildSnapshot(graph));
  }
}

/// Backwards-compatible notifier type name; the generated family is
/// [entityListProvider].
typedef EntityListNotifier<T extends Object> = EntityList<T>;

/// Stable single-entity data derived from the graph.
class EntitySnapshot<T extends Object> {
  const EntitySnapshot({required this.entity, required this.state});

  final T? entity;
  final EntityState state;

  bool get isLoading => state.isFetching;
  bool get hasError => state.error != null;
  String? get errorMessage => state.error;
}

/// Compatibility configuration for provider factories.
class EntityConfig<T extends Object> {
  const EntityConfig({
    required this.type,
    required this.id,
    required this.fromGraph,
    this.toGraph,
    this.enabled = true,
    this.subscribe = true,
  });

  final String type;
  final String? id;
  final EntityDecoder<T> fromGraph;
  final EntityEncoder<T>? toGraph;
  final bool enabled;
  final bool subscribe;
}

/// Generated Riverpod family for a single normalized entity.
@Riverpod(retry: entityProviderRetry)
class Entity<T extends Object> extends _$Entity<T> {
  StreamSubscription<GraphChange>? _graphSubscription;
  GraphViewRegistration? _viewRegistration;
  var _disposed = false;
  var _revalidating = false;
  var _ready = false;

  @override
  Future<EntitySnapshot<T>> build({
    required String type,
    required String? id,
    required EntityDecoder<T> fromGraph,
    EntityEncoder<T>? toGraph,
    bool enabled = true,
    bool subscribe = true,
  }) async {
    _disposed = false;
    _ready = false;
    final graph = ref.watch(entityGraphProvider);
    _viewRegistration?.dispose();
    final entityId = id;
    _viewRegistration = entityId == null
        ? null
        : graph.registerView(
            GraphViewDefinition(
              viewId: 'entity:${type.length}:$type:$entityId',
              label: '$type detail',
              kind: GraphViewKind.entity,
              entityType: type,
            ),
            membership: [GraphEntityIdentity(type: type, id: entityId)],
          );
    if (subscribe) {
      ref.watch(entityChangeBridgeProvider<T>(type: type));
    }

    await _graphSubscription?.cancel();
    _graphSubscription = graph.changes.listen(_onGraphChange);
    ref.onDispose(() {
      _disposed = true;
      _viewRegistration?.dispose();
      unawaited(_graphSubscription?.cancel());
    });

    if (!enabled || id == null) {
      _ready = true;
      return _buildSnapshot(graph);
    }
    await _doFetch(graph);
    _ready = true;
    return _buildSnapshot(graph);
  }

  void _onGraphChange(GraphChange change) {
    if (_disposed || !_ready) return;
    if (change is GraphReset ||
        change is EntityChanged &&
            change.type == type &&
            (change.id == id || change.id == '*') ||
        change is EntityRemoved && change.type == type && change.id == id) {
      state = AsyncValue.data(_buildSnapshot(ref.read(entityGraphProvider)));
      final entityId = id;
      if (entityId != null &&
          enabled &&
          ref.read(entityGraphProvider).entityState(type, entityId).stale &&
          !_revalidating) {
        unawaited(_revalidateInBackground());
      }
    }
  }

  Future<void> _revalidateInBackground() async {
    if (_revalidating || _disposed) return;
    _revalidating = true;
    final graph = ref.read(entityGraphProvider);
    try {
      await _runWithRetry(() => _doFetch(graph));
      if (!_disposed) state = AsyncValue.data(_buildSnapshot(graph));
    } on Object catch (error, stackTrace) {
      if (!_disposed) state = AsyncValue.error(error, stackTrace);
    } finally {
      _revalidating = false;
    }
  }

  EntitySnapshot<T> _buildSnapshot(EntityGraph graph) {
    final entityId = id;
    if (entityId == null) {
      return const EntitySnapshot(entity: null, state: EntityState());
    }
    final row = graph.readEntity(type, entityId);
    _viewRegistration?.update([GraphEntityIdentity(type: type, id: entityId)]);
    return EntitySnapshot(
      entity: row == null ? null : fromGraph(row),
      state: graph.entityState(type, entityId),
    );
  }

  Future<void> _doFetch(EntityGraph graph) async {
    final entityId = id;
    if (entityId == null) return;
    graph.setEntityFetching(type, entityId, fetching: true);
    try {
      final transport = ref.read(entityTransportRegistryProvider).get<T>(type);
      final row = await transport.get(entityId);
      if (row == null) {
        throw TerminalError(
          'Entity $type/$entityId was not found',
          statusCode: 404,
        );
      }
      graph.upsertEntity(
        type,
        entityId,
        entityToGraphRow(row, toGraph ?? transport.toGraph),
      );
      graph.setEntityFetched(type, entityId);
    } on Object catch (error) {
      final typed = toEntityGraphError(error);
      graph.setEntityError(type, entityId, typed.message);
      throw typed;
    }
  }

  /// Explicitly revalidate this entity with bounded transient retries.
  Future<void> refetch() async {
    state = const AsyncValue.loading();
    final graph = ref.read(entityGraphProvider);
    state = await AsyncValue.guard(() async {
      await _runWithRetry(() => _doFetch(graph));
      return _buildSnapshot(graph);
    });
  }
}

/// Backwards-compatible notifier type name; the generated family is
/// [entityProvider].
typedef EntityNotifier<T extends Object> = Entity<T>;

/// Local dirty-path edit state. It is UI orchestration state, not graph data.
class EditBuffer {
  const EditBuffer({
    required this.original,
    this.edits = const {},
    this.isSaving = false,
    this.error,
  });

  final Map<String, Object?> original;
  final Map<String, Object?> edits;
  final bool isSaving;
  final EntityGraphError? error;

  bool get isDirty => edits.isNotEmpty;
  bool get hasError => error != null;
  Set<String> get dirtyPaths => Set.unmodifiable(edits.keys);

  Object? value(String path) =>
      edits.containsKey(path) ? edits[path] : original[path];

  EditBuffer set(String path, Object? value) {
    final next = Map<String, Object?>.from(edits);
    if (original[path] == value) {
      next.remove(path);
    } else {
      next[path] = value;
    }
    return EditBuffer(
      original: original,
      edits: next,
      isSaving: isSaving,
      error: error,
    );
  }

  EditBuffer copyWith({
    Map<String, Object?>? original,
    Map<String, Object?>? edits,
    bool? isSaving,
    EntityGraphError? error,
    bool clearError = false,
  }) => EditBuffer(
    original: original ?? this.original,
    edits: edits ?? this.edits,
    isSaving: isSaving ?? this.isSaving,
    error: clearError ? null : (error ?? this.error),
  );

  EditBuffer revert() => EditBuffer(original: original);

  Map<String, Object?> merged() => {...original, ...edits};
}

/// Generated per-entity CRUD controller with isolated edits and optimistic
/// graph feedback.
@riverpod
class EntityCrud<T extends Object> extends _$EntityCrud<T> {
  StreamSubscription<GraphChange>? _graphSubscription;
  Map<String, Object?> _previousPatchValues = const {};
  Set<String> _previouslyAbsentPatchKeys = const {};
  EntitySyncMetadata? _previousSyncMetadata;
  var _optimisticApplied = false;

  @override
  EditBuffer build({
    required String type,
    required String id,
    EntityEncoder<T>? toGraph,
  }) {
    final graph = ref.watch(entityGraphProvider);
    _graphSubscription = graph.changes.listen((change) {
      if ((change is GraphReset ||
              change is EntityChanged &&
                  change.type == type &&
                  change.id == id) &&
          !state.isDirty &&
          !state.isSaving) {
        state = EditBuffer(original: graph.readEntity(type, id) ?? const {});
      }
    });
    ref.onDispose(() => unawaited(_graphSubscription?.cancel()));
    return EditBuffer(original: graph.readEntity(type, id) ?? const {});
  }

  /// Update a field in the isolated edit buffer.
  void edit(String path, Object? value) {
    state = state.set(path, value);
  }

  /// Discard pending edits and any explicitly applied optimistic patch.
  void revert() {
    _restorePreviousPatch();
    state = state.revert();
  }

  /// Publish the current dirty fields through the graph patch layer.
  void applyOptimistic() {
    if (!state.isDirty || _optimisticApplied) return;
    final graph = ref.read(entityGraphProvider);
    final existing = graph.readEntityPatch(type, id) ?? const {};
    _previousSyncMetadata = graph.syncMetadata(type, id);
    _previousPatchValues = {
      for (final key in state.dirtyPaths)
        if (existing.containsKey(key)) key: existing[key],
    };
    _previouslyAbsentPatchKeys = state.dirtyPaths
        .where((key) => !existing.containsKey(key))
        .toSet();
    graph.patchEntity(type, id, state.edits);
    graph.markEntityOptimistic(type, id);
    _optimisticApplied = true;
  }

  /// Persist dirty fields, replacing optimistic data with server confirmation.
  Future<T?> save() async {
    if (!state.isDirty) return null;
    final before = state;
    applyOptimistic();
    state = state.copyWith(isSaving: true, clearError: true);
    final graph = ref.read(entityGraphProvider);
    try {
      final transport = ref.read(entityTransportRegistryProvider).get<T>(type);
      final row = await transport.update(id, before.edits);
      _removeOptimisticPatch();
      graph.upsertEntity(
        type,
        id,
        entityToGraphRow(row, toGraph ?? transport.toGraph),
      );
      graph.markEntitySynced(type, id);
      graph.invalidateListsForType(type);
      state = EditBuffer(original: graph.readEntity(type, id) ?? const {});
      return row;
    } on Object catch (error) {
      final typed = toEntityGraphError(error);
      _restorePreviousPatch();
      state = before.copyWith(isSaving: false, error: typed);
      throw typed;
    }
  }

  /// Delete optimistically and restore graph/list membership on failure.
  Future<void> deleteEntity() async {
    final graph = ref.read(entityGraphProvider);
    final snapshot = graph.removeEntityOptimistically(type, id);
    state = state.copyWith(isSaving: true, clearError: true);
    try {
      final transport = ref.read(entityTransportRegistryProvider).get<T>(type);
      await transport.delete(id);
      state = const EditBuffer(original: {});
    } on Object catch (error) {
      final typed = toEntityGraphError(error);
      graph.restoreRemovedEntity(snapshot);
      state = state.copyWith(isSaving: false, error: typed);
      throw typed;
    }
  }

  void _removeOptimisticPatch() {
    if (!_optimisticApplied) return;
    final graph = ref.read(entityGraphProvider);
    graph.unpatchEntity(type, id, state.dirtyPaths.toList());
    if (_previousPatchValues.isNotEmpty) {
      graph.patchEntity(type, id, _previousPatchValues);
    }
    _resetOptimisticReceipt();
  }

  void _restorePreviousPatch() {
    if (!_optimisticApplied) return;
    final graph = ref.read(entityGraphProvider);
    graph.unpatchEntity(type, id, _previouslyAbsentPatchKeys.toList());
    if (_previousPatchValues.isNotEmpty) {
      graph.patchEntity(type, id, _previousPatchValues);
    }
    final previousSyncMetadata = _previousSyncMetadata;
    if (previousSyncMetadata != null) {
      graph.setEntitySyncMetadata(type, id, previousSyncMetadata);
    }
    _resetOptimisticReceipt();
  }

  void _resetOptimisticReceipt() {
    _previousPatchValues = const {};
    _previouslyAbsentPatchKeys = const {};
    _previousSyncMetadata = null;
    _optimisticApplied = false;
  }
}

/// State for collection-level create operations.
class EntityMutationState<T extends Object> {
  const EntityMutationState({this.isMutating = false, this.value, this.error});

  final bool isMutating;
  final T? value;
  final EntityGraphError? error;
}

/// Collection-level controller for optimistic creates.
@riverpod
class EntityMutations<T extends Object> extends _$EntityMutations<T> {
  @override
  EntityMutationState<T> build({
    required String type,
    EntityEncoder<T>? toGraph,
  }) => const EntityMutationState();

  /// Create an entity and optionally expose an optimistic placeholder.
  Future<T> create(
    Map<String, Object?> data, {
    String? optimisticId,
    String? queryKey,
    Object position = 'start',
  }) async {
    final graph = ref.read(entityGraphProvider);
    if (optimisticId != null) {
      if (graph.readCanonicalEntity(type, optimisticId) != null) {
        throw TerminalError(
          'Optimistic id $type/$optimisticId already exists in the graph',
        );
      }
      graph.upsertEntity(type, optimisticId, data);
      graph.markEntityOptimistic(type, optimisticId);
      if (queryKey != null) {
        graph.insertIdInList(
          queryKey,
          optimisticId,
          position,
          entityType: type,
        );
      }
    }
    state = const EntityMutationState(isMutating: true);
    try {
      final transport = ref.read(entityTransportRegistryProvider).get<T>(type);
      final row = await transport.create(data);
      final confirmedId = transport.identify(row);
      if (optimisticId != null && optimisticId != confirmedId) {
        graph.removeEntity(type, optimisticId);
      }
      graph.upsertEntity(
        type,
        confirmedId,
        entityToGraphRow(row, toGraph ?? transport.toGraph),
      );
      graph.markEntitySynced(type, confirmedId);
      if (queryKey != null) {
        graph.insertIdInList(queryKey, confirmedId, position, entityType: type);
      }
      graph.invalidateListsForType(type);
      state = EntityMutationState(value: row);
      return row;
    } on Object catch (error) {
      final typed = toEntityGraphError(error);
      if (optimisticId != null) graph.removeEntity(type, optimisticId);
      state = EntityMutationState(error: typed);
      throw typed;
    }
  }
}

/// Encode a transport row without requiring Freezed or JSON code generation.
Map<String, Object?> entityToGraphRow<T extends Object>(
  T row,
  EntityEncoder<T>? encoder,
) {
  if (encoder != null) return Map.unmodifiable(encoder(row));
  if (row is Map<String, Object?>) return Map.unmodifiable(row);
  try {
    // Dynamic access is intentionally isolated at this adapter boundary.
    // ignore: avoid_dynamic_calls
    final encoded = (row as dynamic).toJson() as Map<String, dynamic>;
    return Map.unmodifiable(encoded.cast<String, Object?>());
  } on Object catch (error) {
    throw TerminalError(
      'No EntityEncoder was supplied for ${row.runtimeType}: $error',
    );
  }
}

Future<void> _runWithRetry(Future<void> Function() operation) async {
  var retryCount = 0;
  while (true) {
    try {
      return await operation();
    } on Object catch (error) {
      final delay = entityProviderRetry(retryCount, error);
      if (delay == null) rethrow;
      retryCount += 1;
      await Future<void>.delayed(delay);
    }
  }
}
