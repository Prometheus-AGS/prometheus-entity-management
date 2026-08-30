import 'dart:convert';
import 'dart:developer' as developer;

import '../graph.dart';
import '../sdl.dart';
import 'protocol.dart';

part 'commands.dart';
part 'history.dart';
part 'preview.dart';
part 'projection.dart';
part 'vm_service.dart';

/// Receives one controller attachment lifecycle event.
typedef EntityGraphDevtoolsLifecycleListener =
    void Function(EntityGraphDevtoolsLifecycleEvent event);

/// Receives one live protocol event from an attached controller.
typedef EntityGraphDevtoolsEventListener =
    void Function(EntityGraphDevtoolsEvent event);

/// The one development-tooling controller owned by an attached [EntityGraph].
///
/// Controllers are created through [EntityGraphDevtoolsBinding.attach]. Their
/// lifetime is reference-counted by bindings; callers cannot dispose a shared
/// controller out from under another attachment.
final class EntityGraphDevtoolsController {
  EntityGraphDevtoolsController._({
    required EntityGraph graph,
    required this.storeId,
    required this.valuePolicy,
    required this.schema,
    required this.vmServiceEnabled,
    required int? historyLimit,
    required int? historyBytesLimit,
    required int? eventBytesLimit,
    required int? snapshotLimit,
    required int? snapshotBytesLimit,
  }) : _graph = graph,
       historyLimit = _boundedLimit(historyLimit, 500),
       historyBytesLimit = _boundedLimit(historyBytesLimit, 5 * 1024 * 1024),
       eventBytesLimit = _boundedLimit(eventBytesLimit, 256 * 1024, 1024),
       snapshotLimit = _boundedLimit(snapshotLimit, 50),
       snapshotBytesLimit = _boundedLimit(
         snapshotBytesLimit,
         10 * 1024 * 1024,
       ) {
    final timeTravelCommands = timeTravelEnabled
        ? const [
            EntityGraphDevtoolsCommandName.getTimeTravelStatus,
            EntityGraphDevtoolsCommandName.rewind,
            EntityGraphDevtoolsCommandName.returnToLive,
            EntityGraphDevtoolsCommandName.inspectHistoryImport,
            EntityGraphDevtoolsCommandName.confirmHistoryImport,
          ]
        : const <EntityGraphDevtoolsCommandName>[];
    final timeTravelFeatures = timeTravelEnabled
        ? const [
            EntityGraphDevtoolsFeature.snapshotHistory,
            EntityGraphDevtoolsFeature.timeTravel,
            EntityGraphDevtoolsFeature.historyImport,
          ]
        : const <EntityGraphDevtoolsFeature>[];
    capabilities = EntityGraphDevtoolsCapabilities(
      commands: [
        EntityGraphDevtoolsCommandName.getCapabilities,
        EntityGraphDevtoolsCommandName.getSnapshot,
        EntityGraphDevtoolsCommandName.getHistory,
        EntityGraphDevtoolsCommandName.getHistoryStatus,
        EntityGraphDevtoolsCommandName.getEntityRecords,
        EntityGraphDevtoolsCommandName.getViews,
        EntityGraphDevtoolsCommandName.getRelationships,
        EntityGraphDevtoolsCommandName.previewEntityPatch,
        EntityGraphDevtoolsCommandName.restoreEntityPreview,
        ...timeTravelCommands,
        EntityGraphDevtoolsCommandName.clearHistory,
      ],
      features: [
        EntityGraphDevtoolsFeature.semanticEvents,
        EntityGraphDevtoolsFeature.diagnosticEvents,
        EntityGraphDevtoolsFeature.boundedHistory,
        EntityGraphDevtoolsFeature.multiClient,
        EntityGraphDevtoolsFeature.multiStore,
        EntityGraphDevtoolsFeature.entityInspection,
        EntityGraphDevtoolsFeature.viewInspection,
        EntityGraphDevtoolsFeature.relationshipInspection,
        EntityGraphDevtoolsFeature.localPreview,
        ...timeTravelFeatures,
      ],
      limits: EntityGraphDevtoolsLimits(
        historyEvents: this.historyLimit,
        historyBytes: this.historyBytesLimit,
        eventBytes: this.eventBytesLimit,
        snapshots: this.snapshotLimit,
        snapshotBytes: this.snapshotBytesLimit,
      ),
    );
  }

