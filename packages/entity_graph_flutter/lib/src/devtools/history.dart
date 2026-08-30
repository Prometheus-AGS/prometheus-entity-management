part of 'controller.dart';

final class _RetainedGraphSnapshot {
  const _RetainedGraphSnapshot({required this.reference, required this.data});

  final EntityGraphDevtoolsRetainedSnapshotReference reference;
  final EntityGraphSnapshot data;
}

final class _ImportedGraphSnapshot {
  const _ImportedGraphSnapshot({
    required this.cursor,
    required this.capturedAt,
    required this.eventSequence,
    required this.bytes,
    required this.data,
  });

  final int cursor;
  final String capturedAt;
  final int? eventSequence;
  final int bytes;
  final EntityGraphSnapshot data;
}

final class _ImportedGraphCandidate {
  const _ImportedGraphCandidate({
    required this.candidateId,
    required this.bytes,
    required this.snapshots,
  });

  final String candidateId;
  final int bytes;
  final List<_ImportedGraphSnapshot> snapshots;
}

int _boundedLimit(int? value, int fallback, [int minimum = 0]) {
  final resolved = value ?? fallback;
  return resolved < minimum ? minimum : resolved;
}

int _encodedBytes(Object? value) => utf8.encode(jsonEncode(value)).length;

Map<String, Object?> _snapshotDataJson(EntityGraphSnapshot snapshot) => {
  'entities': _transportValue(snapshot.entities),
  'patches': _transportValue(snapshot.patches),
  'entityStates': {
    for (final entry in snapshot.entityStates.entries)
      entry.key: _entityStateJson(entry.value),
  },
  'syncMetadata': {
    for (final entry in snapshot.syncMetadata.entries)
      entry.key: _syncMetadataJson(entry.value),
  },
  'lists': {
    for (final entry in snapshot.lists.entries)
      entry.key: _listStateJson(entry.value),
  },
};

EntityGraphDevtoolsSnapshotReference _captureGraphSnapshot(
  EntityGraphDevtoolsController controller,
  EntityGraphSnapshot snapshot,
  int? eventSequence,
) {
  controller._importCandidate = null;
  final cursor = ++controller._latestSnapshotCursor;
  final capturedAt = DateTime.now().toUtc().toIso8601String();
  controller._baselineSnapshotCursor ??= cursor;
  if (!controller.timeTravelEnabled) {
    return _unavailableSnapshot(
      controller,
      cursor: cursor,
      capturedAt: capturedAt,
      eventSequence: eventSequence,
      reason: EntityGraphDevtoolsSnapshotUnavailableReason.retentionDisabled,
    );
  }

  late final int bytes;
  try {
    bytes = _encodedBytes(_snapshotDataJson(snapshot));
  } on Object {
    return _unavailableSnapshot(
      controller,
      cursor: cursor,
      capturedAt: capturedAt,
      eventSequence: eventSequence,
      reason: EntityGraphDevtoolsSnapshotUnavailableReason.captureFailed,
    );
  }
  if (bytes > controller.snapshotBytesLimit) {
    return _unavailableSnapshot(
      controller,
      cursor: cursor,
      capturedAt: capturedAt,
      eventSequence: eventSequence,
      reason: EntityGraphDevtoolsSnapshotUnavailableReason.oversize,
    );
  }

  final reference = EntityGraphDevtoolsRetainedSnapshotReference(
    cursor: cursor,
    capturedAt: capturedAt,
    eventSequence: eventSequence,
    bytes: bytes,
  );
  controller._retainedSnapshots.add(
    _RetainedGraphSnapshot(reference: reference, data: snapshot),
  );
  controller._retainedSnapshotBytes += bytes;
  while (controller._retainedSnapshots.length > controller.snapshotLimit ||
      controller._retainedSnapshotBytes > controller.snapshotBytesLimit) {
    final removed = controller._retainedSnapshots.removeAt(0);
    controller._retainedSnapshotBytes -= removed.reference.bytes;
  }
  return reference;
}

EntityGraphDevtoolsUnavailableSnapshotReference _unavailableSnapshot(
  EntityGraphDevtoolsController controller, {
  required int cursor,
  required String capturedAt,
  required int? eventSequence,
  required EntityGraphDevtoolsSnapshotUnavailableReason reason,
}) {
  final reference = EntityGraphDevtoolsUnavailableSnapshotReference(
    cursor: cursor,
    capturedAt: capturedAt,
    eventSequence: eventSequence,
    reason: reason,
  );
  controller._lastUnavailableSnapshot = reference;
  controller._unavailableSnapshots[cursor] = reference;
  while (controller._unavailableSnapshots.length >
      (controller.snapshotLimit < 1 ? 1 : controller.snapshotLimit)) {
    controller._unavailableSnapshots.remove(
      controller._unavailableSnapshots.keys.first,
    );
  }
  return reference;
}

