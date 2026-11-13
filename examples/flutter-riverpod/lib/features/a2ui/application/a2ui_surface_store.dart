/// Store-owned A2UI 1.0 renderer state for the showcase.
///
/// The official `a2ui_core` [MessageProcessor] owns protocol parsing and
/// validation; this store owns which surface is shown and whether untrusted
/// agent output was refused. Widgets only render the store's notifiers, and
/// user actions leave through the `onAction` callback to the app-owned
/// policy, never to the graph directly.
library;

import 'package:a2ui_core/a2ui_core.dart';
import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:a2ui_flutter/basic_catalog.dart';
import 'package:flutter/foundation.dart';

/// The only messages agent output may carry; renderer function calls and
/// agent function responses are refused.
const _allowedMessages = <String>[
  'createSurface',
  'updateComponents',
  'updateDataModel',
  'deleteSurface',
];

/// The showcase catalog's id. It is not the basic catalog's id: the catalog
/// supports only a subset of the basic components and none of its functions.
const String prometheusFlutterCatalogId =
    'urn:prometheus-ags:a2ui:catalog:flutter-showcase-1.0';

/// The A2UI 1.0 basic catalog, narrowed to the six components the showcase
/// renders and to no client functions, so anything else agent output asks
/// for is an unknown element the processor refuses.
final CatalogImplementation showcaseCatalog = basicCatalog().derive(
  catalogId: prometheusFlutterCatalogId,
  components: const ['Card', 'Column', 'Row', 'Text', 'Button', 'Divider'],
  functions: const <String>[],
);

/// Why the store refused a batch of agent output.
final class A2uiSurfaceRefusal {
  const A2uiSurfaceRefusal({required this.code, required this.message});

  /// The processor's error code, or an app code for an unregistered surface.
  final String code;
  final String message;

  @override
  String toString() => '$code: $message';
}

/// Owns one [MessageProcessor] and the single registered surface it renders.
final class A2uiSurfaceStore {
  A2uiSurfaceStore({
    required this.surfaceId,
    required void Function(A2uiRendererAction action) onAction,
    this.declaredActions,
  }) : processor = MessageProcessor<ComponentImplementation>(
         catalogs: [showcaseCatalog],
         defaultVersion: A2uiProtocolVersion.v1_0,
         validationConfig: const ValidationConfig(
           allowedMessages: _allowedMessages,
         ),
         onAction: onAction,
       );

  /// The only surface id agent output may create.
  final String surfaceId;

  /// When set, a batch naming any action event outside this set is refused
  /// before it reaches the processor. Null leaves action names to the policy.
  final Set<String>? declaredActions;

  /// Official A2UI protocol engine; the only A2UI parser in the example.
  final MessageProcessor<ComponentImplementation> processor;

  /// The rendered surface, or null while nothing valid is loaded.
  final ValueNotifier<SurfaceModel<ComponentImplementation>?> surface =
      ValueNotifier(null);

  /// The last refusal, or null when the loaded batch was accepted.
  final ValueNotifier<A2uiSurfaceRefusal?> refusal = ValueNotifier(null);

  /// Replaces what the store renders with [payload]: an A2UI envelope, a
  /// list of envelopes, or a `{messages: [...]}` wrapper.
  ///
  /// Atomic: when the processor rejects any message, the batch leaves a
  /// surface other than [surfaceId], or that surface has no root component,
  /// every surface is removed and the refusal is published instead of a
  /// partial surface.
  void load(Object? payload) {
    _clear();
    refusal.value = null;
    final undeclared = _undeclaredAction(payload);
    if (undeclared != null) {
      _refuse(
        A2uiSurfaceRefusal(
          code: 'UNDECLARED_ACTION',
          message: 'Action "$undeclared" is not in the declared catalog.',
        ),
      );
      return;
    }
    try {
      processor.processMessages(payload);
    } on A2uiError catch (error) {
      _refuse(A2uiSurfaceRefusal(code: error.code, message: error.message));
      return;
    }
    final registered = processor.model.getSurface(surfaceId);
    final foreign = processor.model.allSurfaces.any((s) => s.id != surfaceId);
    if (registered == null || foreign) {
      _refuse(
        A2uiSurfaceRefusal(
          code: 'UNREGISTERED_SURFACE',
          message: 'Agent output must render exactly surface "$surfaceId".',
        ),
      );
      return;
    }
    // A surface with no root component is incomplete (for example a lone
    // createSurface): refuse it, as the pre-1.0 validator did.
    if (!registered.componentsModel.has('root')) {
      _refuse(
        A2uiSurfaceRefusal(
          code: 'INCOMPLETE_SURFACE',
          message: 'Surface "$surfaceId" has no root component.',
        ),
      );
      return;
    }
    surface.value = registered;
  }

  /// The first action event name in [value] outside [declaredActions].
  String? _undeclaredAction(Object? value) {
    final declared = declaredActions;
    if (declared == null) return null;
    if (value is Map) {
      final action = value['action'];
      if (action is Map) {
        final event = action['event'];
        final name = event is Map ? event['name'] : null;
        if (event is Map && (name is! String || !declared.contains(name))) {
          return '$name';
        }
      }
      for (final entry in value.entries) {
        // Data-model content is data, not components: it declares no actions.
        if (entry.key == 'dataModel' || entry.key == 'updateDataModel') continue;
        final found = _undeclaredAction(entry.value);
        if (found != null) return found;
      }
    } else if (value is List) {
      for (final child in value) {
        final found = _undeclaredAction(child);
        if (found != null) return found;
      }
    }
    return null;
  }

  void _refuse(A2uiSurfaceRefusal reason) {
    _clear();
    refusal.value = reason;
  }

  void _clear() {
    surface.value = null;
    for (final id in [for (final s in processor.model.allSurfaces) s.id]) {
      processor.model.deleteSurface(id);
    }
  }

  void dispose() {
    processor.dispose();
    surface.dispose();
    refusal.dispose();
  }
}
