/// Versioned, transport-independent contracts shared by the Dart entity graph
/// controller, VM-service bridge, and Flutter DevTools extension.
library;

/// Stable wire identifier for every entity-graph DevTools envelope.
const entityGraphDevtoolsProtocol = 'prometheus.entity-graph.devtools';

/// Current wire protocol major. Other major versions are incompatible.
const entityGraphDevtoolsProtocolVersion = 1;

/// Base for every store-scoped v1 envelope.
abstract base class EntityGraphDevtoolsEnvelope {
  const EntityGraphDevtoolsEnvelope({required this.storeId});

  final String storeId;

  String get protocol => entityGraphDevtoolsProtocol;

  int get version => entityGraphDevtoolsProtocolVersion;

  Map<String, Object?> envelopeJson() => {
    'protocol': protocol,
    'version': version,
    'storeId': storeId,
  };

  Map<String, Object?> toJson();
}

enum EntityGraphDevtoolsChangeCategory {
  entity('entity'),
  patch('patch'),
  entityState('entity-state'),
  sync('sync'),
  list('list'),
  store('store');

  const EntityGraphDevtoolsChangeCategory(this.wireName);
  final String wireName;
}

enum EntityGraphDevtoolsChangeAction {
  added('added'),
  updated('updated'),
  removed('removed'),
  replaced('replaced');

  const EntityGraphDevtoolsChangeAction(this.wireName);
  final String wireName;
}

enum EntityGraphDevtoolsValueState {
  hiddenByPolicy('hidden-by-policy'),
  included('included'),
  redacted('redacted'),
  redactionError('redaction-error'),
  truncated('truncated');

  const EntityGraphDevtoolsValueState(this.wireName);
  final String wireName;
}

/// Aggregate graph metrics captured at one completed publication boundary.
final class EntityGraphDevtoolsCounts {
  const EntityGraphDevtoolsCounts({
    required this.entityTypes,
    required this.entities,
    required this.patchedEntities,
    required this.entityStates,
    required this.syncMetadata,
    required this.lists,
    required this.listMemberships,
    required this.fetching,
    required this.stale,
    required this.errors,
  });

  final int entityTypes;
  final int entities;
  final int patchedEntities;
  final int entityStates;
  final int syncMetadata;
  final int lists;
  final int listMemberships;
  final int fetching;
  final int stale;
  final int errors;

  Map<String, Object?> toJson() => {
    'entityTypes': entityTypes,
    'entities': entities,
    'patchedEntities': patchedEntities,
    'entityStates': entityStates,
    'syncMetadata': syncMetadata,
    'lists': lists,
    'listMemberships': listMemberships,
    'fetching': fetching,
    'stale': stale,
    'errors': errors,
  };
}

/// One semantic change inside a completed graph publication.
final class EntityGraphDevtoolsChange {
  const EntityGraphDevtoolsChange({
    required this.category,
    required this.action,
    required this.key,
    required this.valueState,
    this.id,
    this.beforeCount,
    this.afterCount,
    this.before,
    this.after,
  });

  final EntityGraphDevtoolsChangeCategory category;
  final EntityGraphDevtoolsChangeAction action;
  final String key;
  final String? id;
  final int? beforeCount;
  final int? afterCount;
  final EntityGraphDevtoolsValueState valueState;

  /// Omitted from serialized output under the metadata-only policy.
  final Object? before;

  /// Omitted from serialized output under the metadata-only policy.
  final Object? after;

  Map<String, Object?> toJson() => {
    'category': category.wireName,
    'action': action.wireName,
    'key': key,
    if (id != null) 'id': id,
    if (beforeCount != null) 'beforeCount': beforeCount,
    if (afterCount != null) 'afterCount': afterCount,
    'valueState': valueState.wireName,
    if (valueState == EntityGraphDevtoolsValueState.included ||
        valueState == EntityGraphDevtoolsValueState.redacted) ...{
      'before': before,
      'after': after,
    },
  };
}

enum EntityGraphDevtoolsCommandName {
  getCapabilities('get-capabilities'),
  getSnapshot('get-snapshot'),
  getHistory('get-history'),
  getHistoryStatus('get-history-status'),
  getEntityRecords('get-entity-records'),
  getViews('get-views'),
  getRelationships('get-relationships'),
  previewEntityPatch('preview-entity-patch'),
  restoreEntityPreview('restore-entity-preview'),
  getTimeTravelStatus('get-time-travel-status'),
  rewind('rewind'),
  returnToLive('return-to-live'),
  inspectHistoryImport('inspect-history-import'),
  cancelHistoryImport('cancel-history-import'),
  confirmHistoryImport('confirm-history-import'),
  clearHistory('clear-history');

  const EntityGraphDevtoolsCommandName(this.wireName);
  final String wireName;
}

/// Store-scoped command envelope used by local and VM-service transports.
final class EntityGraphDevtoolsCommand extends EntityGraphDevtoolsEnvelope {
  const EntityGraphDevtoolsCommand({
    required super.storeId,
    required this.controllerId,
    required this.requestId,
    required this.command,
    this.payload,
  });

  final String controllerId;
  final String requestId;
  final EntityGraphDevtoolsCommandName command;
  final Object? payload;

  @override
  Map<String, Object?> toJson() => {
    ...envelopeJson(),
    'controllerId': controllerId,
    'requestId': requestId,
    'command': command.wireName,
    if (payload != null) 'payload': payload,
  };
}

enum EntityGraphDevtoolsProtocolErrorCode {
  invalidEnvelope('invalid-envelope'),
  invalidPayload('invalid-payload'),
  unsupportedVersion('unsupported-version'),
  wrongStore('wrong-store'),
  staleController('stale-controller'),
  unsupportedCommand('unsupported-command'),
  entityNotFound('entity-not-found'),
  previewAlreadyActive('preview-already-active'),
  previewNotFound('preview-not-found'),
  snapshotNotFound('snapshot-not-found'),
  timeTravelUnavailable('time-travel-unavailable'),
  timeTravelActive('time-travel-active'),
  notRewound('not-rewound'),
  restoreFailed('restore-failed'),
  confirmationRequired('confirmation-required'),
  transportLimitExceeded('transport-limit-exceeded'),
  disposed('disposed');

