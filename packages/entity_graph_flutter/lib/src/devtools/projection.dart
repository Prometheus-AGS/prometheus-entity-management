part of 'controller.dart';

extension _FirstOrNull<E> on Iterable<E> {
  E? get firstOrNull {
    final iterator = this.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }
}

String _entityIdentityKey(String type, String id) => jsonEncode([type, id]);

String _wireEntityKey(String type, String id) => '$type:$id';

List<String> _orderedKeys(Iterable<String> left, Iterable<String> right) {
  final keys = <String>{...left, ...right}.toList()..sort();
  return keys;
}

bool _sameValue(Object? left, Object? right) {
  if (identical(left, right)) return true;
  if (left is Map && right is Map) {
    if (left.length != right.length) return false;
    for (final entry in left.entries) {
      if (!right.containsKey(entry.key) ||
          !_sameValue(entry.value, right[entry.key])) {
        return false;
      }
    }
    return true;
  }
  if (left is Iterable && right is Iterable) {
    final leftValues = left.toList(growable: false);
    final rightValues = right.toList(growable: false);
    if (leftValues.length != rightValues.length) return false;
    for (var index = 0; index < leftValues.length; index += 1) {
      if (!_sameValue(leftValues[index], rightValues[index])) return false;
    }
    return true;
  }
  if (left is EntityState && right is EntityState) {
    return left.isFetching == right.isFetching &&
        left.lastFetched == right.lastFetched &&
        left.error == right.error &&
        left.stale == right.stale;
  }
  if (left is EntitySyncMetadata && right is EntitySyncMetadata) {
    return left.synced == right.synced &&
        left.origin == right.origin &&
        left.updatedAt == right.updatedAt;
  }
  if (left is ListState && right is ListState) {
    return _sameValue(left.ids, right.ids) &&
        left.total == right.total &&
        left.nextCursor == right.nextCursor &&
        left.prevCursor == right.prevCursor &&
        left.hasNextPage == right.hasNextPage &&
        left.hasPrevPage == right.hasPrevPage &&
        left.isFetching == right.isFetching &&
        left.isFetchingMore == right.isFetchingMore &&
        left.error == right.error &&
        left.lastFetched == right.lastFetched &&
        left.stale == right.stale;
  }
  return left == right;
}

Map<String, Object?> _entityStateJson(EntityState state) => {
  'isFetching': state.isFetching,
  'lastFetched': state.lastFetched?.millisecondsSinceEpoch,
  'error': state.error,
  'stale': state.stale,
};

Map<String, Object?> _syncMetadataJson(EntitySyncMetadata metadata) => {
  'synced': metadata.synced,
  'origin': metadata.origin.name,
  'updatedAt': metadata.updatedAt?.millisecondsSinceEpoch,
};

Map<String, Object?> _listStateJson(ListState state) => {
  'ids': state.ids,
  'total': state.total,
  'nextCursor': state.nextCursor,
  'prevCursor': state.prevCursor,
  'hasNextPage': state.hasNextPage,
  'hasPrevPage': state.hasPrevPage,
  'isFetching': state.isFetching,
  'isFetchingMore': state.isFetchingMore,
  'error': state.error,
  'lastFetched': state.lastFetched?.millisecondsSinceEpoch,
  'stale': state.stale,
};

Object? _transportValue(Object? value) {
  if (value == null || value is String || value is bool) {
    return value;
  }
  if (value is double && !value.isFinite) return '$value';
  if (value is num) return value;
  if (value is BigInt) return {'\$type': 'bigint', 'value': '$value'};
  if (value is DateTime) {
    return {'\$type': 'date', 'value': value.toUtc().toIso8601String()};
  }
  if (value is Map) {
    return {
      for (final entry in value.entries)
        '${entry.key}': _transportValue(entry.value),
    };
  }
  if (value is Iterable) {
    return value.map(_transportValue).toList(growable: false);
  }
  return '$value';
}

