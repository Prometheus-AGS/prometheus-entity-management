import 'dart:async';
import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../a2ui/application/a2ui_surface_store.dart';
import '../../a2ui/domain/a2ui_contract.dart';
import '../../a2ui/infrastructure/deterministic_fixture.dart';
import 'showcase_controller.dart';

/// The agent workspace's A2UI store.
///
/// It owns the processor for the workspace surface: it loads the shared
/// task-review fixture, swaps in the hostile fixture while the controller
/// asks for it, and hands every renderer action to
/// [ShowcaseController.handleAgentAction], where the application policy
/// decides before any graph mutation.
final agentSurfaceStoreProvider = Provider<A2uiSurfaceStore>((ref) {
  final store = A2uiSurfaceStore(
    surfaceId: agentSurfaceId,
    // As before the 1.0 migration: a surface naming an undeclared action is
    // refused when it loads, not only when the action is pressed.
    declaredActions: const {'task.update', 'task.archive', 'task.delete'},
    onAction: (action) => unawaited(
      ref
          .read(showcaseControllerProvider.notifier)
          .handleAgentAction(
            A2uiActionIntent(
              surfaceId: action.surfaceId,
              name: action.name,
              sourceComponentId: action.sourceComponentId,
              context: Map<String, Object?>.from(action.context),
            ),
          ),
    ),
  );
  ref.onDispose(store.dispose);
  ref.listen<bool>(
    showcaseControllerProvider.select((state) => state.showHostileFixture),
    (_, hostile) => store.load(
      jsonDecode(
        hostile ? hostileUnknownComponentFixture : sharedTaskReviewFixture,
      ),
    ),
    fireImmediately: true,
  );
  return store;
});