EntityGraphDevtoolsHistoryStatus _historyStatus(
  EntityGraphDevtoolsController controller,
) => EntityGraphDevtoolsHistoryStatus(
  retainedEvents: controller._history.length,
  retainedBytes: controller._retainedEventBytes,
  eventLimit: controller.historyLimit,
  byteLimit: controller.historyBytesLimit,
  oldestSequence: controller._history.isEmpty
      ? null
      : controller._history.first.sequence,
  newestSequence: controller._history.isEmpty
      ? null
      : controller._history.last.sequence,
);

EntityGraphDevtoolsSnapshotHistoryStatus _snapshotHistoryStatus(
  EntityGraphDevtoolsController controller,
) => EntityGraphDevtoolsSnapshotHistoryStatus(
  mode: controller._historyMode,
  cursor: controller._activeSnapshotCursor,
  source: controller._activeSnapshotSource,
  retainedSnapshots: controller._retainedSnapshots.length,
  retainedBytes: controller._retainedSnapshotBytes,
  snapshotLimit: controller.snapshotLimit,
  byteLimit: controller.snapshotBytesLimit,
  baselineCursor: controller._baselineSnapshotCursor,
  oldestCursor: controller._retainedSnapshots.isEmpty
      ? null
      : controller._retainedSnapshots.first.reference.cursor,
  newestCursor: controller._retainedSnapshots.isEmpty
      ? null
      : controller._retainedSnapshots.last.reference.cursor,
  latestCursor: controller._latestSnapshotCursor == 0
      ? null
      : controller._latestSnapshotCursor,
  lastUnavailable: controller._lastUnavailableSnapshot,
  importCandidate: controller._importCandidate == null
      ? null
      : EntityGraphDevtoolsImportCandidateStatus(
          candidateId: controller._importCandidate!.candidateId,
          snapshots: controller._importCandidate!.snapshots.length,
          bytes: controller._importCandidate!.bytes,
        ),
);

EntityGraphDevtoolsMutationEvent _boundMutationEvent(
  EntityGraphDevtoolsController controller,
  EntityGraphDevtoolsMutationEvent event,
) {
  if (_encodedBytes(event.toJson()) <= controller.eventBytesLimit) {
    return event;
  }
  final valuesTruncated = event.changes.any(
    (change) =>
        change.valueState == EntityGraphDevtoolsValueState.included ||
        change.valueState == EntityGraphDevtoolsValueState.redacted,
  );
  final withoutValues = event.changes
      .map(
        (change) => EntityGraphDevtoolsChange(
          category: change.category,
          action: change.action,
          key: change.key,
          id: change.id,
          beforeCount: change.beforeCount,
          afterCount: change.afterCount,
          valueState:
              change.valueState ==
                      EntityGraphDevtoolsValueState.hiddenByPolicy ||
                  change.valueState ==
                      EntityGraphDevtoolsValueState.redactionError
              ? change.valueState
              : EntityGraphDevtoolsValueState.truncated,
        ),
      )
      .toList(growable: false);
  EntityGraphDevtoolsMutationEvent candidate(int count) =>
      EntityGraphDevtoolsMutationEvent(
        storeId: event.storeId,
        sequence: event.sequence,
        eventId: event.eventId,
        correlationId: event.correlationId,
        observedAt: event.observedAt,
        snapshot: event.snapshot,
        changes: withoutValues.take(count),
        affectedEntities: event.affectedEntities,
        affectedViewIds: event.affectedViewIds,
        before: event.before,
        after: event.after,
        projectionDurationMs: event.projectionDurationMs,
        valuesTruncated: valuesTruncated,
        changesOmitted: withoutValues.length - count,
      );
  var lower = 0;
  var upper = withoutValues.length;
  var bounded = candidate(0);
  while (lower <= upper) {
    final count = (lower + upper) ~/ 2;
    final current = candidate(count);
    if (_encodedBytes(current.toJson()) <= controller.eventBytesLimit) {
      bounded = current;
      lower = count + 1;
    } else {
      upper = count - 1;
    }
  }
  return bounded;
}