EntityGraphDevtoolsChange _changeWithValues({
  required EntityGraphDevtoolsController controller,
  required EntityGraphDevtoolsChangeCategory category,
  required EntityGraphDevtoolsChangeAction action,
  required String key,
  required Object? before,
  required Object? after,
  String? id,
  int? beforeCount,
  int? afterCount,
}) {
  final policy = controller.valuePolicy;
  if (!policy.includesValues) {
    return EntityGraphDevtoolsChange(
      category: category,
      action: action,
      key: key,
      id: id,
      beforeCount: beforeCount,
      afterCount: afterCount,
      valueState: EntityGraphDevtoolsValueState.hiddenByPolicy,
    );
  }

  var failed = false;
  Object? project(Object? value, EntityGraphDevtoolsValueSide side) {
    try {
      final redacted = policy.redact?.call(
        value,
        EntityGraphDevtoolsValueContext(
          storeId: controller.storeId,
          category: category,
          key: key,
          id: id,
          fieldPath: const [],
          side: side,
          destination: EntityGraphDevtoolsValueDestination.history,
        ),
      );
      return _transportValue(policy.redact == null ? value : redacted);
    } on Object {
      failed = true;
      return {'\$type': 'redaction-error'};
    }
  }

  final projectedBefore = before == null
      ? null
      : project(before, EntityGraphDevtoolsValueSide.before);
  final projectedAfter = after == null
      ? null
      : project(after, EntityGraphDevtoolsValueSide.after);
  return EntityGraphDevtoolsChange(
    category: category,
    action: action,
    key: key,
    id: id,
    beforeCount: beforeCount,
    afterCount: afterCount,
    valueState: failed
        ? EntityGraphDevtoolsValueState.redactionError
        : policy.redact == null
        ? EntityGraphDevtoolsValueState.included
        : EntityGraphDevtoolsValueState.redacted,
    before: projectedBefore,
    after: projectedAfter,
  );
}

EntityGraphDevtoolsChangeAction _changeAction(Object? before, Object? after) {
  if (before == null) return EntityGraphDevtoolsChangeAction.added;
  if (after == null) return EntityGraphDevtoolsChangeAction.removed;
  return EntityGraphDevtoolsChangeAction.updated;
}

List<EntityGraphDevtoolsChange> _projectChanges(
  EntityGraphDevtoolsController controller,
  EntityGraphSnapshot before,
  EntityGraphSnapshot after,
) {
  final changes = <EntityGraphDevtoolsChange>[];

  void nested(
    EntityGraphDevtoolsChangeCategory category,
    Map<String, Map<String, Map<String, Object?>>> previous,
    Map<String, Map<String, Map<String, Object?>>> current,
  ) {
    for (final type in _orderedKeys(previous.keys, current.keys)) {
      final beforeBucket = previous[type] ?? const {};
      final afterBucket = current[type] ?? const {};
      for (final id in _orderedKeys(beforeBucket.keys, afterBucket.keys)) {
        final beforeValue = beforeBucket[id];
        final afterValue = afterBucket[id];
        if (_sameValue(beforeValue, afterValue)) continue;
        changes.add(
          _changeWithValues(
            controller: controller,
            category: category,
            action: _changeAction(beforeValue, afterValue),
            key: type,
            id: id,
            before: beforeValue,
            after: afterValue,
          ),
        );
      }
    }
  }

  nested(
    EntityGraphDevtoolsChangeCategory.entity,
    before.entities,
    after.entities,
  );
  nested(
    EntityGraphDevtoolsChangeCategory.patch,
    before.patches,
    after.patches,
  );

  for (final key in _orderedKeys(
    before.entityStates.keys,
    after.entityStates.keys,
  )) {
    final previous = before.entityStates[key];
    final current = after.entityStates[key];
    if (_sameValue(previous, current)) continue;
    changes.add(
      _changeWithValues(
        controller: controller,
        category: EntityGraphDevtoolsChangeCategory.entityState,
        action: _changeAction(previous, current),
        key: key,
        before: previous == null ? null : _entityStateJson(previous),
        after: current == null ? null : _entityStateJson(current),
      ),
    );
  }

  for (final key in _orderedKeys(
    before.syncMetadata.keys,
    after.syncMetadata.keys,
  )) {
    final previous = before.syncMetadata[key];
    final current = after.syncMetadata[key];
    if (_sameValue(previous, current)) continue;
    changes.add(
      _changeWithValues(
        controller: controller,
        category: EntityGraphDevtoolsChangeCategory.sync,
        action: _changeAction(previous, current),
        key: key,
        before: previous == null ? null : _syncMetadataJson(previous),
        after: current == null ? null : _syncMetadataJson(current),
      ),
    );
  }

  for (final key in _orderedKeys(before.lists.keys, after.lists.keys)) {
    final previous = before.lists[key];
    final current = after.lists[key];
    if (_sameValue(previous, current)) continue;
    changes.add(
      _changeWithValues(
        controller: controller,
        category: EntityGraphDevtoolsChangeCategory.list,
        action: _changeAction(previous, current),
        key: key,
        beforeCount: previous?.ids.length ?? 0,
        afterCount: current?.ids.length ?? 0,
        before: previous == null ? null : _listStateJson(previous),
        after: current == null ? null : _listStateJson(current),
      ),
    );
  }
  return changes;
}