  const EntityGraphDevtoolsProtocolErrorCode(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsProtocolError {
  const EntityGraphDevtoolsProtocolError({
    required this.code,
    required this.message,
  });

  final EntityGraphDevtoolsProtocolErrorCode code;
  final String message;

  Map<String, Object?> toJson() => {'code': code.wireName, 'message': message};
}

sealed class EntityGraphDevtoolsResult extends EntityGraphDevtoolsEnvelope {
  const EntityGraphDevtoolsResult({
    required super.storeId,
    required this.requestId,
  });

  final String requestId;
  bool get ok;
}

/// Successful command result. [result] must already be JSON-compatible when
/// this envelope crosses a serialized transport.
final class EntityGraphDevtoolsSuccessResult extends EntityGraphDevtoolsResult {
  const EntityGraphDevtoolsSuccessResult({
    required super.storeId,
    required super.requestId,
    required this.result,
  });

  final Object? result;

  @override
  bool get ok => true;

  @override
  Map<String, Object?> toJson() => {
    ...envelopeJson(),
    'requestId': requestId,
    'ok': ok,
    'result': result,
  };
}

final class EntityGraphDevtoolsErrorResult extends EntityGraphDevtoolsResult {
  const EntityGraphDevtoolsErrorResult({
    required super.storeId,
    required super.requestId,
    required this.error,
  });

  final EntityGraphDevtoolsProtocolError error;

  @override
  bool get ok => false;

  @override
  Map<String, Object?> toJson() => {
    ...envelopeJson(),
    'requestId': requestId,
    'ok': ok,
    'error': error.toJson(),
  };
}

enum EntityGraphDevtoolsFeature {
  semanticEvents('semantic-events'),
  diagnosticEvents('diagnostic-events'),
  boundedHistory('bounded-history'),
  multiClient('multi-client'),
  multiStore('multi-store'),
  entityInspection('entity-inspection'),
  viewInspection('view-inspection'),
  relationshipInspection('relationship-inspection'),
  localPreview('local-preview'),
  snapshotHistory('snapshot-history'),
  timeTravel('time-travel'),
  historyImport('history-import');

  const EntityGraphDevtoolsFeature(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsLimits {
  const EntityGraphDevtoolsLimits({
    required this.historyEvents,
    required this.historyBytes,
    required this.eventBytes,
    required this.snapshots,
    required this.snapshotBytes,
  });

  final int historyEvents;
  final int historyBytes;
  final int eventBytes;
  final int snapshots;
  final int snapshotBytes;

  Map<String, Object?> toJson() => {
    'historyEvents': historyEvents,
    'historyBytes': historyBytes,
    'eventBytes': eventBytes,
    'snapshots': snapshots,
    'snapshotBytes': snapshotBytes,
  };
}

/// Controller capabilities returned before a tool sends commands.
final class EntityGraphDevtoolsCapabilities {
  EntityGraphDevtoolsCapabilities({
    required Iterable<EntityGraphDevtoolsCommandName> commands,
    required Iterable<EntityGraphDevtoolsFeature> features,
    required this.limits,
  }) : commands = List.unmodifiable(commands),
       features = List.unmodifiable(features);

  final List<EntityGraphDevtoolsCommandName> commands;
  final List<EntityGraphDevtoolsFeature> features;
  final EntityGraphDevtoolsLimits limits;

  int get protocolVersion => entityGraphDevtoolsProtocolVersion;
  bool get metadataOnlyByDefault => true;

  Map<String, Object?> toJson() => {
    'protocolVersion': protocolVersion,
    'metadataOnlyByDefault': metadataOnlyByDefault,
    'commands': commands
        .map((command) => command.wireName)
        .toList(growable: false),
    'features': features
        .map((feature) => feature.wireName)
        .toList(growable: false),
    'limits': limits.toJson(),
  };
}

/// One active graph advertised by the isolate-wide VM-service registry.
final class EntityGraphDevtoolsStoreDescriptor {
  const EntityGraphDevtoolsStoreDescriptor({
    required this.storeId,
    required this.controllerId,
    required this.capabilities,
  });

  final String storeId;
  final String controllerId;
  final EntityGraphDevtoolsCapabilities capabilities;

  Map<String, Object?> toJson() => {
    'storeId': storeId,
    'controllerId': controllerId,
    'capabilities': capabilities.toJson(),
  };
}

/// Versioned discovery result for every active graph in one isolate.
final class EntityGraphDevtoolsStoreRegistry {
  EntityGraphDevtoolsStoreRegistry({
    required this.capturedAt,
    required Iterable<EntityGraphDevtoolsStoreDescriptor> stores,
  }) : stores = List.unmodifiable(stores);

  final String capturedAt;
  final List<EntityGraphDevtoolsStoreDescriptor> stores;

  String get protocol => entityGraphDevtoolsProtocol;
  int get version => entityGraphDevtoolsProtocolVersion;

  Map<String, Object?> toJson() => {
    'protocol': protocol,
    'version': version,
    'capturedAt': capturedAt,
    'stores': stores.map((store) => store.toJson()).toList(growable: false),
  };
}

enum EntityGraphDevtoolsSnapshotUnavailableReason {
  retentionDisabled('retention-disabled'),
  captureFailed('capture-failed'),
  oversize('oversize');

  const EntityGraphDevtoolsSnapshotUnavailableReason(this.wireName);
  final String wireName;
}

sealed class EntityGraphDevtoolsSnapshotReference {
  const EntityGraphDevtoolsSnapshotReference({
    required this.cursor,
    required this.capturedAt,
    required this.eventSequence,
    this.label,
  });

  final int cursor;
  final String capturedAt;
  final int? eventSequence;
  final String? label;

  Map<String, Object?> toJson();

  Map<String, Object?> baseJson() => {
    'cursor': cursor,
    'capturedAt': capturedAt,
    'eventSequence': eventSequence,
    if (label != null) 'label': label,
  };
}

final class EntityGraphDevtoolsRetainedSnapshotReference
    extends EntityGraphDevtoolsSnapshotReference {
  const EntityGraphDevtoolsRetainedSnapshotReference({
    required super.cursor,
    required super.capturedAt,
    required super.eventSequence,
    required this.bytes,
    super.label,
  });

  final int bytes;

  @override
  Map<String, Object?> toJson() => {
    ...baseJson(),
    'status': 'retained',
    'bytes': bytes,
  };
}

final class EntityGraphDevtoolsUnavailableSnapshotReference
    extends EntityGraphDevtoolsSnapshotReference {
  const EntityGraphDevtoolsUnavailableSnapshotReference({
    required super.cursor,
    required super.capturedAt,
    required super.eventSequence,
    required this.reason,
    super.label,
  });

  final EntityGraphDevtoolsSnapshotUnavailableReason reason;

  @override
  Map<String, Object?> toJson() => {
    ...baseJson(),
    'status': 'unavailable',
    'reason': reason.wireName,
  };
}

enum EntityGraphDevtoolsHistoryMode {
  live('live'),
  rewound('rewound');

  const EntityGraphDevtoolsHistoryMode(this.wireName);
  final String wireName;
}

enum EntityGraphDevtoolsSnapshotSource {
  retained('retained'),
  imported('import');

  const EntityGraphDevtoolsSnapshotSource(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsHistoryStatus {
  const EntityGraphDevtoolsHistoryStatus({
    required this.retainedEvents,
    required this.retainedBytes,
    required this.eventLimit,
    required this.byteLimit,
    required this.oldestSequence,
    required this.newestSequence,
  });

  final int retainedEvents;
  final int retainedBytes;
  final int eventLimit;
  final int byteLimit;
  final int? oldestSequence;
  final int? newestSequence;

  Map<String, Object?> toJson() => {
    'retainedEvents': retainedEvents,
    'retainedBytes': retainedBytes,
    'eventLimit': eventLimit,
    'byteLimit': byteLimit,
    'oldestSequence': oldestSequence,
    'newestSequence': newestSequence,
  };
}

final class EntityGraphDevtoolsImportCandidateStatus {
  const EntityGraphDevtoolsImportCandidateStatus({
    required this.candidateId,
    required this.snapshots,
    required this.bytes,
  });

  final String candidateId;
  final int snapshots;
  final int bytes;

  Map<String, Object?> toJson() => {
    'candidateId': candidateId,
    'snapshots': snapshots,
    'bytes': bytes,
  };
}

final class EntityGraphDevtoolsSnapshotHistoryStatus {
  const EntityGraphDevtoolsSnapshotHistoryStatus({
    required this.mode,
    required this.cursor,
    required this.source,
    required this.retainedSnapshots,
    required this.retainedBytes,
    required this.snapshotLimit,
    required this.byteLimit,
    required this.baselineCursor,
    required this.oldestCursor,
    required this.newestCursor,
    required this.latestCursor,
    required this.lastUnavailable,
    required this.importCandidate,
  });

  final EntityGraphDevtoolsHistoryMode mode;
  final int? cursor;
  final EntityGraphDevtoolsSnapshotSource? source;
  final int retainedSnapshots;
  final int retainedBytes;
  final int snapshotLimit;
  final int byteLimit;
  final int? baselineCursor;
  final int? oldestCursor;
  final int? newestCursor;
  final int? latestCursor;
  final EntityGraphDevtoolsUnavailableSnapshotReference? lastUnavailable;
  final EntityGraphDevtoolsImportCandidateStatus? importCandidate;

  Map<String, Object?> toJson() => {
    'mode': mode.wireName,
    'cursor': cursor,
    'source': source?.wireName,
    'retainedSnapshots': retainedSnapshots,
    'retainedBytes': retainedBytes,
    'snapshotLimit': snapshotLimit,
    'byteLimit': byteLimit,
    'baselineCursor': baselineCursor,
    'oldestCursor': oldestCursor,
    'newestCursor': newestCursor,
    'latestCursor': latestCursor,
    'lastUnavailable': lastUnavailable?.toJson(),
    'importCandidate': importCandidate?.toJson(),
  };
}

/// Metadata required to recover one active local preview across clients.
final class EntityGraphDevtoolsActivePreview {
  const EntityGraphDevtoolsActivePreview({
    required this.previewId,
    required this.entity,
    required this.appliedAt,
  });

  final String previewId;
  final EntityGraphDevtoolsViewMembership entity;
  final String appliedAt;

  Map<String, Object?> toJson() => {
    'previewId': previewId,
    'entity': entity.toJson(),
    'appliedAt': appliedAt,
  };
}

/// Store-level metrics, active previews, and bounded-history status.
final class EntityGraphDevtoolsSnapshot extends EntityGraphDevtoolsEnvelope {
  const EntityGraphDevtoolsSnapshot({
    required super.storeId,
    required this.capturedAt,
    required this.counts,
    required this.history,
    required this.snapshots,
    required this.activePreviews,
  });

  final String capturedAt;
  final EntityGraphDevtoolsCounts counts;
  final EntityGraphDevtoolsHistoryStatus history;
  final EntityGraphDevtoolsSnapshotHistoryStatus snapshots;
  final List<EntityGraphDevtoolsActivePreview> activePreviews;

  @override
  Map<String, Object?> toJson() => {
    ...envelopeJson(),
    'capturedAt': capturedAt,
    'counts': counts.toJson(),
    'history': history.toJson(),
    'snapshots': snapshots.toJson(),
    'activePreviews': activePreviews
        .map((preview) => preview.toJson())
        .toList(growable: false),
  };
}

/// Base fields shared by every retained or streamed semantic event.
abstract base class EntityGraphDevtoolsEvent
    extends EntityGraphDevtoolsEnvelope {
  const EntityGraphDevtoolsEvent({
    required super.storeId,
    required this.sequence,
    required this.eventId,
    required this.correlationId,
    required this.observedAt,
  });

  final int sequence;
  final String eventId;
  final String correlationId;
  final String observedAt;
  String get type;
  Map<String, Object?> payloadJson();

  @override
  Map<String, Object?> toJson() => {
    ...envelopeJson(),
    'sequence': sequence,
    'eventId': eventId,
    'correlationId': correlationId,
    'observedAt': observedAt,
    'type': type,
    'payload': payloadJson(),
  };
}

final class EntityGraphDevtoolsMutationEvent extends EntityGraphDevtoolsEvent {
  EntityGraphDevtoolsMutationEvent({
    required super.storeId,
    required super.sequence,
    required super.eventId,
    required super.correlationId,
    required super.observedAt,
    required this.snapshot,
    required Iterable<EntityGraphDevtoolsChange> changes,
    required Iterable<EntityGraphDevtoolsViewMembership> affectedEntities,
    required Iterable<String> affectedViewIds,
    required this.before,
    required this.after,
    required this.projectionDurationMs,
    required this.valuesTruncated,
    required this.changesOmitted,
  }) : changes = List.unmodifiable(changes),
       affectedEntities = List.unmodifiable(affectedEntities),
       affectedViewIds = List.unmodifiable(affectedViewIds);

  final EntityGraphDevtoolsSnapshotReference snapshot;
  final List<EntityGraphDevtoolsChange> changes;
  final List<EntityGraphDevtoolsViewMembership> affectedEntities;
  final List<String> affectedViewIds;
  final EntityGraphDevtoolsCounts before;
  final EntityGraphDevtoolsCounts after;
  final double projectionDurationMs;
  final bool valuesTruncated;
  final int changesOmitted;

  @override
  String get type => 'mutation';

  @override
  Map<String, Object?> payloadJson() => {
    'snapshot': snapshot.toJson(),
    'changes': changes.map((change) => change.toJson()).toList(growable: false),
    if (affectedEntities.isNotEmpty)
      'affectedEntities': affectedEntities
          .map((entity) => entity.toJson())
          .toList(growable: false),
    if (affectedViewIds.isNotEmpty) 'affectedViewIds': affectedViewIds,
    'before': before.toJson(),
    'after': after.toJson(),
    'projectionDurationMs': projectionDurationMs,
    'valuesTruncated': valuesTruncated,
    'changesOmitted': changesOmitted,
  };
}

enum EntityGraphDevtoolsLifecycleState {
  attached('attached'),
  clientConnected('client-connected'),
  clientDisconnected('client-disconnected'),
  disposed('disposed');

  const EntityGraphDevtoolsLifecycleState(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsLifecycleEvent extends EntityGraphDevtoolsEvent {
  const EntityGraphDevtoolsLifecycleEvent({
    required super.storeId,
    required super.sequence,
    required super.eventId,
    required super.correlationId,
    required super.observedAt,
    required this.state,
    required this.activeClients,
    this.clientId,
  });

  final EntityGraphDevtoolsLifecycleState state;
  final String? clientId;
  final int activeClients;

  @override
  String get type => 'lifecycle';

  @override
  Map<String, Object?> payloadJson() => {
    'state': state.wireName,
    if (clientId != null) 'clientId': clientId,
    'activeClients': activeClients,
  };
}

final class EntityGraphDevtoolsDiagnosticEvent
    extends EntityGraphDevtoolsEvent {
  const EntityGraphDevtoolsDiagnosticEvent({
    required super.storeId,
    required super.sequence,
    required super.eventId,
    required super.correlationId,
    required super.observedAt,
    required this.message,
    required this.snapshot,
  });

  final String message;
  final EntityGraphDevtoolsSnapshotReference snapshot;

  String get code => 'projection-failed';

  @override
  String get type => 'diagnostic';

  @override
  Map<String, Object?> payloadJson() => {
    'code': code,
    'message': message,
    'snapshot': snapshot.toJson(),
  };
}

enum EntityGraphDevtoolsViewEventState {
  registered('registered'),
  membershipChanged('membership-changed'),
  unregistered('unregistered');

  const EntityGraphDevtoolsViewEventState(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsViewEvent extends EntityGraphDevtoolsEvent {
  const EntityGraphDevtoolsViewEvent({
    required super.storeId,
    required super.sequence,
    required super.eventId,
    required super.correlationId,
    required super.observedAt,
    required this.state,
    required this.viewId,
    required this.membershipCount,
  });

  final EntityGraphDevtoolsViewEventState state;
  final String viewId;
  final int membershipCount;

  @override
  String get type => 'view';

  @override
  Map<String, Object?> payloadJson() => {
    'state': state.wireName,
    'viewId': viewId,
    'membershipCount': membershipCount,
  };
}

enum EntityGraphDevtoolsTimeTravelReason {
  command('command'),
  imported('import'),
  mutation('mutation');

  const EntityGraphDevtoolsTimeTravelReason(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsTimeTravelEvent
    extends EntityGraphDevtoolsEvent {
  const EntityGraphDevtoolsTimeTravelEvent({
    required super.storeId,
    required super.sequence,
    required super.eventId,
    required super.correlationId,
    required super.observedAt,
    required this.state,
    required this.cursor,
    required this.previousCursor,
    required this.source,
    required this.previousSource,
    required this.reason,
  });

  final EntityGraphDevtoolsHistoryMode state;
  final int? cursor;
  final int? previousCursor;
  final EntityGraphDevtoolsSnapshotSource? source;
  final EntityGraphDevtoolsSnapshotSource? previousSource;
  final EntityGraphDevtoolsTimeTravelReason reason;

  @override
  String get type => 'time-travel';

  @override
  Map<String, Object?> payloadJson() => {
    'state': state.wireName,
    'cursor': cursor,
    'previousCursor': previousCursor,
    'source': source?.wireName,
    'previousSource': previousSource?.wireName,
    'reason': reason.wireName,
  };
}

final class EntityGraphDevtoolsEntityError {
  const EntityGraphDevtoolsEntityError({
    required this.message,
    required this.retryable,
  });

  final String message;
  final bool? retryable;

  String get kind => 'entity-fetch';

  Map<String, Object?> toJson() => {
    'kind': kind,
    'message': message,
    'retryable': retryable,
  };
}

enum EntityGraphDevtoolsDirtyReasonKind {
  localPatch('local-patch'),
  syncState('sync-state');

  const EntityGraphDevtoolsDirtyReasonKind(this.wireName);
  final String wireName;
}

enum EntityGraphDevtoolsDirtyChange {
  added('added'),
  changed('changed'),
  unsynced('unsynced');

  const EntityGraphDevtoolsDirtyChange(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsEntityDirtyReason {
  const EntityGraphDevtoolsEntityDirtyReason({
    required this.kind,
    required this.field,
    required this.change,
  });

  final EntityGraphDevtoolsDirtyReasonKind kind;
  final String? field;
  final EntityGraphDevtoolsDirtyChange change;

  Map<String, Object?> toJson() => {
    'kind': kind.wireName,
    'field': field,
    'change': change.wireName,
  };
}

final class EntityGraphDevtoolsEntityState {
  const EntityGraphDevtoolsEntityState({
    required this.isFetching,
    required this.lastFetchedAt,
    required this.stale,
    required this.error,
  });

  final bool isFetching;
  final String? lastFetchedAt;
  final bool stale;
  final EntityGraphDevtoolsEntityError? error;

  Map<String, Object?> toJson() => {
    'isFetching': isFetching,
    'lastFetchedAt': lastFetchedAt,
    'stale': stale,
    'error': error?.toJson(),
  };
}

enum EntityGraphDevtoolsSyncOrigin {
  server('server'),
  client('client'),
  optimistic('optimistic');

  const EntityGraphDevtoolsSyncOrigin(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsSyncState {
  const EntityGraphDevtoolsSyncState({
    required this.synced,
    required this.origin,
    required this.updatedAt,
  });

  final bool synced;
  final EntityGraphDevtoolsSyncOrigin origin;
  final String? updatedAt;

  Map<String, Object?> toJson() => {
    'synced': synced,
    'origin': origin.wireName,
    'updatedAt': updatedAt,
  };
}

enum EntityGraphDevtoolsEntityPresence {
  present('present'),
  missingCanonical('missing-canonical');

  const EntityGraphDevtoolsEntityPresence(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsEntityRecord {
  EntityGraphDevtoolsEntityRecord({
    required this.key,
    required this.type,
    required this.id,
    required this.presence,
    required this.canonical,
    required this.patch,
    required this.merged,
    required this.dirty,
    required Iterable<EntityGraphDevtoolsEntityDirtyReason> dirtyReasons,
    required this.entityState,
    required this.sync,
    required this.revision,
    required Iterable<String> viewIds,
  }) : dirtyReasons = List.unmodifiable(dirtyReasons),
       viewIds = List.unmodifiable(viewIds);

  final String key;
  final String type;
  final String id;
  final EntityGraphDevtoolsEntityPresence presence;
  final Object? canonical;
  final Object? patch;
  final Object? merged;
  final bool dirty;
  final List<EntityGraphDevtoolsEntityDirtyReason> dirtyReasons;
  final EntityGraphDevtoolsEntityState entityState;
  final EntityGraphDevtoolsSyncState sync;
  final int revision;
  final List<String> viewIds;

  Map<String, Object?> toJson() => {
    'key': key,
    'type': type,
    'id': id,
    'presence': presence.wireName,
    'canonical': canonical,
    'patch': patch,
    'merged': merged,
    'dirty': dirty,
    'dirtyReasons': dirtyReasons
        .map((reason) => reason.toJson())
        .toList(growable: false),
    'entityState': entityState.toJson(),
    'sync': sync.toJson(),
    'revision': revision,
    'viewIds': viewIds,
  };
}

final class EntityGraphDevtoolsEntityRecordsSnapshot
    extends EntityGraphDevtoolsEnvelope {
  EntityGraphDevtoolsEntityRecordsSnapshot({
    required super.storeId,
    required this.capturedAt,
    required Iterable<EntityGraphDevtoolsEntityRecord> entityRecords,
  }) : entityRecords = List.unmodifiable(entityRecords);

  final String capturedAt;
  final List<EntityGraphDevtoolsEntityRecord> entityRecords;

  @override
  Map<String, Object?> toJson() => {
    ...envelopeJson(),
    'capturedAt': capturedAt,
    'entityRecords': entityRecords
        .map((record) => record.toJson())
        .toList(growable: false),
  };
}

enum EntityGraphDevtoolsViewKind {
  entity('entity'),
  list('list');

  const EntityGraphDevtoolsViewKind(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsViewDefinition {
  const EntityGraphDevtoolsViewDefinition({
    required this.viewId,
    required this.label,
    required this.kind,
    required this.entityType,
    this.queryKey,
  });

  final String viewId;
  final String label;
  final EntityGraphDevtoolsViewKind kind;
  final String entityType;
  final String? queryKey;

  Map<String, Object?> toJson() => {
    'viewId': viewId,
    'label': label,
    'kind': kind.wireName,
    'entityType': entityType,
    'queryKey': queryKey,
  };
}

final class EntityGraphDevtoolsViewMembership {
  const EntityGraphDevtoolsViewMembership({
    required this.type,
    required this.id,
  });

  final String type;
  final String id;

  Map<String, Object?> toJson() => {'type': type, 'id': id};
}

final class EntityGraphDevtoolsViewListStats {
  const EntityGraphDevtoolsViewListStats({
    required this.visibleCount,
    required this.graphCount,
    required this.total,
    required this.isFetching,
    required this.isFetchingMore,
    required this.stale,
    required this.hasNextPage,
    required this.hasPreviousPage,
  });

  final int visibleCount;
  final int graphCount;
  final int? total;
  final bool isFetching;
  final bool isFetchingMore;
  final bool stale;
  final bool hasNextPage;
  final bool hasPreviousPage;

  Map<String, Object?> toJson() => {
    'visibleCount': visibleCount,
    'graphCount': graphCount,
    'total': total,
    'isFetching': isFetching,
    'isFetchingMore': isFetchingMore,
    'stale': stale,
    'hasNextPage': hasNextPage,
    'hasPreviousPage': hasPreviousPage,
  };
}

final class EntityGraphDevtoolsViewRecord {
  EntityGraphDevtoolsViewRecord({
    required this.definition,
    required this.registeredAt,
    required this.lastRenderedAt,
    required this.renderCount,
    required this.subscriberCount,
    required Iterable<EntityGraphDevtoolsViewMembership> membership,
    required this.list,
  }) : membership = List.unmodifiable(membership);

  final EntityGraphDevtoolsViewDefinition definition;
  final String registeredAt;
  final String? lastRenderedAt;
  final int renderCount;
  final int subscriberCount;
  final List<EntityGraphDevtoolsViewMembership> membership;
  final EntityGraphDevtoolsViewListStats? list;

  Map<String, Object?> toJson() => {
    ...definition.toJson(),
    'registeredAt': registeredAt,
    'lastRenderedAt': lastRenderedAt,
    'renderCount': renderCount,
    'subscriberCount': subscriberCount,
    'membership': membership
        .map((item) => item.toJson())
        .toList(growable: false),
    'list': list?.toJson(),
  };
}

final class EntityGraphDevtoolsEntityViewMembership {
  EntityGraphDevtoolsEntityViewMembership({
    required this.entity,
    required Iterable<String> viewIds,
  }) : viewIds = List.unmodifiable(viewIds);

  final EntityGraphDevtoolsViewMembership entity;
  final List<String> viewIds;

  Map<String, Object?> toJson() => {...entity.toJson(), 'viewIds': viewIds};
}

final class EntityGraphDevtoolsViewsSnapshot
    extends EntityGraphDevtoolsEnvelope {
  EntityGraphDevtoolsViewsSnapshot({
    required super.storeId,
    required this.capturedAt,
    required Iterable<EntityGraphDevtoolsViewRecord> views,
    required Iterable<EntityGraphDevtoolsEntityViewMembership>
    entityViewMembership,
  }) : views = List.unmodifiable(views),
       entityViewMembership = List.unmodifiable(entityViewMembership);

  final String capturedAt;
  final List<EntityGraphDevtoolsViewRecord> views;
  final List<EntityGraphDevtoolsEntityViewMembership> entityViewMembership;

  @override
  Map<String, Object?> toJson() => {
    ...envelopeJson(),
    'capturedAt': capturedAt,
    'views': views.map((view) => view.toJson()).toList(growable: false),
    'entityViewMembership': entityViewMembership
        .map((item) => item.toJson())
        .toList(growable: false),
  };
}

enum EntityGraphDevtoolsRelationshipCardinality {
  belongsTo('belongsTo'),
  hasMany('hasMany'),
  manyToMany('manyToMany');

  const EntityGraphDevtoolsRelationshipCardinality(this.wireName);
  final String wireName;
}

enum EntityGraphDevtoolsRelationshipDirection {
  outgoing('outgoing'),
  reverse('reverse');

  const EntityGraphDevtoolsRelationshipDirection(this.wireName);
  final String wireName;
}

enum EntityGraphDevtoolsRelationshipStatus {
  resolved('resolved'),
  missingTarget('missing-target');

  const EntityGraphDevtoolsRelationshipStatus(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsRelationshipEndpoint {
  const EntityGraphDevtoolsRelationshipEndpoint({
    required this.type,
    required this.id,
    this.field,
  });

  final String type;
  final String id;
  final String? field;

  Map<String, Object?> toJson() => {
    'type': type,
    'id': id,
    if (field != null) 'field': field,
  };
}

final class EntityGraphDevtoolsRelationship {
  const EntityGraphDevtoolsRelationship({
    required this.relation,
    required this.cardinality,
    required this.direction,
    required this.source,
    required this.target,
    required this.status,
  });

  final String relation;
  final EntityGraphDevtoolsRelationshipCardinality cardinality;
  final EntityGraphDevtoolsRelationshipDirection direction;
  final EntityGraphDevtoolsRelationshipEndpoint source;
  final EntityGraphDevtoolsRelationshipEndpoint target;
  final EntityGraphDevtoolsRelationshipStatus status;

  Map<String, Object?> toJson() => {
    'relation': relation,
    'cardinality': cardinality.wireName,
    'direction': direction.wireName,
    'source': source.toJson(),
    'target': target.toJson(),
    'status': status.wireName,
  };
}

final class EntityGraphDevtoolsRelationshipsSnapshot
    extends EntityGraphDevtoolsEnvelope {
  EntityGraphDevtoolsRelationshipsSnapshot({
    required super.storeId,
    required this.capturedAt,
    required Iterable<EntityGraphDevtoolsRelationship> relationships,
  }) : relationships = List.unmodifiable(relationships);

  final String capturedAt;
  final List<EntityGraphDevtoolsRelationship> relationships;

  @override
  Map<String, Object?> toJson() => {
    ...envelopeJson(),
    'capturedAt': capturedAt,
    'relationships': relationships
        .map((relationship) => relationship.toJson())
        .toList(growable: false),
  };
}

final class EntityGraphDevtoolsRewind {
  const EntityGraphDevtoolsRewind({required this.cursor});

  final int cursor;

  Map<String, Object?> toJson() => {'cursor': cursor};
}

sealed class EntityGraphDevtoolsRewindResult {
  const EntityGraphDevtoolsRewindResult();
  Map<String, Object?> toJson();
}

final class EntityGraphDevtoolsRewindReceipt
    extends EntityGraphDevtoolsRewindResult {
  const EntityGraphDevtoolsRewindReceipt({
    required this.cursor,
    required this.previousCursor,
    required this.previousSource,
    required this.changedAt,
  });

  final int cursor;
  final int? previousCursor;
  final EntityGraphDevtoolsSnapshotSource? previousSource;
  final String changedAt;

  @override
  Map<String, Object?> toJson() => {
    'status': 'rewound',
    'cursor': cursor,
    'source': EntityGraphDevtoolsSnapshotSource.retained.wireName,
    'previousCursor': previousCursor,
    'previousSource': previousSource?.wireName,
    'changedAt': changedAt,
  };
}

enum EntityGraphDevtoolsExpiredHistoryReason {
  evicted('evicted'),
  cleared('cleared'),
  unavailable('unavailable');

  const EntityGraphDevtoolsExpiredHistoryReason(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsExpiredHistoryReceipt
    extends EntityGraphDevtoolsRewindResult {
  const EntityGraphDevtoolsExpiredHistoryReceipt({
    required this.cursor,
    required this.reason,
    required this.oldestCursor,
    required this.newestCursor,
    required this.latestCursor,
    this.unavailableReason,
  });

  final int cursor;
  final EntityGraphDevtoolsExpiredHistoryReason reason;
  final EntityGraphDevtoolsSnapshotUnavailableReason? unavailableReason;
  final int? oldestCursor;
  final int? newestCursor;
  final int? latestCursor;

  @override
  Map<String, Object?> toJson() => {
    'status': 'expired-history',
    'cursor': cursor,
    'reason': reason.wireName,
    if (unavailableReason != null)
      'unavailableReason': unavailableReason!.wireName,
    'oldestCursor': oldestCursor,
    'newestCursor': newestCursor,
    'latestCursor': latestCursor,
  };
}

final class EntityGraphDevtoolsReturnToLiveReceipt {
  const EntityGraphDevtoolsReturnToLiveReceipt({
    required this.previousCursor,
    required this.previousSource,
    required this.changedAt,
  });

  final int previousCursor;
  final EntityGraphDevtoolsSnapshotSource previousSource;
  final String changedAt;

  Map<String, Object?> toJson() => {
    'status': 'live',
    'cursor': null,
    'previousCursor': previousCursor,
    'previousSource': previousSource.wireName,
    'reason': EntityGraphDevtoolsTimeTravelReason.command.wireName,
    'changedAt': changedAt,
  };
}

/// The five graph-owned data structures retained by one history snapshot.
final class EntityGraphDevtoolsGraphData {
  EntityGraphDevtoolsGraphData({
    required Map<String, Object?> entities,
    required Map<String, Object?> patches,
    required Map<String, Object?> entityStates,
    required Map<String, Object?> syncMetadata,
    required Map<String, Object?> lists,
  }) : entities = Map.unmodifiable(entities),
       patches = Map.unmodifiable(patches),
       entityStates = Map.unmodifiable(entityStates),
       syncMetadata = Map.unmodifiable(syncMetadata),
       lists = Map.unmodifiable(lists);

  final Map<String, Object?> entities;
  final Map<String, Object?> patches;
  final Map<String, Object?> entityStates;
  final Map<String, Object?> syncMetadata;
  final Map<String, Object?> lists;

  Map<String, Object?> toJson() => {
    'entities': entities,
    'patches': patches,
    'entityStates': entityStates,
    'syncMetadata': syncMetadata,
    'lists': lists,
  };
}

final class EntityGraphDevtoolsHistoryImportSnapshot {
  const EntityGraphDevtoolsHistoryImportSnapshot({
    required this.cursor,
    required this.capturedAt,
    required this.eventSequence,
    required this.data,
  });

  final int cursor;
  final String capturedAt;
  final int? eventSequence;
  final EntityGraphDevtoolsGraphData data;

  Map<String, Object?> toJson() => {
    'cursor': cursor,
    'capturedAt': capturedAt,
    'eventSequence': eventSequence,
    'data': data.toJson(),
  };
}

final class EntityGraphDevtoolsHistoryImportEnvelope
    extends EntityGraphDevtoolsEnvelope {
  EntityGraphDevtoolsHistoryImportEnvelope({
    required super.storeId,
    required this.exportedAt,
    required Iterable<EntityGraphDevtoolsHistoryImportSnapshot> snapshots,
  }) : snapshots = List.unmodifiable(snapshots);

  final String exportedAt;
  final List<EntityGraphDevtoolsHistoryImportSnapshot> snapshots;

  @override
  Map<String, Object?> toJson() => {
    ...envelopeJson(),
    'exportedAt': exportedAt,
    'snapshots': snapshots
        .map((snapshot) => snapshot.toJson())
        .toList(growable: false),
  };
}

final class EntityGraphDevtoolsInspectHistoryImport {
  const EntityGraphDevtoolsInspectHistoryImport({required this.candidate});

  final Object? candidate;

  Map<String, Object?> toJson() => {'candidate': candidate};
}

final class EntityGraphDevtoolsHistoryImportSnapshotInspection {
  const EntityGraphDevtoolsHistoryImportSnapshotInspection({
    required this.cursor,
    required this.capturedAt,
    required this.eventSequence,
    required this.bytes,
  });

  final int cursor;
  final String capturedAt;
  final int? eventSequence;
  final int bytes;

  Map<String, Object?> toJson() => {
    'cursor': cursor,
    'capturedAt': capturedAt,
    'eventSequence': eventSequence,
    'bytes': bytes,
  };
}

sealed class EntityGraphDevtoolsHistoryImportInspectionResult {
  const EntityGraphDevtoolsHistoryImportInspectionResult();
  Map<String, Object?> toJson();
}

final class EntityGraphDevtoolsHistoryImportInspectionReceipt
    extends EntityGraphDevtoolsHistoryImportInspectionResult {
  EntityGraphDevtoolsHistoryImportInspectionReceipt({
    required this.candidateId,
    required this.storeId,
    required this.inspectedAt,
    required this.bytes,
    required Iterable<EntityGraphDevtoolsHistoryImportSnapshotInspection>
    snapshots,
  }) : snapshots = List.unmodifiable(snapshots);

  final String candidateId;
  final String storeId;
  final String inspectedAt;
  final int bytes;
  final List<EntityGraphDevtoolsHistoryImportSnapshotInspection> snapshots;

  int get protocolVersion => entityGraphDevtoolsProtocolVersion;

  @override
  Map<String, Object?> toJson() => {
    'status': 'awaiting-confirmation',
    'candidateId': candidateId,
    'storeId': storeId,
    'protocolVersion': protocolVersion,
    'inspectedAt': inspectedAt,
    'bytes': bytes,
    'snapshots': snapshots
        .map((snapshot) => snapshot.toJson())
        .toList(growable: false),
  };
}

enum EntityGraphDevtoolsHistoryImportInspectionRejectionReason {
  invalidEnvelope('invalid-envelope'),
  wrongStore('wrong-store'),
  unsupportedVersion('unsupported-version'),
  snapshotLimitExceeded('snapshot-limit-exceeded'),
  byteLimitExceeded('byte-limit-exceeded'),
  candidatePending('candidate-pending'),
  timeTravelUnavailable('time-travel-unavailable'),
  disposed('disposed');

  const EntityGraphDevtoolsHistoryImportInspectionRejectionReason(
    this.wireName,
  );
  final String wireName;
}

final class EntityGraphDevtoolsHistoryImportRejectedReceipt
    extends EntityGraphDevtoolsHistoryImportInspectionResult {
  const EntityGraphDevtoolsHistoryImportRejectedReceipt({
    required this.reason,
    required this.message,
  });

  final EntityGraphDevtoolsHistoryImportInspectionRejectionReason reason;
  final String message;

  @override
  Map<String, Object?> toJson() => {
    'status': 'rejected',
    'reason': reason.wireName,
    'message': message,
  };
}

final class EntityGraphDevtoolsConfirmHistoryImport {
  const EntityGraphDevtoolsConfirmHistoryImport({
    required this.candidateId,
    required this.cursor,
  });

  final String candidateId;
  final int cursor;

  Map<String, Object?> toJson() => {
    'candidateId': candidateId,
    'cursor': cursor,
    'confirm': true,
  };
}

sealed class EntityGraphDevtoolsHistoryImportCancellationResult {
  const EntityGraphDevtoolsHistoryImportCancellationResult();
  Map<String, Object?> toJson();
}

final class EntityGraphDevtoolsHistoryImportCancellationReceipt
    extends EntityGraphDevtoolsHistoryImportCancellationResult {
  const EntityGraphDevtoolsHistoryImportCancellationReceipt({
    required this.candidateId,
    required this.cancelled,
  });

  final String candidateId;
  final bool cancelled;

  @override
  Map<String, Object?> toJson() => {
    'status': cancelled ? 'cancelled' : 'not-pending',
    'candidateId': candidateId,
    'cancelled': cancelled,
  };
}

enum EntityGraphDevtoolsHistoryImportCancellationRejectionReason {
  candidateMismatch('candidate-mismatch'),
  timeTravelUnavailable('time-travel-unavailable'),
  disposed('disposed');

  const EntityGraphDevtoolsHistoryImportCancellationRejectionReason(
    this.wireName,
  );
  final String wireName;
}

final class EntityGraphDevtoolsHistoryImportCancellationRejectedReceipt
    extends EntityGraphDevtoolsHistoryImportCancellationResult {
  const EntityGraphDevtoolsHistoryImportCancellationRejectedReceipt({
    required this.reason,
    required this.message,
  });

  final EntityGraphDevtoolsHistoryImportCancellationRejectionReason reason;
  final String message;

  @override
  Map<String, Object?> toJson() => {
    'status': 'rejected',
    'reason': reason.wireName,
    'message': message,
  };
}

sealed class EntityGraphDevtoolsHistoryImportRestoreResult {
  const EntityGraphDevtoolsHistoryImportRestoreResult();
  Map<String, Object?> toJson();
}

final class EntityGraphDevtoolsHistoryImportRestoreReceipt
    extends EntityGraphDevtoolsHistoryImportRestoreResult {
  const EntityGraphDevtoolsHistoryImportRestoreReceipt({
    required this.candidateId,
    required this.cursor,
    required this.previousCursor,
    required this.previousSource,
    required this.changedAt,
  });

  final String candidateId;
  final int cursor;
  final int? previousCursor;
  final EntityGraphDevtoolsSnapshotSource? previousSource;
  final String changedAt;

  @override
  Map<String, Object?> toJson() => {
    'status': 'rewound',
    'source': EntityGraphDevtoolsSnapshotSource.imported.wireName,
    'candidateId': candidateId,
    'cursor': cursor,
    'previousCursor': previousCursor,
    'previousSource': previousSource?.wireName,
    'changedAt': changedAt,
  };
}

enum EntityGraphDevtoolsHistoryImportRestoreRejectionReason {
  candidateNotFound('candidate-not-found'),
  snapshotNotFound('snapshot-not-found'),
  activePreview('active-preview'),
  restoreFailed('restore-failed'),
  timeTravelUnavailable('time-travel-unavailable'),
  disposed('disposed');

  const EntityGraphDevtoolsHistoryImportRestoreRejectionReason(this.wireName);
  final String wireName;
}

final class EntityGraphDevtoolsHistoryImportRestoreRejectedReceipt
    extends EntityGraphDevtoolsHistoryImportRestoreResult {
  const EntityGraphDevtoolsHistoryImportRestoreRejectedReceipt({
    required this.reason,
    required this.message,
  });

  final EntityGraphDevtoolsHistoryImportRestoreRejectionReason reason;
  final String message;

  @override
  Map<String, Object?> toJson() => {
    'status': 'rejected',
    'reason': reason.wireName,
    'message': message,
  };
}

final class EntityGraphDevtoolsPreviewEntityPatch {
  EntityGraphDevtoolsPreviewEntityPatch({
    required this.type,
    required this.id,
    required Map<String, Object?> patch,
  }) : patch = Map.unmodifiable(patch);

  final String type;
  final String id;
  final Map<String, Object?> patch;

  Map<String, Object?> toJson() => {'type': type, 'id': id, 'patch': patch};
}

final class EntityGraphDevtoolsRestoreEntityPreview {
  const EntityGraphDevtoolsRestoreEntityPreview({required this.previewId});

  final String previewId;

  Map<String, Object?> toJson() => {'previewId': previewId};
}

final class EntityGraphDevtoolsPreviewAppliedReceipt {
  const EntityGraphDevtoolsPreviewAppliedReceipt({
    required this.previewId,
    required this.entity,
    required this.priorPatch,
    required this.previewPatch,
    required this.appliedPatch,
    required this.baselineRevision,
    required this.previewRevision,
    required this.appliedAt,
  });

  final String previewId;
  final EntityGraphDevtoolsViewMembership entity;
  final Object? priorPatch;
  final Object? previewPatch;
  final Object? appliedPatch;
  final int baselineRevision;
  final int previewRevision;
  final String appliedAt;

  Map<String, Object?> toJson() => {
    'previewId': previewId,
    'entity': entity.toJson(),
    'priorPatch': priorPatch,
    'previewPatch': previewPatch,
    'appliedPatch': appliedPatch,
    'baselineRevision': baselineRevision,
    'previewRevision': previewRevision,
    'appliedAt': appliedAt,
  };
}

sealed class EntityGraphDevtoolsPreviewRestoreReceipt {
  const EntityGraphDevtoolsPreviewRestoreReceipt({required this.previewId});
  final String previewId;
  Map<String, Object?> toJson();
}

final class EntityGraphDevtoolsPreviewRestoredReceipt
    extends EntityGraphDevtoolsPreviewRestoreReceipt {
  const EntityGraphDevtoolsPreviewRestoredReceipt({
    required super.previewId,
    required this.restoredPatch,
    required this.observedRevision,
    required this.restoredAt,
  });

  final Object? restoredPatch;
  final int observedRevision;
  final String restoredAt;

  @override
  Map<String, Object?> toJson() => {
    'previewId': previewId,
    'status': 'restored',
    'restoredPatch': restoredPatch,
    'observedRevision': observedRevision,
    'restoredAt': restoredAt,
  };
}

final class EntityGraphDevtoolsPreviewConflictReceipt
    extends EntityGraphDevtoolsPreviewRestoreReceipt {
  const EntityGraphDevtoolsPreviewConflictReceipt({
    required super.previewId,
    required this.expectedRevision,
    required this.observedRevision,
    required this.currentPatch,
    required this.priorPatch,
  });

  final int expectedRevision;
  final int observedRevision;
  final Object? currentPatch;
  final Object? priorPatch;

  String get reason => 'entity-changed-since-preview';

  @override
  Map<String, Object?> toJson() => {
    'previewId': previewId,
    'status': 'conflict',
    'reason': reason,
    'expectedRevision': expectedRevision,
    'observedRevision': observedRevision,
    'currentPatch': currentPatch,
    'priorPatch': priorPatch,
  };
}

enum EntityGraphDevtoolsValuePolicyMode {
  metadataOnly('metadata-only'),
  include('include');

  const EntityGraphDevtoolsValuePolicyMode(this.wireName);
  final String wireName;
}

enum EntityGraphDevtoolsValueSide {
  before('before'),
  after('after');

  const EntityGraphDevtoolsValueSide(this.wireName);
  final String wireName;
}

enum EntityGraphDevtoolsValueDestination {
  history('history'),
  inspection('inspection');

  const EntityGraphDevtoolsValueDestination(this.wireName);
  final String wireName;
}

/// Context supplied to a host-owned value redactor before retention or
/// serialization. [fieldPath] members are strings or integer indexes.
final class EntityGraphDevtoolsValueContext {
  EntityGraphDevtoolsValueContext({
    required this.storeId,
    required this.category,
    required this.key,
    required this.id,
    required Iterable<Object> fieldPath,
    required this.side,
    required this.destination,
  }) : fieldPath = List.unmodifiable(fieldPath);

  final String storeId;
  final EntityGraphDevtoolsChangeCategory category;
  final String key;
  final String? id;
  final List<Object> fieldPath;
  final EntityGraphDevtoolsValueSide side;
  final EntityGraphDevtoolsValueDestination destination;
}

typedef EntityGraphDevtoolsValueRedactor =
    Object? Function(Object? value, EntityGraphDevtoolsValueContext context);

/// Host-owned policy applied before values enter retained history or any
/// serialized envelope. A transport cannot escalate this policy.
final class EntityGraphDevtoolsValuePolicy {
  const EntityGraphDevtoolsValuePolicy.metadataOnly()
    : mode = EntityGraphDevtoolsValuePolicyMode.metadataOnly,
      redact = null;

  const EntityGraphDevtoolsValuePolicy.include({this.redact})
    : mode = EntityGraphDevtoolsValuePolicyMode.include;

  final EntityGraphDevtoolsValuePolicyMode mode;
  final EntityGraphDevtoolsValueRedactor? redact;

  bool get includesValues => mode == EntityGraphDevtoolsValuePolicyMode.include;
}