EntityGraphDevtoolsEvent _boundEvent(
  EntityGraphDevtoolsController controller,
  EntityGraphDevtoolsEvent event,
) => event is EntityGraphDevtoolsMutationEvent
    ? _boundMutationEvent(controller, event)
    : event;

void _retainEvent(
  EntityGraphDevtoolsController controller,
  EntityGraphDevtoolsEvent event,
) {
  if (controller.historyLimit == 0 || controller.historyBytesLimit == 0) {
    return;
  }
  final bytes = _encodedBytes(event.toJson());
  controller._history.add(event);
  controller._historySizes.add(bytes);
  controller._retainedEventBytes += bytes;
  while (controller._history.length > controller.historyLimit ||
      controller._retainedEventBytes > controller.historyBytesLimit) {
    controller._history.removeAt(0);
    controller._retainedEventBytes -= controller._historySizes.removeAt(0);
  }
}

EntityGraphDevtoolsExpiredHistoryReceipt? _expiredSnapshotReceipt(
  EntityGraphDevtoolsController controller,
  int cursor,
) {
  if (cursor > controller._latestSnapshotCursor) return null;
  final status = _snapshotHistoryStatus(controller);
  final unavailable = controller._unavailableSnapshots[cursor];
  return EntityGraphDevtoolsExpiredHistoryReceipt(
    cursor: cursor,
    reason: unavailable != null
        ? EntityGraphDevtoolsExpiredHistoryReason.unavailable
        : cursor <= controller._clearedThroughSnapshotCursor
        ? EntityGraphDevtoolsExpiredHistoryReason.cleared
        : EntityGraphDevtoolsExpiredHistoryReason.evicted,
    unavailableReason: unavailable?.reason,
    oldestCursor: status.oldestCursor,
    newestCursor: status.newestCursor,
    latestCursor: status.latestCursor,
  );
}

({int? previousCursor, EntityGraphDevtoolsSnapshotSource? previousSource})?
_enterRewind(
  EntityGraphDevtoolsController controller, {
  required int cursor,
  required EntityGraphDevtoolsSnapshotSource source,
  required EntityGraphSnapshot target,
}) {
  if (controller.isDisposed ||
      controller._previewReceipts.isNotEmpty ||
      (controller._historyMode == EntityGraphDevtoolsHistoryMode.rewound &&
          controller._protectedLiveHead == null)) {
    return null;
  }
  final previousCursor = controller._activeSnapshotCursor;
  final previousSource = controller._activeSnapshotSource;
  final liveHead =
      controller._historyMode == EntityGraphDevtoolsHistoryMode.live
      ? controller._graph.captureSnapshot()
      : controller._protectedLiveHead;
  try {
    controller._restoreGraphSnapshot(target);
  } on Object {
    return null;
  }
  controller._protectedLiveHead = liveHead;
  controller._historyMode = EntityGraphDevtoolsHistoryMode.rewound;
  controller._activeSnapshotCursor = cursor;
  controller._activeSnapshotSource = source;
  return (previousCursor: previousCursor, previousSource: previousSource);
}

Map<String, Object?>? _stringMap(Object? value) {
  if (value is! Map) return null;
  final result = <String, Object?>{};
  for (final entry in value.entries) {
    if (entry.key is! String) return null;
    result[entry.key as String] = entry.value;
  }
  return result;
}

Map<String, Map<String, Map<String, Object?>>>? _parseEntityTable(
  Object? value,
) {
  final table = _stringMap(value);
  if (table == null) return null;
  final result = <String, Map<String, Map<String, Object?>>>{};
  for (final type in table.entries) {
    final bucket = _stringMap(type.value);
    if (bucket == null) return null;
    result[type.key] = {};
    for (final entity in bucket.entries) {
      final fields = _stringMap(entity.value);
      if (fields == null) return null;
      result[type.key]![entity.key] = fields;
    }
  }
  return result;
}