EntityGraphDevtoolsCounts _collectCounts(EntityGraphSnapshot snapshot) {
  var entityTypes = 0;
  var entities = 0;
  for (final bucket in snapshot.entities.values) {
    if (bucket.isNotEmpty) entityTypes += 1;
    entities += bucket.length;
  }
  var patchedEntities = 0;
  for (final bucket in snapshot.patches.values) {
    patchedEntities += bucket.values.where((patch) => patch.isNotEmpty).length;
  }
  var listMemberships = 0;
  var fetching = 0;
  var stale = 0;
  var errors = 0;
  for (final list in snapshot.lists.values) {
    listMemberships += list.ids.length;
    if (list.isFetching || list.isFetchingMore) fetching += 1;
    if (list.stale) stale += 1;
    if (list.error != null) errors += 1;
  }
  for (final state in snapshot.entityStates.values) {
    if (state.isFetching) fetching += 1;
    if (state.stale) stale += 1;
    if (state.error != null) errors += 1;
  }
  return EntityGraphDevtoolsCounts(
    entityTypes: entityTypes,
    entities: entities,
    patchedEntities: patchedEntities,
    entityStates: snapshot.entityStates.length,
    syncMetadata: snapshot.syncMetadata.length,
    lists: snapshot.lists.length,
    listMemberships: listMemberships,
    fetching: fetching,
    stale: stale,
    errors: errors,
  );
}

List<GraphEntityIdentity> _identitiesForStateKey(
  EntityGraphSnapshot snapshot,
  String key,
) {
  final matches = <GraphEntityIdentity>[];
  final types = <String>{...snapshot.entities.keys, ...snapshot.patches.keys};
  for (final type in types) {
    final ids = <String>{
      ...?snapshot.entities[type]?.keys,
      ...?snapshot.patches[type]?.keys,
    };
    for (final id in ids) {
      if (_wireEntityKey(type, id) == key) {
        matches.add(GraphEntityIdentity(type: type, id: id));
      }
    }
  }
  if (matches.isNotEmpty) return matches;
  final separator = key.indexOf(':');
  if (separator < 1 || separator == key.length - 1) return const [];
  return [
    GraphEntityIdentity(
      type: key.substring(0, separator),
      id: key.substring(separator + 1),
    ),
  ];
}

