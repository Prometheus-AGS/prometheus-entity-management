import '../graph.dart';
import 'protocol.dart';

/// Receives one controller attachment lifecycle event.
typedef EntityGraphDevtoolsLifecycleListener =
    void Function(EntityGraphDevtoolsLifecycleEvent event);

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
  }) : _graph = graph;

  final EntityGraph _graph;

  /// Stable wire identity for this controller while its graph is attached.
  final String storeId;

  /// Host-owned policy that later projection and transport layers must obey.
  final EntityGraphDevtoolsValuePolicy valuePolicy;

  final List<EntityGraphDevtoolsLifecycleEvent> _lifecycleEvents = [];
  final Set<EntityGraphDevtoolsLifecycleListener> _lifecycleListeners = {};

  var _sequence = 0;
  var _disposed = false;

  /// Whether the final binding has detached and released this controller.
  bool get isDisposed => _disposed;

  bool _owns(EntityGraph graph) => identical(_graph, graph);

  /// Lifecycle audit records retained independently of graph entity data.
  List<EntityGraphDevtoolsLifecycleEvent> get lifecycleEvents =>
      List.unmodifiable(_lifecycleEvents);

  /// Observe attachment lifecycle changes.
  ///
  /// When [replay] is true, retained lifecycle records are delivered before
  /// the listener begins receiving live records. Tooling listeners are
  /// isolated so an inspector failure cannot interrupt the production graph.
  void Function() subscribeLifecycle(
    EntityGraphDevtoolsLifecycleListener listener, {
    bool replay = false,
  }) {
    if (replay) {
      for (final event in List.of(_lifecycleEvents)) {
        _deliver(listener, event);
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

  void _publishLifecycle(EntityGraphDevtoolsLifecycleState state) {
    final sequence = ++_sequence;
    final eventId = '$storeId:$sequence';
    final event = EntityGraphDevtoolsLifecycleEvent(
      storeId: storeId,
      sequence: sequence,
      eventId: eventId,
      correlationId: eventId,
      observedAt: DateTime.now().toUtc().toIso8601String(),
      state: state,
      activeClients: 0,
    );
    _lifecycleEvents.add(event);
    for (final listener in List.of(_lifecycleListeners)) {
      _deliver(listener, event);
    }
  }

  void _dispose() {
    if (_disposed) return;
    _publishLifecycle(EntityGraphDevtoolsLifecycleState.disposed);
    _disposed = true;
    _lifecycleListeners.clear();
  }

  static void _deliver(
    EntityGraphDevtoolsLifecycleListener listener,
    EntityGraphDevtoolsLifecycleEvent event,
  ) {
    try {
      listener(event);
    } on Object {
      // Development tooling is isolated from the owning production graph.
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
  /// Repeated enabled attachments to the same graph share one controller.
  /// [enabled] set to false returns an inert binding and never changes an
  /// existing controller's reference count or lifetime.
  static EntityGraphDevtoolsBinding attach(
    EntityGraph graph, {
    bool enabled = true,
    String? storeId,
    EntityGraphDevtoolsValuePolicy valuePolicy =
        const EntityGraphDevtoolsValuePolicy.metadataOnly(),
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
      );
      entry = _EntityGraphDevtoolsControllerEntry(controller);
      slot.entry = entry;
      controller._publishLifecycle(EntityGraphDevtoolsLifecycleState.attached);
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

  /// Release this binding. Multiple calls are safe and release one reference.
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