  final EntityGraph _graph;

  /// Stable wire identity for this controller while its graph is attached.
  final String storeId;

  /// Host-owned policy applied before values enter history or inspection.
  final EntityGraphDevtoolsValuePolicy valuePolicy;

  /// Optional validated schema used exclusively for relationship projection.
  final EntityGraphIR? schema;

  /// Whether this controller is advertised through the isolate VM service.
  final bool vmServiceEnabled;

  final int historyLimit;
  final int historyBytesLimit;
  final int eventBytesLimit;
  final int snapshotLimit;
  final int snapshotBytesLimit;

  /// Versioned commands, features, and simultaneous retention ceilings.
  late final EntityGraphDevtoolsCapabilities capabilities;

  final List<EntityGraphDevtoolsLifecycleEvent> _lifecycleEvents = [];
  final Set<EntityGraphDevtoolsLifecycleListener> _lifecycleListeners = {};
  final Set<EntityGraphDevtoolsEventListener> _eventListeners = {};
  final List<EntityGraphDevtoolsEvent> _history = [];
  final List<int> _historySizes = [];
  final Map<String, int> _entityRevisions = {};
  final Map<String, int> _entityValueRevisions = {};
  final List<_RetainedGraphSnapshot> _retainedSnapshots = [];
  final Map<int, EntityGraphDevtoolsUnavailableSnapshotReference>
  _unavailableSnapshots = {};
  final Map<String, _EntityPreviewReceipt> _previewReceipts = {};
  final Map<String, String> _activePreviewByEntity = {};

  void Function()? _stopViewObservation;
  void Function()? _stopPublicationObservation;
  void Function()? _stopVmService;
  var _sequence = 0;
  var _disposed = false;
  var _retainedEventBytes = 0;
  var _retainedSnapshotBytes = 0;
  var _latestSnapshotCursor = 0;
  int? _baselineSnapshotCursor;
  var _clearedThroughSnapshotCursor = 0;
  EntityGraphDevtoolsUnavailableSnapshotReference? _lastUnavailableSnapshot;
  var _historyMode = EntityGraphDevtoolsHistoryMode.live;
  int? _activeSnapshotCursor;
  EntityGraphDevtoolsSnapshotSource? _activeSnapshotSource;
  EntityGraphSnapshot? _protectedLiveHead;
  _ImportedGraphCandidate? _importCandidate;
  var _nextImportCandidate = 1;
  var _nextPreviewNumber = 1;
  var _internalReplayDepth = 0;
  var _projectionFailureRevision = 0;

  /// Whether the final binding has detached and released this controller.
  bool get isDisposed => _disposed;

  /// Whether snapshot retention and time travel are enabled.
  bool get timeTravelEnabled => snapshotLimit > 0 && snapshotBytesLimit > 0;

  bool _owns(EntityGraph graph) => identical(_graph, graph);

  /// Lifecycle audit records retained independently of graph entity data.
  List<EntityGraphDevtoolsLifecycleEvent> get lifecycleEvents =>
      List.unmodifiable(_lifecycleEvents);

  /// Observe attachment lifecycle changes.
  void Function() subscribeLifecycle(
    EntityGraphDevtoolsLifecycleListener listener, {
    bool replay = false,
  }) {
    if (replay) {
      for (final event in List.of(_lifecycleEvents)) {
        _deliverLifecycle(listener, event);
      }
    }
    if (_disposed) return _noop;
    _lifecycleListeners.add(listener);
    var subscribed = true;
    return () {
      if (!subscribed) return;
      subscribed = false;
      _lifecycleListeners.remove(listener);
    };
  }