void _advanceEntityRevisions(
  EntityGraphDevtoolsController controller,
  List<EntityGraphDevtoolsChange> changes,
  EntityGraphSnapshot current,
) {
  final touched = <String>{};
  final valueTouched = <String>{};
  for (final change in changes) {
    if ((change.category == EntityGraphDevtoolsChangeCategory.entity ||
            change.category == EntityGraphDevtoolsChangeCategory.patch) &&
        change.id != null) {
      final key = _entityIdentityKey(change.key, change.id!);
      touched.add(key);
      valueTouched.add(key);
    } else if (change.category ==
            EntityGraphDevtoolsChangeCategory.entityState ||
        change.category == EntityGraphDevtoolsChangeCategory.sync) {
      for (final identity in _identitiesForStateKey(current, change.key)) {
        touched.add(_entityIdentityKey(identity.type, identity.id));
      }
    }
  }
  for (final key in touched) {
    controller._entityRevisions[key] =
        (controller._entityRevisions[key] ?? 0) + 1;
  }
  for (final key in valueTouched) {
    controller._entityValueRevisions[key] =
        (controller._entityValueRevisions[key] ?? 0) + 1;
  }
}

Object? _projectInspectionValue(
  EntityGraphDevtoolsController controller,
  Object? value, {
  required EntityGraphDevtoolsChangeCategory category,
  required String key,
  required String? id,
}) {
  if (!controller.valuePolicy.includesValues) {
    return {'\$type': 'hidden-by-policy'};
  }
  try {
    final redacted = controller.valuePolicy.redact?.call(
      value,
      EntityGraphDevtoolsValueContext(
        storeId: controller.storeId,
        category: category,
        key: key,
        id: id,
        fieldPath: const [],
        side: EntityGraphDevtoolsValueSide.after,
        destination: EntityGraphDevtoolsValueDestination.inspection,
      ),
    );
    return _transportValue(
      controller.valuePolicy.redact == null ? value : redacted,
    );
  } on Object {
    return {'\$type': 'redaction-error'};
  }
}

Map<String, List<String>> _viewIdsByEntity(EntityGraph graph) {
  final result = <String, List<String>>{};
  for (final view in graph.viewRecords) {
    for (final entity in view.membership) {
      final ids = result.putIfAbsent(
        _entityIdentityKey(entity.type, entity.id),
        () => [],
      );
      ids.add(view.definition.viewId);
    }
  }
  for (final viewIds in result.values) {
    viewIds.sort();
  }
  return result;
}

List<GraphEntityIdentity> _allEntityIdentities(
  EntityGraphSnapshot snapshot, [
  Iterable<GraphEntityIdentity> additional = const [],
]) {
  final identities = <String, GraphEntityIdentity>{};
  for (final type in snapshot.entities.entries) {
    for (final id in type.value.keys) {
      identities[_entityIdentityKey(type.key, id)] = GraphEntityIdentity(
        type: type.key,
        id: id,
      );
    }
  }
  for (final type in snapshot.patches.entries) {
    for (final id in type.value.keys) {
      identities[_entityIdentityKey(type.key, id)] = GraphEntityIdentity(
        type: type.key,
        id: id,
      );
    }
  }
  for (final key in <String>{
    ...snapshot.entityStates.keys,
    ...snapshot.syncMetadata.keys,
  }) {
    for (final identity in _identitiesForStateKey(snapshot, key)) {
      identities[_entityIdentityKey(identity.type, identity.id)] = identity;
    }
  }
  for (final identity in additional) {
    identities[_entityIdentityKey(identity.type, identity.id)] = identity;
  }
  final ordered = identities.values.toList()
    ..sort((left, right) {
      final type = left.type.compareTo(right.type);
      return type == 0 ? left.id.compareTo(right.id) : type;
    });
  return ordered;
}

