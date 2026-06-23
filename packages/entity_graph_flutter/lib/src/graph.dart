/// Normalized entity graph store — Dart mirror of src/graph.ts.
///
/// Canonical data lives in [EntityGraph._entities].
/// UI-only overlays live in [EntityGraph._patches].
/// List slots (ordered id arrays + pagination meta) live in [EntityGraph._lists].
///
/// All mutations are immutable (return new state) via [ValueNotifier] + [ChangeNotifier].
/// Consumers subscribe to [EntityGraph.changes] for coarse-grained invalidation,
/// or to per-entity / per-list streams via [EntityGraph.entityStream] /
/// [EntityGraph.listStream].
library;

import 'dart:async';

/// Provenance of the latest known entity state.
enum SyncOrigin { server, client, optimistic }

/// Optional sync metadata kept beside the canonical entity payload.
class EntitySyncMetadata {
  const EntitySyncMetadata({
    this.synced = true,
    this.origin = SyncOrigin.server,
    this.updatedAt,
  });

  final bool synced;
  final SyncOrigin origin;
  final DateTime? updatedAt;

  EntitySyncMetadata copyWith({
    bool? synced,
    SyncOrigin? origin,
    DateTime? updatedAt,
  }) =>
      EntitySyncMetadata(
        synced: synced ?? this.synced,
        origin: origin ?? this.origin,
        updatedAt: updatedAt ?? this.updatedAt,
      );
}

/// Fetch / cache metadata for a single entity instance.
class EntityState {
  const EntityState({
    this.isFetching = false,
    this.lastFetched,
    this.error,
    this.stale = false,
  });

  final bool isFetching;
  final DateTime? lastFetched;
  final String? error;
  final bool stale;

  EntityState copyWith({
    bool? isFetching,
    DateTime? lastFetched,
    String? error,
    bool? stale,
    bool clearError = false,
  }) =>
      EntityState(
        isFetching: isFetching ?? this.isFetching,
        lastFetched: lastFetched ?? this.lastFetched,
        error: clearError ? null : (error ?? this.error),
        stale: stale ?? this.stale,
      );
}

/// Ordered entity-id array + pagination metadata.
/// Lists store ids, never embedded entity payloads — cross-view reactivity
/// depends on this invariant.
class ListState {
  const ListState({
    this.ids = const [],
    this.total,
    this.nextCursor,
    this.prevCursor,
    this.hasNextPage = false,
    this.hasPrevPage = false,
    this.isFetching = false,
    this.isFetchingMore = false,
    this.error,
    this.lastFetched,
    this.stale = false,
  });

  final List<String> ids;
  final int? total;
  final String? nextCursor;
  final String? prevCursor;
  final bool hasNextPage;
  final bool hasPrevPage;
  final bool isFetching;
  final bool isFetchingMore;
  final String? error;
  final DateTime? lastFetched;
  final bool stale;

  ListState copyWith({
    List<String>? ids,
    int? total,
    String? nextCursor,
    String? prevCursor,
    bool? hasNextPage,
    bool? hasPrevPage,
    bool? isFetching,
    bool? isFetchingMore,
    String? error,
    DateTime? lastFetched,
    bool? stale,
    bool clearError = false,
  }) =>
      ListState(
        ids: ids ?? this.ids,
        total: total ?? this.total,
        nextCursor: nextCursor ?? this.nextCursor,
        prevCursor: prevCursor ?? this.prevCursor,
        hasNextPage: hasNextPage ?? this.hasNextPage,
        hasPrevPage: hasPrevPage ?? this.hasPrevPage,
        isFetching: isFetching ?? this.isFetching,
        isFetchingMore: isFetchingMore ?? this.isFetchingMore,
        error: clearError ? null : (error ?? this.error),
        lastFetched: lastFetched ?? this.lastFetched,
        stale: stale ?? this.stale,
      );

  static const empty = ListState();
}

// ─── Change notification ────────────────────────────────────────────────────

