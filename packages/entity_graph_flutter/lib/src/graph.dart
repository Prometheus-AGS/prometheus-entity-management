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
  }) => EntitySyncMetadata(
    synced: synced ?? this.synced,
    origin: origin ?? this.origin,
    updatedAt: updatedAt ?? this.updatedAt,
  );
}

/// Complete rollback receipt for an optimistic entity removal.
///
/// The receipt belongs to the graph because only the graph knows every list
/// membership and local patch associated with an entity. UI/controller code
/// must not manufacture duplicate entity snapshots outside this boundary.
class EntityRemovalSnapshot {
  const EntityRemovalSnapshot({
    required this.type,
    required this.id,
    required this.entity,
    required this.patch,
    required this.state,
    required this.syncMetadata,
    required this.listIndexes,
  });

  final String type;
  final String id;
  final Map<String, Object?>? entity;
  final Map<String, Object?>? patch;
  final EntityState? state;
  final EntitySyncMetadata? syncMetadata;

  /// Query key to the entity's former index in that ID-only list.
  final Map<String, int> listIndexes;
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
  }) => EntityState(
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
    bool clearTotal = false,
    bool clearNextCursor = false,
    bool clearPrevCursor = false,
  }) => ListState(
    ids: ids ?? this.ids,
    total: clearTotal ? null : (total ?? this.total),
    nextCursor: clearNextCursor ? null : (nextCursor ?? this.nextCursor),
    prevCursor: clearPrevCursor ? null : (prevCursor ?? this.prevCursor),
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

/// The complete graph was cleared or replaced.
final class GraphReset extends GraphChange {
  const GraphReset();
}

/// Immutable graph data captured at one publication boundary.
final class EntityGraphSnapshot {
  const EntityGraphSnapshot._({
    required this.entities,
    required this.patches,
    required this.entityStates,
    required this.syncMetadata,
    required this.lists,
    required this.listTypes,
  });

  /// Create a snapshot from already validated graph data.
  factory EntityGraphSnapshot.fromData({
    required Map<String, Map<String, Map<String, Object?>>> entities,
    required Map<String, Map<String, Map<String, Object?>>> patches,
    required Map<String, EntityState> entityStates,
    required Map<String, EntitySyncMetadata> syncMetadata,
    required Map<String, ListState> lists,
    Map<String, String> listTypes = const {},
  }) => EntityGraphSnapshot._(
    entities: Map<String, Map<String, Map<String, Object?>>>.unmodifiable({
      for (final type in entities.entries)
        type.key: Map<String, Map<String, Object?>>.unmodifiable({
          for (final entity in type.value.entries)
            entity.key: Map<String, Object?>.unmodifiable({
              for (final field in entity.value.entries)
                field.key: EntityGraph._copySnapshotValue(field.value),
            }),
        }),
    }),
    patches: Map<String, Map<String, Map<String, Object?>>>.unmodifiable({
      for (final type in patches.entries)
        type.key: Map<String, Map<String, Object?>>.unmodifiable({
          for (final patch in type.value.entries)
            patch.key: Map<String, Object?>.unmodifiable({
              for (final field in patch.value.entries)
                field.key: EntityGraph._copySnapshotValue(field.value),
            }),
        }),
    }),
    entityStates: Map<String, EntityState>.unmodifiable(entityStates),
    syncMetadata: Map<String, EntitySyncMetadata>.unmodifiable(syncMetadata),
    lists: Map<String, ListState>.unmodifiable({
      for (final entry in lists.entries)
        entry.key: EntityGraph._copyListState(entry.value),
    }),
    listTypes: Map<String, String>.unmodifiable(listTypes),
  );

  final Map<String, Map<String, Map<String, Object?>>> entities;
  final Map<String, Map<String, Map<String, Object?>>> patches;
  final Map<String, EntityState> entityStates;
  final Map<String, EntitySyncMetadata> syncMetadata;
  final Map<String, ListState> lists;
  final Map<String, String> listTypes;
}

/// One completed outer graph write with deduplicated affected identities.
final class GraphPublication {
  const GraphPublication({
    required this.sequence,
    required this.changes,
    required this.before,
    required this.after,
  });

  final int sequence;
  final List<GraphChange> changes;
  final EntityGraphSnapshot before;
  final EntityGraphSnapshot after;
}

/// Receives one completed graph publication synchronously after its write.
typedef GraphPublicationListener = void Function(GraphPublication publication);

enum GraphViewKind { entity, list }

final class GraphEntityIdentity {
  const GraphEntityIdentity({required this.type, required this.id});

  final String type;
  final String id;
}

final class GraphViewDefinition {
  const GraphViewDefinition({
    required this.viewId,
    required this.label,
    required this.kind,
    required this.entityType,
    this.queryKey,
  });

  final String viewId;
  final String label;
  final GraphViewKind kind;
  final String entityType;
  final String? queryKey;
}

final class GraphViewRecord {
  const GraphViewRecord({
    required this.definition,
    required this.registeredAt,
    required this.lastRenderedAt,
    required this.renderCount,
    required this.subscriberCount,
    required this.membership,
  });

  final GraphViewDefinition definition;
  final DateTime registeredAt;
  final DateTime? lastRenderedAt;
  final int renderCount;
  final int subscriberCount;
  final List<GraphEntityIdentity> membership;
}

enum GraphViewLifecycleState { registered, membershipChanged, unregistered }

final class GraphViewLifecycleEvent {
  const GraphViewLifecycleEvent({required this.state, required this.record});

  final GraphViewLifecycleState state;
  final GraphViewRecord record;
}

typedef GraphViewLifecycleListener =
    void Function(GraphViewLifecycleEvent event);

final class GraphViewRegistration {
  GraphViewRegistration._({
    required void Function(Iterable<GraphEntityIdentity>) update,
    required void Function() dispose,
  }) : _update = update,
       _dispose = dispose;

  final void Function(Iterable<GraphEntityIdentity>) _update;
  final void Function() _dispose;
  var _disposed = false;

  bool get isDisposed => _disposed;

  void update(Iterable<GraphEntityIdentity> membership) {
    if (_disposed) return;
    _update(membership);
  }

  void dispose() {
    if (_disposed) return;
    _disposed = true;
    _dispose();
  }
}

final class _GraphViewEntry {
  _GraphViewEntry({required this.definition, required this.registeredAt});

  final GraphViewDefinition definition;
  final DateTime registeredAt;
  final Map<Object, List<GraphEntityIdentity>> registrations = {};
  DateTime? lastRenderedAt;
  var renderCount = 0;
}

// ─── The graph ──────────────────────────────────────────────────────────────

/// Normalized entity graph — the single source of truth.
///
/// Mirrors the Zustand `GraphState` from entity-graph-core's graph.ts.
/// All writes are synchronous and notify [changes].
class EntityGraph {
  /// Creates an isolated graph, primarily for provider overrides and tests.
  EntityGraph();

  /// Singleton instance (mirrors the module-global Zustand store).
  static final EntityGraph instance = EntityGraph();

  // Internal storage — all maps are mutated in-place; the graph notifies
  // listeners via [_changeController] on every write.
  final Map<String, Map<String, Map<String, Object?>>> _entities = {};
  final Map<String, Map<String, Map<String, Object?>>> _patches = {};
  final Map<String, EntityState> _entityStates = {};
  final Map<String, EntitySyncMetadata> _syncMetadata = {};
  final Map<String, ListState> _lists = {};
  final Map<String, String> _listTypes = {};

  final _changeController = StreamController<GraphChange>.broadcast();
  final Set<GraphPublicationListener> _publicationListeners = {};
  final Map<String, GraphChange> _pendingChanges = {};
  final Map<String, _GraphViewEntry> _views = {};
  final Set<GraphViewLifecycleListener> _viewLifecycleListeners = {};

  EntityGraphSnapshot? _publicationBefore;
  var _writeDepth = 0;
  var _publicationSequence = 0;

  /// Stream of all graph changes. Subscribe once at a high level and
  /// selectively react to [EntityChanged] / [ListChanged] events.
  Stream<GraphChange> get changes => _changeController.stream;

  void _notifyEntity(String type, String id) =>
      _queueChange('entity:$type:$id', EntityChanged(type, id));

  void _notifyList(String queryKey) =>
      _queueChange('list:$queryKey', ListChanged(queryKey));

  void _notifyRemoved(String type, String id) =>
      _queueChange('entity:$type:$id', EntityRemoved(type, id));

  void _notifyReset() {
    _pendingChanges
      ..clear()
      ..['store'] = const GraphReset();
  }

  void _queueChange(String key, GraphChange change) {
    _pendingChanges[key] = change;
  }

  T _write<T>(T Function() action) {
    final outermost = _writeDepth == 0;
    if (outermost) {
      _pendingChanges.clear();
      _publicationBefore = _publicationListeners.isEmpty ? null : _snapshot();
    }
    _writeDepth += 1;
    try {
      return action();
    } finally {
      _writeDepth -= 1;
      if (outermost) _completeWrite();
    }
  }

  void _completeWrite() {
    final changes = List<GraphChange>.unmodifiable(_pendingChanges.values);
    _pendingChanges.clear();
    if (changes.isEmpty) {
      _publicationBefore = null;
      return;
    }

    _publicationSequence += 1;
    for (final change in changes) {
      _changeController.add(change);
    }

    final before = _publicationBefore;
    _publicationBefore = null;
    if (before == null || _publicationListeners.isEmpty) return;
    final publication = GraphPublication(
      sequence: _publicationSequence,
      changes: changes,
      before: before,
      after: _snapshot(),
    );
    for (final listener in List.of(_publicationListeners)) {
      try {
        listener(publication);
      } on Object {
        // Tooling observers cannot interrupt the owning production graph.
      }
    }
  }

  EntityGraphSnapshot _snapshot() => EntityGraphSnapshot._(
    entities: Map<String, Map<String, Map<String, Object?>>>.unmodifiable({
      for (final type in _entities.entries)
        type.key: Map<String, Map<String, Object?>>.unmodifiable({
          for (final entity in type.value.entries)
            entity.key: Map<String, Object?>.unmodifiable({
              for (final field in entity.value.entries)
                field.key: _copySnapshotValue(field.value),
            }),
        }),
    }),
    patches: Map<String, Map<String, Map<String, Object?>>>.unmodifiable({
      for (final type in _patches.entries)
        type.key: Map<String, Map<String, Object?>>.unmodifiable({
          for (final patch in type.value.entries)
            patch.key: Map<String, Object?>.unmodifiable({
              for (final field in patch.value.entries)
                field.key: _copySnapshotValue(field.value),
            }),
        }),
    }),
    entityStates: Map<String, EntityState>.unmodifiable(_entityStates),
    syncMetadata: Map<String, EntitySyncMetadata>.unmodifiable(_syncMetadata),
    lists: Map<String, ListState>.unmodifiable({
      for (final entry in _lists.entries)
        entry.key: _copyListState(entry.value),
    }),
    listTypes: Map<String, String>.unmodifiable(_listTypes),
  );

  /// Capture the complete graph-owned data needed for local DevTools rewind.
  ///
  /// The returned value is immutable and remains local to the process unless
  /// an explicitly attached DevTools controller serializes it under its host
  /// value policy.
  EntityGraphSnapshot captureSnapshot() => _snapshot();

  /// Restore one graph-owned snapshot through the normal publication boundary.
  void restoreSnapshot(EntityGraphSnapshot snapshot) {
    _write(() {
      _entities
        ..clear()
        ..addAll({
          for (final type in snapshot.entities.entries)
            type.key: {
              for (final entity in type.value.entries)
                entity.key: Map<String, Object?>.of(entity.value),
            },
        });
      _patches
        ..clear()
        ..addAll({
          for (final type in snapshot.patches.entries)
            type.key: {
              for (final patch in type.value.entries)
                patch.key: Map<String, Object?>.of(patch.value),
            },
        });
      _entityStates
        ..clear()
        ..addAll(snapshot.entityStates);
      _syncMetadata
        ..clear()
        ..addAll(snapshot.syncMetadata);
      _lists
        ..clear()
        ..addAll({
          for (final entry in snapshot.lists.entries)
            entry.key: _copyListState(entry.value),
        });
      _listTypes
        ..clear()
        ..addAll(snapshot.listTypes);
      _notifyReset();
    });
  }

  static ListState _copyListState(ListState state) => ListState(
    ids: List.unmodifiable(state.ids),
    total: state.total,
    nextCursor: state.nextCursor,
    prevCursor: state.prevCursor,
    hasNextPage: state.hasNextPage,
    hasPrevPage: state.hasPrevPage,
    isFetching: state.isFetching,
    isFetchingMore: state.isFetchingMore,
    error: state.error,
    lastFetched: state.lastFetched,
    stale: state.stale,
  );

  static Object? _copySnapshotValue(Object? value) {
    if (value is Map<Object?, Object?>) {
      return Map.unmodifiable({
        for (final entry in value.entries)
          entry.key: _copySnapshotValue(entry.value),
      });
    }
    if (value is List<Object?>) {
      return List.unmodifiable(value.map(_copySnapshotValue));
    }
    if (value is Set<Object?>) {
      return Set.unmodifiable(value.map(_copySnapshotValue));
    }
    return value;
  }

  /// Observe complete outer writes without changing graph ownership.
  void Function() subscribePublications(GraphPublicationListener listener) {
    _publicationListeners.add(listener);
    var subscribed = true;
    return () {
      if (!subscribed) return;
      subscribed = false;
      _publicationListeners.remove(listener);
    };
  }

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

  /// Read canonical server-confirmed data without UI/optimistic patches.
  Map<String, Object?>? readCanonicalEntity(String type, String id) {
    final row = _entities[type]?[id];
    return row == null ? null : Map.unmodifiable(row);
  }

  /// Read only the local patch layer for an entity.
  Map<String, Object?>? readEntityPatch(String type, String id) {
    final patch = _patches[type]?[id];
    return patch == null ? null : Map.unmodifiable(patch);
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

  /// Sync metadata for an entity, defaulting to a server-confirmed record.
  EntitySyncMetadata syncMetadata(String type, String id) =>
      _syncMetadata[_ek(type, id)] ?? const EntitySyncMetadata();

  /// List slot for a query key.
  ListState listState(String queryKey) => _lists[queryKey] ?? ListState.empty;

  /// All entity ids for a given type.
  Iterable<String> entityIds(String type) =>
      _entities[type]?.keys ?? const Iterable.empty();

  /// Current framework view registrations projected without entity copies.
  List<GraphViewRecord> get viewRecords =>
      List.unmodifiable(_views.values.map(_viewRecord));

  /// Register one mounted framework view and its current entity membership.
  GraphViewRegistration registerView(
    GraphViewDefinition definition, {
    Iterable<GraphEntityIdentity> membership = const [],
  }) {
    final token = Object();
    final now = DateTime.now().toUtc();
    final entry = _views.putIfAbsent(
      definition.viewId,
      () => _GraphViewEntry(definition: definition, registeredAt: now),
    );
    entry.registrations[token] = _normalizedMembership(membership);
    entry
      ..lastRenderedAt = now
      ..renderCount += 1;
    _publishViewLifecycle(
      entry.registrations.length == 1
          ? GraphViewLifecycleState.registered
          : GraphViewLifecycleState.membershipChanged,
      entry,
    );

    return GraphViewRegistration._(
      update: (nextMembership) {
        final current = _views[definition.viewId];
        if (current == null || !current.registrations.containsKey(token)) {
          return;
        }
        final previous = _combinedMembership(current);
        current.registrations[token] = _normalizedMembership(nextMembership);
        current
          ..lastRenderedAt = DateTime.now().toUtc()
          ..renderCount += 1;
        final next = _combinedMembership(current);
        if (!_sameMembership(previous, next)) {
          _publishViewLifecycle(
            GraphViewLifecycleState.membershipChanged,
            current,
          );
        }
      },
      dispose: () {
        final current = _views[definition.viewId];
        if (current == null || current.registrations.remove(token) == null) {
          return;
        }
        if (current.registrations.isEmpty) {
          final record = _viewRecord(current);
          _views.remove(definition.viewId);
          _publishViewRecord(
            GraphViewLifecycleState.unregistered,
            GraphViewRecord(
              definition: record.definition,
              registeredAt: record.registeredAt,
              lastRenderedAt: record.lastRenderedAt,
              renderCount: record.renderCount,
              subscriberCount: 0,
              membership: const [],
            ),
          );
        } else {
          _publishViewLifecycle(
            GraphViewLifecycleState.membershipChanged,
            current,
          );
        }
      },
    );
  }

  /// Observe logical framework view registration and membership changes.
  void Function() subscribeViewLifecycles(GraphViewLifecycleListener listener) {
    _viewLifecycleListeners.add(listener);
    var subscribed = true;
    return () {
      if (!subscribed) return;
      subscribed = false;
      _viewLifecycleListeners.remove(listener);
    };
  }

  void _publishViewLifecycle(
    GraphViewLifecycleState state,
    _GraphViewEntry entry,
  ) {
    _publishViewRecord(state, _viewRecord(entry));
  }

  void _publishViewRecord(
    GraphViewLifecycleState state,
    GraphViewRecord record,
  ) {
    final event = GraphViewLifecycleEvent(state: state, record: record);
    for (final listener in List.of(_viewLifecycleListeners)) {
      try {
        listener(event);
      } on Object {
        // Framework instrumentation cannot interrupt view providers.
      }
    }
  }

  GraphViewRecord _viewRecord(_GraphViewEntry entry) => GraphViewRecord(
    definition: entry.definition,
    registeredAt: entry.registeredAt,
    lastRenderedAt: entry.lastRenderedAt,
    renderCount: entry.renderCount,
    subscriberCount: entry.registrations.length,
    membership: _combinedMembership(entry),
  );

  static List<GraphEntityIdentity> _normalizedMembership(
    Iterable<GraphEntityIdentity> membership,
  ) {
    final identities = <String, GraphEntityIdentity>{};
    for (final entity in membership) {
      identities['${entity.type}\u0000${entity.id}'] = entity;
    }
    return List.unmodifiable(identities.values);
  }

  static List<GraphEntityIdentity> _combinedMembership(_GraphViewEntry entry) {
    final identities = <String, GraphEntityIdentity>{};
    for (final registration in entry.registrations.values) {
      for (final entity in registration) {
        identities['${entity.type}\u0000${entity.id}'] = entity;
      }
    }
    return List.unmodifiable(identities.values);
  }

  static bool _sameMembership(
    List<GraphEntityIdentity> left,
    List<GraphEntityIdentity> right,
  ) {
    if (left.length != right.length) return false;
    for (var index = 0; index < left.length; index += 1) {
      if (left[index].type != right[index].type ||
          left[index].id != right[index].id) {
        return false;
      }
    }
    return true;
  }

  // ─── Entity write API ────────────────────────────────────────────────────

  /// Shallow-merge [data] into the canonical entity.
  void upsertEntity(String type, String id, Map<String, Object?> data) {
    _write(() {
      _entities.putIfAbsent(type, () => {});
      final prev = _entities[type]![id] ?? {};
      _entities[type]![id] = {...prev, ...data};
      _syncMetadata.putIfAbsent(
        _ek(type, id),
        () => const EntitySyncMetadata(),
      );
      _notifyEntity(type, id);
    });
  }

  /// Batch upsert — single notification pass.
  void upsertEntities(
    String type,
    List<({String id, Map<String, Object?> data})> entries,
  ) {
    _write(() {
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
    });
  }

  /// Replace the canonical entity entirely (no merge).
  void replaceEntity(String type, String id, Map<String, Object?> data) {
    _write(() {
      _entities.putIfAbsent(type, () => {});
      _entities[type]![id] = Map.of(data);
      _syncMetadata.putIfAbsent(
        _ek(type, id),
        () => const EntitySyncMetadata(),
      );
      _notifyEntity(type, id);
    });
  }

  /// Remove canonical entity, patches, and entity state.
  void removeEntity(String type, String id) {
    _write(() {
      _entities[type]?.remove(id);
      _patches[type]?.remove(id);
      _entityStates.remove(_ek(type, id));
      _syncMetadata.remove(_ek(type, id));
      removeIdFromAllLists(type, id);
      _notifyRemoved(type, id);
    });
  }

  /// Remove an entity optimistically and return everything needed to roll back.
  EntityRemovalSnapshot removeEntityOptimistically(String type, String id) {
    return _write(() {
      final indexes = <String, int>{};
      for (final entry in _lists.entries) {
        final knownType = _listTypes[entry.key];
        if (knownType != null && knownType != type) continue;
        final index = entry.value.ids.indexOf(id);
        if (index >= 0) indexes[entry.key] = index;
      }
      final snapshot = EntityRemovalSnapshot(
        type: type,
        id: id,
        entity: readCanonicalEntity(type, id),
        patch: readEntityPatch(type, id),
        state: _entityStates[_ek(type, id)],
        syncMetadata: _syncMetadata[_ek(type, id)],
        listIndexes: Map.unmodifiable(indexes),
      );
      removeEntity(type, id);
      return snapshot;
    });
  }

  /// Restore a failed optimistic removal from its graph-owned receipt.
  void restoreRemovedEntity(EntityRemovalSnapshot snapshot) {
    _write(() {
      final entity = snapshot.entity;
      if (entity != null) {
        _entities.putIfAbsent(snapshot.type, () => {});
        _entities[snapshot.type]![snapshot.id] = Map.of(entity);
      }
      final patch = snapshot.patch;
      if (patch != null) {
        _patches.putIfAbsent(snapshot.type, () => {});
        _patches[snapshot.type]![snapshot.id] = Map.of(patch);
      }
      final key = _ek(snapshot.type, snapshot.id);
      if (snapshot.state != null) _entityStates[key] = snapshot.state!;
      if (snapshot.syncMetadata != null) {
        _syncMetadata[key] = snapshot.syncMetadata!;
      }
      for (final entry in snapshot.listIndexes.entries) {
        final previous = _lists[entry.key] ?? ListState.empty;
        final ids = previous.ids.where((item) => item != snapshot.id).toList();
        ids.insert(entry.value.clamp(0, ids.length), snapshot.id);
        _lists[entry.key] = previous.copyWith(
          ids: List.unmodifiable(ids),
          total: previous.total == null ? null : previous.total! + 1,
        );
        _notifyList(entry.key);
      }
      _notifyEntity(snapshot.type, snapshot.id);
    });
  }

  // ─── Patch API ───────────────────────────────────────────────────────────

  /// Merge UI-only fields into the patch layer.
  void patchEntity(String type, String id, Map<String, Object?> patch) {
    _write(() {
      _patches.putIfAbsent(type, () => {});
      final prev = _patches[type]![id] ?? {};
      _patches[type]![id] = {...prev, ...patch};
      _notifyEntity(type, id);
    });
  }

  /// Remove specific patch keys.
  void unpatchEntity(String type, String id, List<String> keys) {
    _write(() {
      final p = _patches[type]?[id];
      if (p == null) return;
      for (final k in keys) {
        p.remove(k);
      }
      _notifyEntity(type, id);
    });
  }

  /// Drop all patches for an entity.
  void clearPatch(String type, String id) {
    _write(() {
      _patches[type]?.remove(id);
      _notifyEntity(type, id);
    });
  }

  /// Replace the exact local patch for one entity in a single publication.
  ///
  /// This is used by conflict-safe DevTools preview restoration so returning
  /// to the prior patch cannot expose an intermediate cleared state.
  void replaceEntityPatch(String type, String id, Map<String, Object?>? patch) {
    _write(() {
      if (patch == null || patch.isEmpty) {
        final bucket = _patches[type];
        bucket?.remove(id);
        if (bucket != null && bucket.isEmpty) _patches.remove(type);
      } else {
        _patches.putIfAbsent(type, () => {});
        _patches[type]![id] = Map<String, Object?>.of(patch);
      }
      _notifyEntity(type, id);
    });
  }

  /// Mark the current visible entity as a local optimistic value.
  void markEntityOptimistic(String type, String id) {
    _write(() {
      _syncMetadata[_ek(type, id)] = EntitySyncMetadata(
        synced: false,
        origin: SyncOrigin.optimistic,
        updatedAt: DateTime.now(),
      );
      _notifyEntity(type, id);
    });
  }

  /// Mark an entity as confirmed without changing its canonical payload.
  void markEntitySynced(String type, String id) {
    _write(() {
      _syncMetadata[_ek(type, id)] = EntitySyncMetadata(
        synced: true,
        origin: SyncOrigin.server,
        updatedAt: DateTime.now(),
      );
      _notifyEntity(type, id);
    });
  }

  /// Restore an exact sync-metadata value after optimistic rollback.
  void setEntitySyncMetadata(
    String type,
    String id,
    EntitySyncMetadata metadata,
  ) {
    _write(() {
      _syncMetadata[_ek(type, id)] = metadata;
      _notifyEntity(type, id);
    });
  }

  // ─── Entity state API ────────────────────────────────────────────────────

  void setEntityFetching(String type, String id, {required bool fetching}) {
    _write(() {
      final k = _ek(type, id);
      _entityStates[k] = (_entityStates[k] ?? const EntityState()).copyWith(
        isFetching: fetching,
      );
      _notifyEntity(type, id);
    });
  }

  void setEntityError(String type, String id, String? error) {
    _write(() {
      final k = _ek(type, id);
      _entityStates[k] = (_entityStates[k] ?? const EntityState()).copyWith(
        isFetching: false,
        error: error,
        clearError: error == null,
      );
      _notifyEntity(type, id);
    });
  }

  void setEntityFetched(String type, String id) {
    _write(() {
      final k = _ek(type, id);
      _entityStates[k] = (_entityStates[k] ?? const EntityState()).copyWith(
        lastFetched: DateTime.now(),
        isFetching: false,
        stale: false,
        clearError: true,
      );
      _syncMetadata[k] = (_syncMetadata[k] ?? const EntitySyncMetadata())
          .copyWith(
            synced: true,
            origin: SyncOrigin.server,
            updatedAt: DateTime.now(),
          );
      _notifyEntity(type, id);
    });
  }

  void setEntityStale(String type, String id, {required bool stale}) {
    _write(() {
      final k = _ek(type, id);
      _entityStates[k] = (_entityStates[k] ?? const EntityState()).copyWith(
        stale: stale,
      );
      _notifyEntity(type, id);
    });
  }

  // ─── List write API ──────────────────────────────────────────────────────

  void setListResult(
    String queryKey,
    List<String> ids, {
    String? entityType,
    int? total,
    String? nextCursor,
    String? prevCursor,
    bool hasNextPage = false,
    bool hasPrevPage = false,
  }) {
    _write(() {
      if (entityType != null) _listTypes[queryKey] = entityType;
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
        clearTotal: total == null,
        clearNextCursor: nextCursor == null,
        clearPrevCursor: prevCursor == null,
      );
      _notifyList(queryKey);
    });
  }

  void appendListResult(
    String queryKey,
    List<String> ids, {
    String? entityType,
    int? total,
    String? nextCursor,
    bool hasNextPage = false,
  }) {
    _write(() {
      if (entityType != null) _listTypes[queryKey] = entityType;
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
    });
  }

  void setListFetching(String queryKey, {required bool fetching}) {
    _write(() {
      _lists[queryKey] = (_lists[queryKey] ?? ListState.empty).copyWith(
        isFetching: fetching,
      );
      _notifyList(queryKey);
    });
  }

  void setListFetchingMore(String queryKey, {required bool fetchingMore}) {
    _write(() {
      _lists[queryKey] = (_lists[queryKey] ?? ListState.empty).copyWith(
        isFetchingMore: fetchingMore,
      );
      _notifyList(queryKey);
    });
  }

  void setListError(String queryKey, String? error) {
    _write(() {
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
    });
  }

  void setListStale(String queryKey, {required bool stale}) {
    _write(() {
      _lists[queryKey] = (_lists[queryKey] ?? ListState.empty).copyWith(
        stale: stale,
      );
      _notifyList(queryKey);
    });
  }

  void removeIdFromAllLists(String type, String id) {
    _write(() {
      for (final key in _lists.keys) {
        final knownType = _listTypes[key];
        if (knownType != null && knownType != type) continue;
        final list = _lists[key]!;
        if (list.ids.contains(id)) {
          final newIds = list.ids.where((e) => e != id).toList();
          _lists[key] = list.copyWith(
            ids: List.unmodifiable(newIds),
            total: list.total != null ? list.total! - 1 : null,
          );
          _notifyList(key);
        }
      }
    });
  }

  void insertIdInList(
    String queryKey,
    String id,
    Object position, {
    String? entityType,
  }) {
    _write(() {
      final prev = _lists[queryKey] ?? ListState.empty;
      if (entityType != null) _listTypes[queryKey] = entityType;
      final isNew = !prev.ids.contains(id);
      final ids = prev.ids.where((e) => e != id).toList();
      if (position == 'start') {
        ids.insert(0, id);
      } else if (position == 'end') {
        ids.add(id);
      } else if (position is int) {
        ids.insert(position.clamp(0, ids.length), id);
      }
      _lists[queryKey] = prev.copyWith(
        ids: List.unmodifiable(ids),
        total: isNew && prev.total != null ? prev.total! + 1 : prev.total,
      );
      _notifyList(queryKey);
    });
  }

  // ─── Invalidation ─────────────────────────────────────────────────────────

  void invalidateEntity(String type, {String? id}) {
    _write(() {
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
        _notifyEntity(type, '*');
      }
    });
  }

  void invalidateLists(String prefix) {
    _write(() {
      for (final key in _lists.keys) {
        if (key.startsWith(prefix)) {
          _lists[key] = _lists[key]!.copyWith(stale: true);
          _notifyList(key);
        }
      }
    });
  }

  /// Mark every list registered for [type] stale.
  ///
  /// Older untyped list keys retain prefix behavior for backwards
  /// compatibility, while provider-created lists use the explicit type map.
  void invalidateListsForType(String type) {
    _write(() {
      for (final key in _lists.keys) {
        final knownType = _listTypes[key];
        if (knownType == type || (knownType == null && key.startsWith(type))) {
          _lists[key] = _lists[key]!.copyWith(stale: true);
          _notifyList(key);
        }
      }
    });
  }

  void invalidateType(String type) {
    _write(() {
      invalidateEntity(type);
      invalidateListsForType(type);
    });
  }

  // ─── Test / DevTools helpers ──────────────────────────────────────────────

  /// Reset the entire graph state. Intended for tests only.
  void reset() {
    _write(() {
      _entities.clear();
      _patches.clear();
      _entityStates.clear();
      _syncMetadata.clear();
      _lists.clear();
      _listTypes.clear();
      _notifyReset();
    });
  }

  /// Dispose the change stream. Call when the graph is no longer needed.
  Future<void> dispose() {
    _publicationListeners.clear();
    _viewLifecycleListeners.clear();
    _views.clear();
    return _changeController.close();
  }
}