EntityGraphDevtoolsEntityRecordsSnapshot _projectEntityRecords(
  EntityGraphDevtoolsController controller,
) {
  final snapshot = controller._graph.captureSnapshot();
  final viewIds = _viewIdsByEntity(controller._graph);
  final records = <EntityGraphDevtoolsEntityRecord>[];
  for (final identity in _allEntityIdentities(snapshot)) {
    final type = identity.type;
    final id = identity.id;
    final wireKey = _wireEntityKey(type, id);
    final identityKey = _entityIdentityKey(type, id);
    final canonical = snapshot.entities[type]?[id];
    final storedPatch = snapshot.patches[type]?[id];
    final patch = storedPatch == null || storedPatch.isEmpty
        ? null
        : storedPatch;
    final state = snapshot.entityStates[wireKey] ?? const EntityState();
    final sync = snapshot.syncMetadata[wireKey] ?? const EntitySyncMetadata();
    final dirtyReasons = <EntityGraphDevtoolsEntityDirtyReason>[];
    final patchFields = <String>[...?patch?.keys]..sort();
    for (final field in patchFields) {
      dirtyReasons.add(
        EntityGraphDevtoolsEntityDirtyReason(
          kind: EntityGraphDevtoolsDirtyReasonKind.localPatch,
          field: field,
          change: canonical?.containsKey(field) == true
              ? EntityGraphDevtoolsDirtyChange.changed
              : EntityGraphDevtoolsDirtyChange.added,
        ),
      );
    }
    if (!sync.synced) {
      dirtyReasons.add(
        const EntityGraphDevtoolsEntityDirtyReason(
          kind: EntityGraphDevtoolsDirtyReasonKind.syncState,
          field: null,
          change: EntityGraphDevtoolsDirtyChange.unsynced,
        ),
      );
    }
    records.add(
      EntityGraphDevtoolsEntityRecord(
        key: wireKey,
        type: type,
        id: id,
        presence: canonical == null
            ? EntityGraphDevtoolsEntityPresence.missingCanonical
            : EntityGraphDevtoolsEntityPresence.present,
        canonical: canonical == null
            ? null
            : _projectInspectionValue(
                controller,
                canonical,
                category: EntityGraphDevtoolsChangeCategory.entity,
                key: type,
                id: id,
              ),
        patch: patch == null
            ? null
            : _projectInspectionValue(
                controller,
                patch,
                category: EntityGraphDevtoolsChangeCategory.patch,
                key: type,
                id: id,
              ),
        merged: canonical == null
            ? null
            : _projectInspectionValue(
                controller,
                {...canonical, ...?patch},
                category: EntityGraphDevtoolsChangeCategory.entity,
                key: type,
                id: id,
              ),
        dirty: dirtyReasons.isNotEmpty,
        dirtyReasons: dirtyReasons,
        entityState: EntityGraphDevtoolsEntityState(
          isFetching: state.isFetching,
          lastFetchedAt: state.lastFetched?.toUtc().toIso8601String(),
          stale: state.stale,
          error: state.error == null
              ? null
              : EntityGraphDevtoolsEntityError(
                  message: state.error!,
                  retryable: null,
                ),
        ),
        sync: EntityGraphDevtoolsSyncState(
          synced: sync.synced,
          origin: switch (sync.origin) {
            SyncOrigin.server => EntityGraphDevtoolsSyncOrigin.server,
            SyncOrigin.client => EntityGraphDevtoolsSyncOrigin.client,
            SyncOrigin.optimistic => EntityGraphDevtoolsSyncOrigin.optimistic,
          },
          updatedAt: sync.updatedAt?.toUtc().toIso8601String(),
        ),
        revision: controller._entityRevisions[identityKey] ?? 0,
        viewIds: viewIds[identityKey] ?? const [],
      ),
    );
  }
  return EntityGraphDevtoolsEntityRecordsSnapshot(
    storeId: controller.storeId,
    capturedAt: DateTime.now().toUtc().toIso8601String(),
    entityRecords: records,
  );
}

