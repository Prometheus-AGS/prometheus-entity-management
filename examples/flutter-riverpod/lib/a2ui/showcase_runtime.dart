/// A2UI runtime wiring for the showcase: genui's `SurfaceController` plus the
/// app-owned action policy bound to the canonical graph.
///
/// Authority is application-owned and fail-closed. The demo agent is keyless
/// and deterministic: it walks the A2A-style lifecycle
/// (submitted → working → completed) and emits the fixed surface messages;
/// user actions come back through `onSubmit` and cross the policy gate.
library;

import 'dart:async';
import 'dart:convert';

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:genui/genui.dart';

import 'action_policy.dart';
import 'surface_messages.dart';

/// Lifecycle states of the keyless demo agent run.
enum DemoAgentState { idle, submitted, working, completed }

/// Owns the genui controller, the action policy, and the receipt log for one
/// showcase session.
class ShowcaseA2uiRuntime {
  ShowcaseA2uiRuntime({required EntityGraph graph, required String tenantId})
    : policy = A2uiActionPolicy(graph: graph, tenantId: tenantId) {
    _submitSubscription = controller.onSubmit.listen(_handleSubmit);
  }

  /// genui protocol engine; the only A2UI parser/renderer in the example.
  final SurfaceController controller = SurfaceController(
    catalogs: [BasicCatalogItems.asNoAssetCatalog()],
  );

  final A2uiActionPolicy policy;

  /// Set by the UI layer to route destructive actions through a dialog.
  Future<bool> Function(A2uiApprovalRequest request)? approvalHandler;

  final ValueNotifier<DemoAgentState> agentState = ValueNotifier(
    DemoAgentState.idle,
  );
  final ValueNotifier<List<A2uiActionReceipt>> receipts = ValueNotifier(
    const [],
  );

  late final StreamSubscription<ChatMessage> _submitSubscription;

  /// Runs the deterministic agent: lifecycle transitions, then the fixed
  /// surface message sequence for [taskId].
  ///
  /// Synchronous by design: widget tests run on a fake clock where awaiting
  /// even a zero-length delay deadlocks, and the staging transitions are
  /// observable state, not timing behavior.
  Future<void> runDemoAgent({
    required String taskId,
    required String title,
    required String status,
    String tenantId = 'tenant-a',
  }) async {
    agentState.value = DemoAgentState.submitted;
    agentState.value = DemoAgentState.working;
    for (final message in createTaskBoardSurfaceMessages(
      taskId: taskId,
      title: title,
      status: status,
      tenantId: tenantId,
    )) {
      controller.handleMessage(message);
    }
    agentState.value = DemoAgentState.completed;
  }

  Future<void> _handleSubmit(ChatMessage message) async {
    for (final part in message.parts) {
      if (part is! DataPart) continue;
      final UiInteractionPart interaction;
      try {
        interaction = UiInteractionPart.fromDataPart(part);
      } on Object {
        continue;
      }
      final decoded = jsonDecode(interaction.interaction);
      final action = decoded is Map ? decoded['action'] : null;
      final receipt = await policy.execute(
        action is Map
            ? action.cast<String, Object?>()
            : const <String, Object?>{},
        onApproval: (request) async {
          final handler = approvalHandler;
          if (handler == null) return false;
          return handler(request);
        },
      );
      receipts.value = [...receipts.value, receipt];
    }
  }

  void dispose() {
    unawaited(_submitSubscription.cancel());
    agentState.dispose();
    receipts.dispose();
    controller.dispose();
  }
}