/// Coarse-grained graph change event.
sealed class GraphChange {
  const GraphChange();
}

/// An entity was upserted, replaced, or patched.
final class EntityChanged extends GraphChange {
  const EntityChanged(this.type, this.id);
  final String type;
  final String id;
}

/// An entity was removed.
final class EntityRemoved extends GraphChange {
  const EntityRemoved(this.type, this.id);
  final String type;
  final String id;
}

/// A list slot was updated.
final class ListChanged extends GraphChange {
  const ListChanged(this.queryKey);
  final String queryKey;
}

// ─── The graph ──────────────────────────────────────────────────────────────

/// Normalized entity graph — the single source of truth.
///
/// Mirrors the Zustand [GraphState] from entity-graph-core's graph.ts.
/// All writes are synchronous and notify [changes].
class EntityGraph {
  EntityGraph._();

  /// Singleton instance (mirrors the module-global Zustand store).
  static final EntityGraph instance = EntityGraph._();

  // Internal storage — all maps are mutated in-place; the graph notifies
  // listeners via [_changeController] on every write.
  final Map<String, Map<String, Map<String, Object?>>> _entities = {};
  final Map<String, Map<String, Map<String, Object?>>> _patches = {};
  final Map<String, EntityState> _entityStates = {};
  final Map<String, EntitySyncMetadata> _syncMetadata = {};
  final Map<String, ListState> _lists = {};

  final _changeController = StreamController<GraphChange>.broadcast();

  /// Stream of all graph changes. Subscribe once at a high level and
  /// selectively react to [EntityChanged] / [ListChanged] events.
  Stream<GraphChange> get changes => _changeController.stream;

  void _notifyEntity(String type, String id) =>
      _changeController.add(EntityChanged(type, id));

  void _notifyList(String queryKey) =>
      _changeController.add(ListChanged(queryKey));

  static String _ek(String type, String id) => '$type:$id';

  // ─── Read API ─────────────────────────────────────────────────────────────

  /// Read canonical entity merged with patches, or `null` if absent.
  Map<String, Object?>? readEntity(String type, String id) {
    final base = _entities[type]?[id];
    if (base == null) return null;
    final patch = _patches[type]?[id];
    if (patch == null || patch.isEmpty) return Map.unmodifiable(base);
    return Map.unmodifiable({...base, ...patch});
  }

  /// Read entity + sync metadata fields (`\$synced`, `\$origin`, `\$updatedAt`).
  Map<String, Object?>? readEntitySnapshot(String type, String id) {
    final base = readEntity(type, id);
    if (base == null) return null;
    final meta = _syncMetadata[_ek(type, id)];
    return {
      ...base,
      r'$synced': meta?.synced ?? true,
      r'$origin': meta?.origin.name ?? 'server',
      r'$updatedAt': meta?.updatedAt?.millisecondsSinceEpoch,
    };
  }

  /// Fetch/cache state for a single entity.
  EntityState entityState(String type, String id) =>
      _entityStates[_ek(type, id)] ?? const EntityState();

  /// List slot for a query key.
  ListState listState(String queryKey) =>
      _lists[queryKey] ?? ListState.empty;

  /// All entity ids for a given type.
  Iterable<String> entityIds(String type) =>
      _entities[type]?.keys ?? const Iterable.empty();

  // ─── Entity write API ────────────────────────────────────────────────────

  /// Shallow-merge [data] into the canonical entity.
  void upsertEntity(String type, String id, Map<String, Object?> data) {
    _entities.putIfAbsent(type, () => {});
    final prev = _entities[type]![id] ?? {};
    _entities[type]![id] = {...prev, ...data};
    _syncMetadata.putIfAbsent(_ek(type, id), () => const EntitySyncMetadata());
    _notifyEntity(type, id);
  }

