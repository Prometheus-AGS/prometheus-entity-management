import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:genui/genui.dart';

import '../domain/a2ui_contract.dart';
import '../infrastructure/deterministic_fixture.dart';

typedef A2uiActionCallback = FutureOr<void> Function(A2uiActionIntent action);

/// Official GenUI renderer behind a deliberately narrow catalog and an
/// atomic preflight of untrusted agent output.
final class SafeA2uiSurface extends StatefulWidget {
  const SafeA2uiSurface({
    required this.source,
    required this.onAction,
    super.key,
  });

  final String source;
  final A2uiActionCallback onAction;

  @override
  State<SafeA2uiSurface> createState() => _SafeA2uiSurfaceState();
}

final class _SafeA2uiSurfaceState extends State<SafeA2uiSurface> {
  SurfaceController? _controller;
  A2uiTransportAdapter? _transport;
  StreamSubscription<Object?>? _messageSubscription;
  StreamSubscription<Object?>? _surfaceSubscription;
  StreamSubscription<ChatMessage>? _submitSubscription;
  List<String> _surfaceIds = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _start();
  }

  @override
  void didUpdateWidget(covariant SafeA2uiSurface oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.source != widget.source) {
      _stop();
      _start();
    }
  }

  void _start() {
    try {
      const A2uiEnvelopeValidator().validate(widget.source);
      final catalog = Catalog([
        BasicCatalogItems.card,
        BasicCatalogItems.column,
        BasicCatalogItems.row,
        BasicCatalogItems.text,
        BasicCatalogItems.button,
        BasicCatalogItems.divider,
      ], catalogId: prometheusFlutterCatalogId);
      final controller = SurfaceController(catalogs: [catalog]);
      final transport = A2uiTransportAdapter();
      _controller = controller;
      _transport = transport;
      _messageSubscription = transport.incomingMessages.listen(
        controller.handleMessage,
        onError: _showError,
      );
      _surfaceSubscription = controller.surfaceUpdates.listen(
        (_) => _refreshSurfaces(),
        onError: _showError,
      );
      _submitSubscription = controller.onSubmit.listen(
        _forwardInteraction,
        onError: _showError,
      );
      transport.addChunk('${widget.source.trim()}\n');
    } on Object catch (error, stackTrace) {
      _showError(error, stackTrace);
    }
  }

  void _refreshSurfaces() {
    if (!mounted) return;
    setState(() {
      _surfaceIds = List.unmodifiable(
        _controller?.activeSurfaceIds ?? const <String>[],
      );
    });
  }

  void _forwardInteraction(ChatMessage message) {
    for (final part in message.parts.uiInteractionParts) {
      try {
        final envelope = Map<String, Object?>.from(
          jsonDecode(part.interaction) as Map,
        );
        if (envelope['error'] != null) {
          throw const FormatException('GenUI rejected the surface update');
        }
        final rawAction = envelope['action'];
        if (rawAction is! Map) continue;
        final action = Map<String, Object?>.from(rawAction);
        final surfaceId = action['surfaceId'];
        final name = action['name'];
        final sourceComponentId = action['sourceComponentId'];
        final context = action['context'];
        if (surfaceId is! String ||
            name is! String ||
            sourceComponentId is! String ||
            context is! Map) {
          throw const FormatException('Malformed A2UI action envelope');
        }
        unawaited(
          Future.sync(
            () => widget.onAction(
              A2uiActionIntent(
                surfaceId: surfaceId,
                name: name,
                sourceComponentId: sourceComponentId,
                context: Map<String, Object?>.from(context),
              ),
            ),
          ).catchError(_showError),
        );
      } on Object catch (error, stackTrace) {
        _showError(error, stackTrace);
      }
    }
  }

  void _showError(Object error, [StackTrace? stackTrace]) {
    if (!mounted) return;
    setState(() {
      _surfaceIds = const [];
      _error = 'This agent-generated surface was rejected safely.';
    });
  }

  void _stop() {
    unawaited(_messageSubscription?.cancel());
    unawaited(_surfaceSubscription?.cancel());
    unawaited(_submitSubscription?.cancel());
    _transport?.dispose();
    _controller?.dispose();
    _transport = null;
    _controller = null;
    _surfaceIds = const [];
  }

  @override
  void dispose() {
    _stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error case final error?) {
      return Semantics(
        liveRegion: true,
        label: 'A2UI validation failed',
        child: Card(
          color: Theme.of(context).colorScheme.errorContainer,
          child: Padding(padding: const EdgeInsets.all(16), child: Text(error)),
        ),
      );
    }
    if (_surfaceIds.isEmpty) {
      return Semantics(
        liveRegion: true,
        label: 'Interactive agent interface is loading',
        child: const Center(child: CircularProgressIndicator()),
      );
    }
    final controller = _controller!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final surfaceId in _surfaceIds)
          Semantics(
            container: true,
            label: 'Interactive agent interface',
            child: Surface(
              surfaceContext: controller.contextFor(surfaceId),
              defaultBuilder: (_) => const SizedBox.shrink(),
            ),
          ),
      ],
    );
  }
}