EntityGraphDevtoolsViewsSnapshot _projectViews(
  EntityGraphDevtoolsController controller,
) {
  final snapshot = controller._graph.captureSnapshot();
  final views = controller._graph.viewRecords.toList()
    ..sort(
      (left, right) =>
          left.definition.viewId.compareTo(right.definition.viewId),
    );
  final projected = views
      .map((record) {
        final definition = record.definition;
        final list = definition.queryKey == null
            ? ListState.empty
            : snapshot.lists[definition.queryKey] ?? ListState.empty;
        return EntityGraphDevtoolsViewRecord(
          definition: EntityGraphDevtoolsViewDefinition(
            viewId: definition.viewId,
            label: definition.label,
            kind: definition.kind == GraphViewKind.list
                ? EntityGraphDevtoolsViewKind.list
                : EntityGraphDevtoolsViewKind.entity,
            entityType: definition.entityType,
            queryKey: definition.queryKey,
          ),
          registeredAt: record.registeredAt.toUtc().toIso8601String(),
          lastRenderedAt: record.lastRenderedAt?.toUtc().toIso8601String(),
          renderCount: record.renderCount,
          subscriberCount: record.subscriberCount,
          membership: record.membership.map(
            (entity) => EntityGraphDevtoolsViewMembership(
              type: entity.type,
              id: entity.id,
            ),
          ),
          list: definition.kind == GraphViewKind.list
              ? EntityGraphDevtoolsViewListStats(
                  visibleCount: record.membership.length,
                  graphCount: list.ids.length,
                  total: list.total,
                  isFetching: list.isFetching,
                  isFetchingMore: list.isFetchingMore,
                  stale: list.stale,
                  hasNextPage: list.hasNextPage,
                  hasPreviousPage: list.hasPrevPage,
                )
              : null,
        );
      })
      .toList(growable: false);
  final viewIds = _viewIdsByEntity(controller._graph);
  final additional = views.expand((view) => view.membership);
  return EntityGraphDevtoolsViewsSnapshot(
    storeId: controller.storeId,
    capturedAt: DateTime.now().toUtc().toIso8601String(),
    views: projected,
    entityViewMembership: _allEntityIdentities(snapshot, additional).map(
      (entity) => EntityGraphDevtoolsEntityViewMembership(
        entity: EntityGraphDevtoolsViewMembership(
          type: entity.type,
          id: entity.id,
        ),
        viewIds:
            viewIds[_entityIdentityKey(entity.type, entity.id)] ?? const [],
      ),
    ),
  );
}

Map<String, Object?>? _mergedEntity(
  EntityGraphSnapshot snapshot,
  String type,
  String id,
) {
  final canonical = snapshot.entities[type]?[id];
  if (canonical == null) return null;
  return {...canonical, ...?snapshot.patches[type]?[id]};
}

EntityGraphDevtoolsRelationship _relationship({
  required EntityGraphSnapshot snapshot,
  required IrRelation relation,
  required EntityGraphDevtoolsRelationshipDirection direction,
  required String sourceType,
  required String sourceId,
  required String? sourceField,
  required String targetType,
  required String targetId,
}) => EntityGraphDevtoolsRelationship(
  relation: relation.name,
  cardinality: switch (relation.type) {
    SdlRelationKind.belongsTo =>
      EntityGraphDevtoolsRelationshipCardinality.belongsTo,
    SdlRelationKind.hasMany =>
      EntityGraphDevtoolsRelationshipCardinality.hasMany,
    SdlRelationKind.manyToMany =>
      EntityGraphDevtoolsRelationshipCardinality.manyToMany,
  },
  direction: direction,
  source: EntityGraphDevtoolsRelationshipEndpoint(
    type: sourceType,
    id: sourceId,
    field: sourceField,
  ),
  target: EntityGraphDevtoolsRelationshipEndpoint(
    type: targetType,
    id: targetId,
  ),
  status: snapshot.entities[targetType]?[targetId] == null
      ? EntityGraphDevtoolsRelationshipStatus.missingTarget
      : EntityGraphDevtoolsRelationshipStatus.resolved,
);

