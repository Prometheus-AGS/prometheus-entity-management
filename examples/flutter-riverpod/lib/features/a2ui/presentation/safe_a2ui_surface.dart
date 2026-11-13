import 'package:a2ui_core/a2ui_core.dart' show SurfaceModel;
import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:flutter/material.dart';

import '../application/a2ui_surface_store.dart';

/// Renders the surface an [A2uiSurfaceStore] holds with the official
/// `a2ui_flutter` renderer, or the store's refusal when the processor
/// rejected the agent output.
///
/// Pure projection of store state: it never parses agent output and never
/// handles actions; those belong to the store and the app-owned policy.
final class SafeA2uiSurface extends StatelessWidget {
  const SafeA2uiSurface({
    required this.store,
    this.placeholder = const Text('No agent surface yet'),
    super.key,
  });

  final A2uiSurfaceStore store;

  /// Shown while no surface is loaded and nothing was refused.
  final Widget placeholder;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<A2uiSurfaceRefusal?>(
      valueListenable: store.refusal,
      builder: (context, refusal, _) {
        if (refusal != null) return _Refusal(refusal: refusal);
        return ValueListenableBuilder<SurfaceModel<ComponentImplementation>?>(
          valueListenable: store.surface,
          builder: (context, surface, _) {
            if (surface == null) return placeholder;
            return Semantics(
              container: true,
              label: 'Interactive agent interface',
              child: A2uiSurface(surface: surface),
            );
          },
        );
      },
    );
  }
}

final class _Refusal extends StatelessWidget {
  const _Refusal({required this.refusal});

  final A2uiSurfaceRefusal refusal;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    label: 'A2UI validation failed',
    child: Card(
      color: Theme.of(context).colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('This agent-generated surface was rejected safely.'),
            const SizedBox(height: 4),
            Text(
              'Processor refusal: ${refusal.code}',
              key: const Key('a2ui-refusal-code'),
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    ),
  );
}