  /// Observe retained replay followed by live semantic events.
  void Function() subscribe(
    EntityGraphDevtoolsEventListener listener, {
    bool replay = false,
  }) {
    if (replay) {
      for (final event in List.of(_history)) {
        _deliverEvent(listener, event);
      }
    }
    if (_disposed) return _noop;
    _eventListeners.add(listener);
    var subscribed = true;
    return () {
      if (!subscribed) return;
      subscribed = false;
      _eventListeners.remove(listener);
    };
  }

  /// Current store counts and both retention-status projections.
  EntityGraphDevtoolsSnapshot getSnapshot() => EntityGraphDevtoolsSnapshot(
    storeId: storeId,
    capturedAt: DateTime.now().toUtc().toIso8601String(),
    counts: _collectCounts(_graph.captureSnapshot()),
    history: getHistoryStatus(),
    snapshots: getSnapshotHistoryStatus(),
  );

  /// Copy of retained bounded semantic history.
  List<EntityGraphDevtoolsEvent> getHistory() => List.unmodifiable(_history);

  EntityGraphDevtoolsHistoryStatus getHistoryStatus() => _historyStatus(this);

  EntityGraphDevtoolsSnapshotHistoryStatus getSnapshotHistoryStatus() =>
      _snapshotHistoryStatus(this);

  List<EntityGraphDevtoolsRetainedSnapshotReference> getSnapshotReferences() =>
      List.unmodifiable(
        _retainedSnapshots.map((snapshot) => snapshot.reference),
      );

  EntityGraphDevtoolsEntityRecordsSnapshot getEntityRecords() =>
      _projectEntityRecords(this);

  EntityGraphDevtoolsViewsSnapshot getViews() => _projectViews(this);

  EntityGraphDevtoolsRelationshipsSnapshot getRelationships() =>
      _projectRelationships(this);

  /// Validate and execute one transport-independent v1 command envelope.
  EntityGraphDevtoolsResult handleCommand(Object? command) =>
      _handleCommand(this, command);

  EntityGraphDevtoolsPreviewAppliedReceipt? previewEntityPatch(
    String type,
    String id,
    Map<String, Object?> patch,
  ) => _applyEntityPreview(this, type, id, patch);

  EntityGraphDevtoolsPreviewRestoreReceipt? restoreEntityPreview(
    String previewId,
  ) => _restoreEntityPreview(this, previewId);

  EntityGraphDevtoolsRewindResult? rewind(int cursor) {
    if (!timeTravelEnabled || _disposed) return null;
    final retained = _retainedSnapshots
        .where((snapshot) => snapshot.reference.cursor == cursor)
        .firstOrNull;
    if (retained == null) return _expiredSnapshotReceipt(this, cursor);
    final transition = _enterRewind(
      this,
      cursor: cursor,
      source: EntityGraphDevtoolsSnapshotSource.retained,
      target: retained.data,
    );
    if (transition == null) return null;
    _projectionFailureRevision += 1;
    final event = _publishTimeTravel(
      state: EntityGraphDevtoolsHistoryMode.rewound,
      cursor: cursor,
      previousCursor: transition.previousCursor,
      source: EntityGraphDevtoolsSnapshotSource.retained,
      previousSource: transition.previousSource,
      reason: EntityGraphDevtoolsTimeTravelReason.command,
    );
    return EntityGraphDevtoolsRewindReceipt(
      cursor: cursor,
      previousCursor: transition.previousCursor,
      previousSource: transition.previousSource,
      changedAt: event.observedAt,
    );
  }