  /// Batch upsert — single notification pass.
  void upsertEntities(
    String type,
    List<({String id, Map<String, Object?> data})> entries,
  ) {
    _entities.putIfAbsent(type, () => {});
    for (final e in entries) {
      final prev = _entities[type]![e.id] ?? {};
      _entities[type]![e.id] = {...prev, ...e.data};
      _syncMetadata.putIfAbsent(
        _ek(type, e.id),
        () => const EntitySyncMetadata(),
      );
    }
    for (final e in entries) {
      _notifyEntity(type, e.id);
    }
  }

  /// Replace the canonical entity entirely (no merge).
  void replaceEntity(String type, String id, Map<String, Object?> data) {
    _entities.putIfAbsent(type, () => {});
    _entities[type]![id] = Map.of(data);
    _syncMetadata.putIfAbsent(_ek(type, id), () => const EntitySyncMetadata());
    _notifyEntity(type, id);
  }

  /// Remove canonical entity, patches, and entity state.
  void removeEntity(String type, String id) {
    _entities[type]?.remove(id);
    _patches[type]?.remove(id);
    _entityStates.remove(_ek(type, id));
    _syncMetadata.remove(_ek(type, id));
    _changeController.add(EntityRemoved(type, id));
  }

  // ─── Patch API ───────────────────────────────────────────────────────────

  /// Merge UI-only fields into the patch layer.
  void patchEntity(String type, String id, Map<String, Object?> patch) {
    _patches.putIfAbsent(type, () => {});
    final prev = _patches[type]![id] ?? {};
    _patches[type]![id] = {...prev, ...patch};
    _notifyEntity(type, id);
  }

  /// Remove specific patch keys.
  void unpatchEntity(String type, String id, List<String> keys) {
    final p = _patches[type]?[id];
    if (p == null) return;
    for (final k in keys) {
      p.remove(k);
    }
    _notifyEntity(type, id);
  }

  /// Drop all patches for an entity.
  void clearPatch(String type, String id) {
    _patches[type]?.remove(id);
    _notifyEntity(type, id);
  }

  // ─── Entity state API ────────────────────────────────────────────────────

  void setEntityFetching(String type, String id, {required bool fetching}) {
    final k = _ek(type, id);
    _entityStates[k] =
        (_entityStates[k] ?? const EntityState()).copyWith(isFetching: fetching);
    _notifyEntity(type, id);
  }

  void setEntityError(String type, String id, String? error) {
    final k = _ek(type, id);
    _entityStates[k] = (_entityStates[k] ?? const EntityState())
        .copyWith(isFetching: false, error: error, clearError: error == null);
    _notifyEntity(type, id);
  }

  void setEntityFetched(String type, String id) {
    final k = _ek(type, id);
    _entityStates[k] = (_entityStates[k] ?? const EntityState()).copyWith(
      lastFetched: DateTime.now(),
      isFetching: false,
      stale: false,
      clearError: true,
    );
    _syncMetadata[k] = (_syncMetadata[k] ?? const EntitySyncMetadata()).copyWith(
      synced: true,
      origin: SyncOrigin.server,
      updatedAt: DateTime.now(),
    );
    _notifyEntity(type, id);
  }

  void setEntityStale(String type, String id, {required bool stale}) {
    final k = _ek(type, id);
    _entityStates[k] =
        (_entityStates[k] ?? const EntityState()).copyWith(stale: stale);
    _notifyEntity(type, id);
  }

  // ─── List write API ──────────────────────────────────────────────────────

  void setListResult(
    String queryKey,
    List<String> ids, {
    int? total,
    String? nextCursor,
    String? prevCursor,
    bool hasNextPage = false,
    bool hasPrevPage = false,
  }) {
    final prev = _lists[queryKey] ?? ListState.empty;
    _lists[queryKey] = prev.copyWith(
      ids: List.unmodifiable(ids),
      total: total,
      nextCursor: nextCursor,
      prevCursor: prevCursor,
      hasNextPage: hasNextPage,
      hasPrevPage: hasPrevPage,
      isFetching: false,
      isFetchingMore: false,
      lastFetched: DateTime.now(),
      stale: false,
      clearError: true,
    );
    _notifyList(queryKey);
  }