final class A2uiEnvelopeValidator {
  const A2uiEnvelopeValidator();

  static const _messageKeys = {
    'createSurface',
    'updateComponents',
    'updateDataModel',
    'deleteSurface',
  };
  static const _componentTypes = {
    'Card',
    'Column',
    'Row',
    'Text',
    'Button',
    'Divider',
  };
  static const _declaredActions = {
    'task.update',
    'task.archive',
    'task.delete',
  };

  void validate(String source) {
    var createCount = 0;
    var componentCount = 0;
    for (final line in const LineSplitter().convert(source)) {
      if (line.trim().isEmpty) continue;
      final decoded = jsonDecode(line);
      if (decoded is! Map) {
        throw const FormatException('A2UI frames must be JSON objects');
      }
      final envelope = Map<String, Object?>.from(decoded);
      if (envelope['version'] != prometheusFlutterProtocolVersion) {
        throw const FormatException('Unsupported A2UI version');
      }
      final present = _messageKeys.where(envelope.containsKey).toList();
      if (present.length != 1) {
        throw const FormatException('A2UI frames need exactly one message');
      }
      switch (present.single) {
        case 'createSurface':
          createCount += 1;
          _validateCreate(envelope['createSurface']);
        case 'updateComponents':
          componentCount += 1;
          _validateComponents(envelope['updateComponents']);
        case 'updateDataModel':
          _validateSurfaceMessage(envelope['updateDataModel']);
        case 'deleteSurface':
          _validateSurfaceMessage(envelope['deleteSurface']);
      }
    }
    if (createCount != 1 || componentCount == 0) {
      throw const FormatException('A complete A2UI surface is required');
    }
  }

  void _validateCreate(Object? raw) {
    final value = _map(raw);
    if (value['surfaceId'] != 'surface-task-sync' ||
        value['catalogId'] != prometheusFlutterCatalogId) {
      throw const FormatException('Unregistered A2UI surface or catalog');
    }
  }

  void _validateSurfaceMessage(Object? raw) {
    final value = _map(raw);
    if (value['surfaceId'] != 'surface-task-sync') {
      throw const FormatException('Unregistered A2UI surface');
    }
  }

  void _validateComponents(Object? raw) {
    final value = _map(raw);
    _validateSurfaceMessage(value);
    final components = value['components'];
    if (components is! List || components.isEmpty) {
      throw const FormatException('A2UI components are required');
    }
    final ids = <String>{};
    for (final rawComponent in components) {
      final component = _map(rawComponent);
      final id = component['id'];
      final type = component['component'];
      if (id is! String || id.isEmpty || !ids.add(id)) {
        throw const FormatException('Component IDs must be unique strings');
      }
      if (type is! String || !_componentTypes.contains(type)) {
        throw const FormatException('Component is not in the safe catalog');
      }
      if (type == 'Button') _validateAction(component['action']);
    }
    if (!ids.contains('root')) {
      throw const FormatException('A2UI surface needs a root component');
    }
  }

  void _validateAction(Object? raw) {
    final action = _map(raw);
    if (action.containsKey('functionCall')) {
      throw const FormatException('Client functions are not permitted');
    }
    final event = _map(action['event']);
    if (!_declaredActions.contains(event['name']) || event['context'] is! Map) {
      throw const FormatException('Action is not in the declared catalog');
    }
  }

  Map<String, Object?> _map(Object? value) {
    if (value is! Map) throw const FormatException('Expected object');
    return Map<String, Object?>.from(value);
  }
}