  EntityGraphDevtoolsReturnToLiveReceipt? returnToLive() {
    if (!timeTravelEnabled ||
        _disposed ||
        _historyMode != EntityGraphDevtoolsHistoryMode.rewound ||
        _protectedLiveHead == null ||
        _activeSnapshotCursor == null ||
        _activeSnapshotSource == null) {
      return null;
    }
    final previousCursor = _activeSnapshotCursor!;
    final previousSource = _activeSnapshotSource!;
    try {
      _restoreGraphSnapshot(_protectedLiveHead!);
    } on Object {
      return null;
    }
    _historyMode = EntityGraphDevtoolsHistoryMode.live;
    _activeSnapshotCursor = null;
    _activeSnapshotSource = null;
    _protectedLiveHead = null;
    _projectionFailureRevision += 1;
    final event = _publishTimeTravel(
      state: EntityGraphDevtoolsHistoryMode.live,
      cursor: null,
      previousCursor: previousCursor,
      source: null,
      previousSource: previousSource,
      reason: EntityGraphDevtoolsTimeTravelReason.command,
    );
    return EntityGraphDevtoolsReturnToLiveReceipt(
      previousCursor: previousCursor,
      previousSource: previousSource,
      changedAt: event.observedAt,
    );
  }

  EntityGraphDevtoolsHistoryImportInspectionResult inspectHistoryImport(
    Object? candidate,
  ) => _inspectHistoryImport(this, candidate);

  EntityGraphDevtoolsHistoryImportRestoreResult confirmHistoryImport(
    String candidateId,
    int cursor,
  ) {
    EntityGraphDevtoolsHistoryImportRestoreRejectedReceipt reject(
      EntityGraphDevtoolsHistoryImportRestoreRejectionReason reason,
      String message,
    ) => EntityGraphDevtoolsHistoryImportRestoreRejectedReceipt(
      reason: reason,
      message: message,
    );
    if (_disposed) {
      return reject(
        EntityGraphDevtoolsHistoryImportRestoreRejectionReason.disposed,
        'DevTools controller is disposed',
      );
    }
    if (!timeTravelEnabled) {
      return reject(
        EntityGraphDevtoolsHistoryImportRestoreRejectionReason
            .timeTravelUnavailable,
        'Time travel is disabled for this controller',
      );
    }
    final candidate = _importCandidate;
    if (candidate == null || candidate.candidateId != candidateId) {
      return reject(
        EntityGraphDevtoolsHistoryImportRestoreRejectionReason
            .candidateNotFound,
        'Import candidate $candidateId is no longer awaiting confirmation',
      );
    }
    final snapshot = candidate.snapshots
        .where((candidate) => candidate.cursor == cursor)
        .firstOrNull;
    if (snapshot == null) {
      return reject(
        EntityGraphDevtoolsHistoryImportRestoreRejectionReason.snapshotNotFound,
        'Import candidate $candidateId does not contain cursor $cursor',
      );
    }
    final transition = _enterRewind(
      this,
      cursor: cursor,
      source: EntityGraphDevtoolsSnapshotSource.imported,
      target: snapshot.data,
    );
    if (transition == null) {
      return reject(
        EntityGraphDevtoolsHistoryImportRestoreRejectionReason.restoreFailed,
        'Import candidate $candidateId could not be restored',
      );
    }
    _importCandidate = null;
    _projectionFailureRevision += 1;
    final event = _publishTimeTravel(
      state: EntityGraphDevtoolsHistoryMode.rewound,
      cursor: cursor,
      previousCursor: transition.previousCursor,
      source: EntityGraphDevtoolsSnapshotSource.imported,
      previousSource: transition.previousSource,
      reason: EntityGraphDevtoolsTimeTravelReason.imported,
    );
    return EntityGraphDevtoolsHistoryImportRestoreReceipt(
      candidateId: candidateId,
      cursor: cursor,
      previousCursor: transition.previousCursor,
      previousSource: transition.previousSource,
      changedAt: event.observedAt,
    );
  }

  /// Clear event and snapshot retention without altering the current graph.
  void clearHistory() {
    _history.clear();
    _historySizes.clear();
    _retainedEventBytes = 0;
    _retainedSnapshots.clear();
    _retainedSnapshotBytes = 0;
    _clearedThroughSnapshotCursor = _latestSnapshotCursor;
    _importCandidate = null;
  }