EntityGraphSnapshot? _parseGraphSnapshot(Object? value) {
  final data = _stringMap(value);
  if (data == null) return null;
  final entities = _parseEntityTable(data['entities']);
  final patches = _parseEntityTable(data['patches']);
  final stateValues = _stringMap(data['entityStates']);
  final syncValues = _stringMap(data['syncMetadata']);
  final listValues = _stringMap(data['lists']);
  if (entities == null ||
      patches == null ||
      stateValues == null ||
      syncValues == null ||
      listValues == null) {
    return null;
  }
  final states = <String, EntityState>{};
  for (final entry in stateValues.entries) {
    final state = _stringMap(entry.value);
    if (state == null ||
        state['isFetching'] is! bool ||
        state['stale'] is! bool ||
        (state['lastFetched'] != null && state['lastFetched'] is! num) ||
        (state['error'] != null && state['error'] is! String)) {
      return null;
    }
    states[entry.key] = EntityState(
      isFetching: state['isFetching']! as bool,
      lastFetched: state['lastFetched'] == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(
              (state['lastFetched']! as num).toInt(),
            ),
      error: state['error'] as String?,
      stale: state['stale']! as bool,
    );
  }
  final sync = <String, EntitySyncMetadata>{};
  for (final entry in syncValues.entries) {
    final metadata = _stringMap(entry.value);
    final origin = metadata?['origin'];
    if (metadata == null ||
        metadata['synced'] is! bool ||
        origin is! String ||
        !SyncOrigin.values.any((candidate) => candidate.name == origin) ||
        (metadata['updatedAt'] != null && metadata['updatedAt'] is! num)) {
      return null;
    }
    sync[entry.key] = EntitySyncMetadata(
      synced: metadata['synced']! as bool,
      origin: SyncOrigin.values.firstWhere(
        (candidate) => candidate.name == origin,
      ),
      updatedAt: metadata['updatedAt'] == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(
              (metadata['updatedAt']! as num).toInt(),
            ),
    );
  }
  final lists = <String, ListState>{};
  for (final entry in listValues.entries) {
    final list = _stringMap(entry.value);
    final ids = list?['ids'];
    if (list == null ||
        ids is! List ||
        ids.any((id) => id is! String) ||
        list['hasNextPage'] is! bool ||
        list['hasPrevPage'] is! bool ||
        list['isFetching'] is! bool ||
        list['isFetchingMore'] is! bool ||
        list['stale'] is! bool ||
        (list['total'] != null && list['total'] is! num) ||
        (list['nextCursor'] != null && list['nextCursor'] is! String) ||
        (list['prevCursor'] != null && list['prevCursor'] is! String) ||
        (list['error'] != null && list['error'] is! String) ||
        (list['lastFetched'] != null && list['lastFetched'] is! num)) {
      return null;
    }
    lists[entry.key] = ListState(
      ids: List<String>.unmodifiable(ids.cast<String>()),
      total: (list['total'] as num?)?.toInt(),
      nextCursor: list['nextCursor'] as String?,
      prevCursor: list['prevCursor'] as String?,
      hasNextPage: list['hasNextPage']! as bool,
      hasPrevPage: list['hasPrevPage']! as bool,
      isFetching: list['isFetching']! as bool,
      isFetchingMore: list['isFetchingMore']! as bool,
      error: list['error'] as String?,
      lastFetched: list['lastFetched'] == null
          ? null
          : DateTime.fromMillisecondsSinceEpoch(
              (list['lastFetched']! as num).toInt(),
            ),
      stale: list['stale']! as bool,
    );
  }
  return EntityGraphSnapshot.fromData(
    entities: entities,
    patches: patches,
    entityStates: states,
    syncMetadata: sync,
    lists: lists,
  );
}