  void appendListResult(
    String queryKey,
    List<String> ids, {
    int? total,
    String? nextCursor,
    bool hasNextPage = false,
  }) {
    final prev = _lists[queryKey] ?? ListState.empty;
    final merged = [
      ...prev.ids,
      ...ids.where((id) => !prev.ids.contains(id)),
    ];
    _lists[queryKey] = prev.copyWith(
      ids: List.unmodifiable(merged),
      total: total ?? prev.total,
      nextCursor: nextCursor,
      hasNextPage: hasNextPage,
      isFetching: false,
      isFetchingMore: false,
      lastFetched: DateTime.now(),
      stale: false,
      clearError: true,
    );
    _notifyList(queryKey);
  }

  void setListFetching(String queryKey, {required bool fetching}) {
    _lists[queryKey] =
        (_lists[queryKey] ?? ListState.empty).copyWith(isFetching: fetching);
    _notifyList(queryKey);
  }

  void setListFetchingMore(String queryKey, {required bool fetchingMore}) {
    _lists[queryKey] = (_lists[queryKey] ?? ListState.empty)
        .copyWith(isFetchingMore: fetchingMore);
    _notifyList(queryKey);
  }

  void setListError(String queryKey, String? error) {
    final prev = _lists[queryKey] ?? ListState.empty;
    _lists[queryKey] = prev.copyWith(
      error: error,
      clearError: error == null,
      isFetching: false,
      isFetchingMore: false,
      lastFetched: DateTime.now(),
      stale: false,
    );
    _notifyList(queryKey);
  }

  void setListStale(String queryKey, {required bool stale}) {
    _lists[queryKey] =
        (_lists[queryKey] ?? ListState.empty).copyWith(stale: stale);
    _notifyList(queryKey);
  }

  void removeIdFromAllLists(String type, String id) {
    for (final key in _lists.keys) {
      final list = _lists[key]!;
      if (list.ids.contains(id)) {
        final newIds = list.ids.where((e) => e != id).toList();
        _lists[key] = list.copyWith(
          ids: newIds,
          total: list.total != null ? list.total! - 1 : null,
        );
        _notifyList(key);
      }
    }
  }

  void insertIdInList(String queryKey, String id, Object position) {
    final prev = _lists[queryKey] ?? ListState.empty;
    final ids = prev.ids.where((e) => e != id).toList();
    if (position == 'start') {
      ids.insert(0, id);
    } else if (position == 'end') {
      ids.add(id);
    } else if (position is int) {
      ids.insert(position.clamp(0, ids.length), id);
    }
    _lists[queryKey] = prev.copyWith(ids: List.unmodifiable(ids));
    _notifyList(queryKey);
  }

  // ─── Invalidation ─────────────────────────────────────────────────────────

  void invalidateEntity(String type, {String? id}) {
    if (id != null) {
      final k = _ek(type, id);
      if (_entityStates[k] != null) {
        _entityStates[k] = _entityStates[k]!.copyWith(stale: true);
        _notifyEntity(type, id);
      }
    } else {
      for (final k in _entityStates.keys) {
        if (k.startsWith('$type:')) {
          _entityStates[k] = _entityStates[k]!.copyWith(stale: true);
        }
      }
      _changeController.add(EntityChanged(type, '*'));
    }
  }

  void invalidateLists(String prefix) {
    for (final key in _lists.keys) {
      if (key.startsWith(prefix)) {
        _lists[key] = _lists[key]!.copyWith(stale: true);
        _notifyList(key);
      }
    }
  }

  void invalidateType(String type) {
    invalidateEntity(type);
    invalidateLists(type);
  }

  // ─── Test / DevTools helpers ──────────────────────────────────────────────

  /// Reset the entire graph state. Intended for tests only.
  void reset() {
    _entities.clear();
    _patches.clear();
    _entityStates.clear();
    _syncMetadata.clear();
    _lists.clear();
  }

  /// Dispose the change stream. Call when the graph is no longer needed.
  Future<void> dispose() => _changeController.close();
}