  void _startObservingGraph() {
    if (vmServiceEnabled) _stopVmService = _attachVmController(this);
    _captureGraphSnapshot(this, _graph.captureSnapshot(), null);
    _stopPublicationObservation = _graph.subscribePublications(
      _observePublication,
    );
    _stopViewObservation = _graph.subscribeViewLifecycles(
      _publishViewLifecycle,
    );
    for (final record in _graph.viewRecords) {
      _publishView(
        EntityGraphDevtoolsViewEventState.registered,
        record.definition.viewId,
        record.membership.length,
      );
    }
  }

  void _observePublication(GraphPublication publication) {
    if (_disposed || _internalReplayDepth > 0) return;
    final watch = Stopwatch()..start();
    late final List<EntityGraphDevtoolsChange> changes;
    try {
      changes = _projectChanges(this, publication.before, publication.after);
    } on Object {
      _leaveRewindForMutation();
      _projectionFailureRevision += 1;
      final identity = _nextIdentity();
      _publishEvent(
        EntityGraphDevtoolsDiagnosticEvent(
          storeId: storeId,
          sequence: identity.sequence,
          eventId: identity.eventId,
          correlationId: identity.eventId,
          observedAt: identity.observedAt,
          message: 'A graph publication could not be projected for DevTools.',
          snapshot: _captureGraphSnapshot(
            this,
            publication.after,
            identity.sequence,
          ),
        ),
      );
      return;
    }
    if (changes.isEmpty) return;
    _leaveRewindForMutation();
    _advanceEntityRevisions(this, changes, publication.after);
    final affected = _affectedProjection(
      this,
      changes,
      publication.before,
      publication.after,
    );
    final identity = _nextIdentity();
    watch.stop();
    _publishEvent(
      EntityGraphDevtoolsMutationEvent(
        storeId: storeId,
        sequence: identity.sequence,
        eventId: identity.eventId,
        correlationId: identity.eventId,
        observedAt: identity.observedAt,
        snapshot: _captureGraphSnapshot(
          this,
          publication.after,
          identity.sequence,
        ),
        changes: changes,
        affectedEntities: affected.affectedEntities,
        affectedViewIds: affected.affectedViewIds,
        before: _collectCounts(publication.before),
        after: _collectCounts(publication.after),
        projectionDurationMs: watch.elapsedMicroseconds / 1000,
        valuesTruncated: false,
        changesOmitted: 0,
      ),
    );
  }

  void _restoreGraphSnapshot(EntityGraphSnapshot snapshot) {
    _internalReplayDepth += 1;
    try {
      _graph.restoreSnapshot(snapshot);
    } finally {
      _internalReplayDepth -= 1;
    }
  }

  void _leaveRewindForMutation() {
    if (_historyMode != EntityGraphDevtoolsHistoryMode.rewound ||
        _activeSnapshotCursor == null ||
        _activeSnapshotSource == null) {
      return;
    }
    final previousCursor = _activeSnapshotCursor!;
    final previousSource = _activeSnapshotSource!;
    _historyMode = EntityGraphDevtoolsHistoryMode.live;
    _activeSnapshotCursor = null;
    _activeSnapshotSource = null;
    _protectedLiveHead = null;
    _projectionFailureRevision += 1;
    _publishTimeTravel(
      state: EntityGraphDevtoolsHistoryMode.live,
      cursor: null,
      previousCursor: previousCursor,
      source: null,
      previousSource: previousSource,
      reason: EntityGraphDevtoolsTimeTravelReason.mutation,
    );
  }

  EntityGraphDevtoolsTimeTravelEvent _publishTimeTravel({
    required EntityGraphDevtoolsHistoryMode state,
    required int? cursor,
    required int? previousCursor,
    required EntityGraphDevtoolsSnapshotSource? source,
    required EntityGraphDevtoolsSnapshotSource? previousSource,
    required EntityGraphDevtoolsTimeTravelReason reason,
  }) {
    final identity = _nextIdentity();
    final event = EntityGraphDevtoolsTimeTravelEvent(
      storeId: storeId,
      sequence: identity.sequence,
      eventId: identity.eventId,
      correlationId: identity.eventId,
      observedAt: identity.observedAt,
      state: state,
      cursor: cursor,
      previousCursor: previousCursor,
      source: source,
      previousSource: previousSource,
      reason: reason,
    );
    _publishEvent(event);
    return event;
  }