EntityGraphDevtoolsRelationshipsSnapshot _projectRelationships(
  EntityGraphDevtoolsController controller,
) {
  final snapshot = controller._graph.captureSnapshot();
  final relationships = <EntityGraphDevtoolsRelationship>[];
  final schema = controller.schema;
  if (schema != null) {
    final entitiesByName = {
      for (final entity in schema.entities) entity.name: entity,
    };
    for (final entity in schema.entities) {
      for (final relation in entity.relations) {
        switch (relation.type) {
          case SdlRelationKind.belongsTo:
            final foreignKey = relation.foreignKey;
            if (foreignKey == null) continue;
            for (final id
                in snapshot.entities[entity.name]?.keys ?? const <String>[]) {
              final targetId = _mergedEntity(
                snapshot,
                entity.name,
                id,
              )?[foreignKey];
              if (targetId is! String || targetId.isEmpty) continue;
              relationships.add(
                _relationship(
                  snapshot: snapshot,
                  relation: relation,
                  direction: EntityGraphDevtoolsRelationshipDirection.outgoing,
                  sourceType: entity.name,
                  sourceId: id,
                  sourceField: foreignKey,
                  targetType: relation.target,
                  targetId: targetId,
                ),
              );
            }
          case SdlRelationKind.hasMany:
            final foreignKey = relation.foreignKey;
            if (foreignKey == null) continue;
            for (final parentId
                in snapshot.entities[entity.name]?.keys ?? const <String>[]) {
              for (final childId
                  in snapshot.entities[relation.target]?.keys ??
                      const <String>[]) {
                final child = _mergedEntity(snapshot, relation.target, childId);
                if (child?[foreignKey] != parentId) continue;
                relationships.add(
                  _relationship(
                    snapshot: snapshot,
                    relation: relation,
                    direction: EntityGraphDevtoolsRelationshipDirection.reverse,
                    sourceType: entity.name,
                    sourceId: parentId,
                    sourceField: null,
                    targetType: relation.target,
                    targetId: childId,
                  ),
                );
              }
            }
          case SdlRelationKind.manyToMany:
            final through = relation.through == null
                ? null
                : entitiesByName[relation.through];
            if (through != null) {
              final sourceRelation = through.relations
                  .where(
                    (candidate) =>
                        candidate.type == SdlRelationKind.belongsTo &&
                        candidate.target == entity.name &&
                        candidate.foreignKey != null,
                  )
                  .firstOrNull;
              final targetRelation = through.relations
                  .where(
                    (candidate) =>
                        candidate.type == SdlRelationKind.belongsTo &&
                        candidate.target == relation.target &&
                        candidate.foreignKey != null,
                  )
                  .firstOrNull;
              if (sourceRelation == null || targetRelation == null) continue;
              for (final joinId
                  in snapshot.entities[through.name]?.keys ??
                      const <String>[]) {
                final join = _mergedEntity(snapshot, through.name, joinId);
                final sourceId = join?[sourceRelation.foreignKey];
                final targetId = join?[targetRelation.foreignKey];
                if (sourceId is! String || targetId is! String) continue;
                relationships.add(
                  _relationship(
                    snapshot: snapshot,
                    relation: relation,
                    direction:
                        EntityGraphDevtoolsRelationshipDirection.outgoing,
                    sourceType: entity.name,
                    sourceId: sourceId,
                    sourceField: null,
                    targetType: relation.target,
                    targetId: targetId,
                  ),
                );
              }
            } else {
              final field = relation.foreignKey;
              if (field == null) continue;
              for (final id
                  in snapshot.entities[entity.name]?.keys ?? const <String>[]) {
                final targetIds = _mergedEntity(
                  snapshot,
                  entity.name,
                  id,
                )?[field];
                if (targetIds is! Iterable) continue;
                for (final targetId in targetIds.whereType<String>().toSet()) {
                  relationships.add(
                    _relationship(
                      snapshot: snapshot,
                      relation: relation,
                      direction:
                          EntityGraphDevtoolsRelationshipDirection.outgoing,
                      sourceType: entity.name,
                      sourceId: id,
                      sourceField: field,
                      targetType: relation.target,
                      targetId: targetId,
                    ),
                  );
                }
              }
            }
        }
      }
    }
  }
  relationships.sort((left, right) {
    final leftKey =
        '${left.source.type}\u0000${left.source.id}\u0000'
        '${left.relation}\u0000${left.direction.wireName}\u0000'
        '${left.target.type}\u0000${left.target.id}';
    final rightKey =
        '${right.source.type}\u0000${right.source.id}\u0000'
        '${right.relation}\u0000${right.direction.wireName}\u0000'
        '${right.target.type}\u0000${right.target.id}';
    return leftKey.compareTo(rightKey);
  });
  return EntityGraphDevtoolsRelationshipsSnapshot(
    storeId: controller.storeId,
    capturedAt: DateTime.now().toUtc().toIso8601String(),
    relationships: relationships,
  );
}