EntityGraphDevtoolsHistoryImportInspectionResult _inspectHistoryImport(
  EntityGraphDevtoolsController controller,
  Object? candidate,
) {
  EntityGraphDevtoolsHistoryImportRejectedReceipt reject(
    EntityGraphDevtoolsHistoryImportInspectionRejectionReason reason,
    String message,
  ) => EntityGraphDevtoolsHistoryImportRejectedReceipt(
    reason: reason,
    message: message,
  );
  if (controller.isDisposed) {
    return reject(
      EntityGraphDevtoolsHistoryImportInspectionRejectionReason.disposed,
      'DevTools controller is disposed',
    );
  }
  if (!controller.timeTravelEnabled) {
    return reject(
      EntityGraphDevtoolsHistoryImportInspectionRejectionReason
          .timeTravelUnavailable,
      'Time travel is disabled for this controller',
    );
  }
  try {
    final raw = candidate is EntityGraphDevtoolsHistoryImportEnvelope
        ? candidate.toJson()
        : candidate;
    final envelope = _stringMap(raw);
    if (envelope == null ||
        envelope['protocol'] != entityGraphDevtoolsProtocol ||
        envelope['exportedAt'] is! String ||
        DateTime.tryParse(envelope['exportedAt']! as String) == null ||
        envelope['snapshots'] is! List ||
        (envelope['snapshots']! as List).isEmpty) {
      return reject(
        EntityGraphDevtoolsHistoryImportInspectionRejectionReason
            .invalidEnvelope,
        'Import metadata and at least one snapshot are required',
      );
    }
    if (envelope['version'] != entityGraphDevtoolsProtocolVersion) {
      return reject(
        EntityGraphDevtoolsHistoryImportInspectionRejectionReason
            .unsupportedVersion,
        'Import protocol version ${envelope['version']} is unsupported',
      );
    }
    if (envelope['storeId'] != controller.storeId) {
      return reject(
        EntityGraphDevtoolsHistoryImportInspectionRejectionReason.wrongStore,
        'Import targets ${envelope['storeId']}, not ${controller.storeId}',
      );
    }
    final rawSnapshots = envelope['snapshots']! as List;
    if (rawSnapshots.length > controller.snapshotLimit) {
      return reject(
        EntityGraphDevtoolsHistoryImportInspectionRejectionReason
            .snapshotLimitExceeded,
        'Import contains ${rawSnapshots.length} snapshots; limit is '
        '${controller.snapshotLimit}',
      );
    }
    final importBytes = _encodedBytes(envelope);
    if (importBytes > controller.snapshotBytesLimit) {
      return reject(
        EntityGraphDevtoolsHistoryImportInspectionRejectionReason
            .byteLimitExceeded,
        'Import contains $importBytes bytes; limit is '
        '${controller.snapshotBytesLimit}',
      );
    }
    final snapshots = <_ImportedGraphSnapshot>[];
    var previousCursor = 0;
    for (final rawSnapshot in rawSnapshots) {
      final snapshot = _stringMap(rawSnapshot);
      final cursor = snapshot?['cursor'];
      final capturedAt = snapshot?['capturedAt'];
      final eventSequence = snapshot?['eventSequence'];
      final data = _parseGraphSnapshot(snapshot?['data']);
      if (snapshot == null ||
          cursor is! int ||
          cursor <= previousCursor ||
          capturedAt is! String ||
          DateTime.tryParse(capturedAt) == null ||
          (eventSequence != null &&
              (eventSequence is! int || eventSequence <= 0)) ||
          data == null) {
        return reject(
          EntityGraphDevtoolsHistoryImportInspectionRejectionReason
              .invalidEnvelope,
          'Imported snapshots must have ordered stable cursors and valid graph data',
        );
      }
      snapshots.add(
        _ImportedGraphSnapshot(
          cursor: cursor,
          capturedAt: capturedAt,
          eventSequence: eventSequence as int?,
          bytes: _encodedBytes(_snapshotDataJson(data)),
          data: data,
        ),
      );
      previousCursor = cursor;
    }
    final candidateBytes = snapshots.fold<int>(
      0,
      (total, snapshot) => total + snapshot.bytes,
    );
    if (snapshots.length > controller.snapshotLimit) {
      return reject(
        EntityGraphDevtoolsHistoryImportInspectionRejectionReason
            .snapshotLimitExceeded,
        'Import contains ${snapshots.length} snapshots; limit is '
        '${controller.snapshotLimit}',
      );
    }
    if (candidateBytes > controller.snapshotBytesLimit) {
      return reject(
        EntityGraphDevtoolsHistoryImportInspectionRejectionReason
            .byteLimitExceeded,
        'Imported snapshots contain $candidateBytes bytes; limit is '
        '${controller.snapshotBytesLimit}',
      );
    }
    if (controller._importCandidate != null) {
      return reject(
        EntityGraphDevtoolsHistoryImportInspectionRejectionReason
            .candidatePending,
        'Confirm or invalidate the pending import candidate before inspecting another',
      );
    }
    final candidateId =
        'import-${controller.controllerId}-'
        '${controller._nextImportCandidate++}';
    controller._importCandidate = _ImportedGraphCandidate(
      candidateId: candidateId,
      bytes: candidateBytes,
      snapshots: snapshots,
    );
    return EntityGraphDevtoolsHistoryImportInspectionReceipt(
      candidateId: candidateId,
      storeId: controller.storeId,
      inspectedAt: DateTime.now().toUtc().toIso8601String(),
      bytes: importBytes,
      snapshots: snapshots.map(
        (snapshot) => EntityGraphDevtoolsHistoryImportSnapshotInspection(
          cursor: snapshot.cursor,
          capturedAt: snapshot.capturedAt,
          eventSequence: snapshot.eventSequence,
          bytes: snapshot.bytes,
        ),
      ),
    );
  } on Object {
    return reject(
      EntityGraphDevtoolsHistoryImportInspectionRejectionReason.invalidEnvelope,
      'Import could not be safely inspected or cloned',
    );
  }
}