  void _publishLifecycle(EntityGraphDevtoolsLifecycleState state) {
    final identity = _nextIdentity();
    final event = EntityGraphDevtoolsLifecycleEvent(
      storeId: storeId,
      sequence: identity.sequence,
      eventId: identity.eventId,
      correlationId: identity.eventId,
      observedAt: identity.observedAt,
      state: state,
      activeClients: 0,
    );
    _lifecycleEvents.add(event);
    _publishEvent(event);
    for (final listener in List.of(_lifecycleListeners)) {
      _deliverLifecycle(listener, event);
    }
  }

  void _publishViewLifecycle(GraphViewLifecycleEvent event) {
    _publishView(
      switch (event.state) {
        GraphViewLifecycleState.registered =>
          EntityGraphDevtoolsViewEventState.registered,
        GraphViewLifecycleState.membershipChanged =>
          EntityGraphDevtoolsViewEventState.membershipChanged,
        GraphViewLifecycleState.unregistered =>
          EntityGraphDevtoolsViewEventState.unregistered,
      },
      event.record.definition.viewId,
      event.record.membership.length,
    );
  }

  void _publishView(
    EntityGraphDevtoolsViewEventState state,
    String viewId,
    int membershipCount,
  ) {
    final identity = _nextIdentity();
    _publishEvent(
      EntityGraphDevtoolsViewEvent(
        storeId: storeId,
        sequence: identity.sequence,
        eventId: identity.eventId,
        correlationId: identity.eventId,
        observedAt: identity.observedAt,
        state: state,
        viewId: viewId,
        membershipCount: membershipCount,
      ),
    );
  }

  ({int sequence, String eventId, String observedAt}) _nextIdentity() {
    final sequence = ++_sequence;
    return (
      sequence: sequence,
      eventId: '$storeId:$sequence',
      observedAt: DateTime.now().toUtc().toIso8601String(),
    );
  }

  void _publishEvent(EntityGraphDevtoolsEvent candidate) {
    if (_disposed) return;
    final event = _boundEvent(this, candidate);
    _retainEvent(this, event);
    for (final listener in List.of(_eventListeners)) {
      _deliverEvent(listener, event);
    }
  }

  void _dispose() {
    if (_disposed) return;
    _stopPublicationObservation?.call();
    _stopPublicationObservation = null;
    _stopViewObservation?.call();
    _stopViewObservation = null;
    _publishLifecycle(EntityGraphDevtoolsLifecycleState.disposed);
    _stopVmService?.call();
    _stopVmService = null;
    _disposed = true;
    _lifecycleListeners.clear();
    _eventListeners.clear();
    _history.clear();
    _historySizes.clear();
    _retainedSnapshots.clear();
    _unavailableSnapshots.clear();
    _previewReceipts.clear();
    _activePreviewByEntity.clear();
    _entityRevisions.clear();
    _entityValueRevisions.clear();
    _importCandidate = null;
    _protectedLiveHead = null;
  }

  static void _deliverLifecycle(
    EntityGraphDevtoolsLifecycleListener listener,
    EntityGraphDevtoolsLifecycleEvent event,
  ) {
    try {
      listener(event);
    } on Object {
      // Development tooling is isolated from the owning production graph.
    }
  }

  static void _deliverEvent(
    EntityGraphDevtoolsEventListener listener,
    EntityGraphDevtoolsEvent event,
  ) {
    try {
      listener(event);
    } on Object {
      // Development tooling is isolated from the production graph boundary.
    }
  }

  static void _noop() {}
}

final class _EntityGraphDevtoolsControllerEntry {
  _EntityGraphDevtoolsControllerEntry(this.controller);