({
  List<EntityGraphDevtoolsViewMembership> affectedEntities,
  List<String> affectedViewIds,
})
_affectedProjection(
  EntityGraphDevtoolsController controller,
  List<EntityGraphDevtoolsChange> changes,
  EntityGraphSnapshot before,
  EntityGraphSnapshot after,
) {
  final identities = <String, EntityGraphDevtoolsViewMembership>{};
  final changedListKeys = <String>{};
  for (final change in changes) {
    if ((change.category == EntityGraphDevtoolsChangeCategory.entity ||
            change.category == EntityGraphDevtoolsChangeCategory.patch) &&
        change.id != null) {
      identities[_entityIdentityKey(change.key, change.id!)] =
          EntityGraphDevtoolsViewMembership(type: change.key, id: change.id!);
    } else if (change.category ==
            EntityGraphDevtoolsChangeCategory.entityState ||
        change.category == EntityGraphDevtoolsChangeCategory.sync) {
      for (final identity in <GraphEntityIdentity>[
        ..._identitiesForStateKey(before, change.key),
        ..._identitiesForStateKey(after, change.key),
      ]) {
        identities[_entityIdentityKey(
          identity.type,
          identity.id,
        )] = EntityGraphDevtoolsViewMembership(
          type: identity.type,
          id: identity.id,
        );
      }
    } else if (change.category == EntityGraphDevtoolsChangeCategory.list) {
      changedListKeys.add(change.key);
    }
  }

  final affectedViewIds = <String>{};
  for (final view in controller._graph.viewRecords) {
    final queryKey = view.definition.queryKey;
    if (queryKey != null && changedListKeys.contains(queryKey)) {
      affectedViewIds.add(view.definition.viewId);
      final previousIds = before.lists[queryKey]?.ids ?? const <String>[];
      final currentIds = after.lists[queryKey]?.ids ?? const <String>[];
      final previousPositions = {
        for (var index = 0; index < previousIds.length; index += 1)
          previousIds[index]: index,
      };
      final currentPositions = {
        for (var index = 0; index < currentIds.length; index += 1)
          currentIds[index]: index,
      };
      for (final id in <String>{...previousIds, ...currentIds}) {
        if (previousPositions[id] == currentPositions[id]) continue;
        identities[_entityIdentityKey(
          view.definition.entityType,
          id,
        )] = EntityGraphDevtoolsViewMembership(
          type: view.definition.entityType,
          id: id,
        );
      }
    }
    if (view.membership.any(
      (member) =>
          identities.containsKey(_entityIdentityKey(member.type, member.id)),
    )) {
      affectedViewIds.add(view.definition.viewId);
    }
  }
  final viewIds = affectedViewIds.toList()..sort();
  return (
    affectedEntities: identities.values.toList(),
    affectedViewIds: viewIds,
  );
}