  final EntityGraphDevtoolsController controller;
  var references = 0;
}

final class _EntityGraphDevtoolsSlot {
  String? generatedStoreId;
  _EntityGraphDevtoolsControllerEntry? entry;
}

/// Reference-counted attachment to the controller for one [EntityGraph].
final class EntityGraphDevtoolsBinding {
  EntityGraphDevtoolsBinding._({
    required this.enabled,
    required this.controller,
    required void Function() detach,
  }) : _detach = detach;

  static final Expando<_EntityGraphDevtoolsSlot> _slots =
      Expando<_EntityGraphDevtoolsSlot>('entity-graph-devtools');
  static var _nextStoreNumber = 1;

  /// Attach development tooling to [graph].
  ///
  /// Repeated enabled attachments to the same graph share one controller and
  /// the configuration established by the first active attachment. [enabled]
  /// set to false returns an inert binding and changes no reference count.
  static EntityGraphDevtoolsBinding attach(
    EntityGraph graph, {
    bool enabled = true,
    String? storeId,
    EntityGraphDevtoolsValuePolicy valuePolicy =
        const EntityGraphDevtoolsValuePolicy.metadataOnly(),
    EntityGraphIR? schema,
    bool vmServiceEnabled = _vmServiceAvailable,
    int? historyLimit,
    int? historyBytesLimit,
    int? eventBytesLimit,
    int? snapshotLimit,
    int? snapshotBytesLimit,
  }) {
    if (!enabled) {
      return EntityGraphDevtoolsBinding._(
        enabled: false,
        controller: null,
        detach: EntityGraphDevtoolsController._noop,
      );
    }

    final slot = _slots[graph] ??= _EntityGraphDevtoolsSlot();
    var entry = slot.entry;
    if (entry == null ||
        entry.controller.isDisposed ||
        !entry.controller._owns(graph)) {
      final resolvedStoreId =
          storeId ?? (slot.generatedStoreId ??= 'graph-${_nextStoreNumber++}');
      final controller = EntityGraphDevtoolsController._(
        graph: graph,
        storeId: resolvedStoreId,
        valuePolicy: valuePolicy,
        schema: schema,
        vmServiceEnabled: vmServiceEnabled,
        historyLimit: historyLimit,
        historyBytesLimit: historyBytesLimit,
        eventBytesLimit: eventBytesLimit,
        snapshotLimit: snapshotLimit,
        snapshotBytesLimit: snapshotBytesLimit,
      );
      controller._startObservingGraph();
      controller._publishLifecycle(EntityGraphDevtoolsLifecycleState.attached);
      entry = _EntityGraphDevtoolsControllerEntry(controller);
      slot.entry = entry;
    }

    final retainedEntry = entry;
    retainedEntry.references += 1;
    var detached = false;
    return EntityGraphDevtoolsBinding._(
      enabled: true,
      controller: retainedEntry.controller,
      detach: () {
        if (detached) return;
        detached = true;
        final current = slot.entry;
        if (current == null ||
            !identical(current.controller, retainedEntry.controller)) {
          return;
        }
        if (current.references > 0) current.references -= 1;
        if (current.references != 0) return;
        current.controller._dispose();
        if (identical(slot.entry, current)) slot.entry = null;
      },
    );
  }

  /// Whether this binding retained a controller reference.
  final bool enabled;

  /// Shared controller, or `null` for a disabled binding.
  final EntityGraphDevtoolsController? controller;
  final void Function() _detach;

  var _detached = false;

  /// Whether this binding has released its reference.
  bool get isDetached => _detached;

  /// Release this binding. Multiple calls release one reference at most.
  void detach() {
    if (_detached) return;
    _detached = true;
    _detach();
  }

  /// Return the active controller without changing its lifetime.
  static EntityGraphDevtoolsController? controllerFor(EntityGraph graph) {
    final controller = _slots[graph]?.entry?.controller;
    return controller == null || controller.isDisposed ? null : controller;
  }
}
