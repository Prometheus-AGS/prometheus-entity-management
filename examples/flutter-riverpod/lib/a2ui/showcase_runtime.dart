/// A2UI runtime wiring for the showcase: the official `a2ui_core`
/// `MessageProcessor` (through [A2uiSurfaceStore]) plus the app-owned action
/// policy bound to the canonical graph.
///
/// Authority is application-owned and fail-closed. The demo agent is keyless
/// and deterministic: it walks the A2A-style lifecycle
/// (submitted → working → completed) and emits the fixed A2UI 1.0 surface
/// messages; user actions come back from the renderer and cross the policy
/// gate before anything can touch the graph.
library;

import 'dart:async';

import 'package:a2ui_core/a2ui_core.dart' show A2uiRendererAction;
import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/foundation.dart';

import '../features/a2ui/application/a2ui_surface_store.dart';
import 'action_policy.dart';
import 'surface_messages.dart';

/// Lifecycle states of the keyless demo agent run.
enum DemoAgentState { idle, submitted, working, completed }

/// Owns the A2UI surface store, the action policy, and the receipt log for
/// one showcase session.
class ShowcaseA2uiRuntime {
  ShowcaseA2uiRuntime({required EntityGraph graph, required String tenantId})
    : policy = A2uiActionPolicy(graph: graph, tenantId: tenantId) {
    surfaces = A2uiSurfaceStore(
      surfaceId: taskBoardSurfaceId,
      onAction: _handleAction,
    );
  }

  /// Processor-backed surface state rendered by the A2UI panel.
  late final A2uiSurfaceStore surfaces;

  final A2uiActionPolicy policy;

  /// Set by the UI layer to route destructive actions through a dialog.
  Future<bool> Function(A2uiApprovalRequest request)? approvalHandler;

  final ValueNotifier<DemoAgentState> agentState = ValueNotifier(
    DemoAgentState.idle,
  );
  final ValueNotifier<List<A2uiActionReceipt>> receipts = ValueNotifier(
    const [],
  );

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
    surfaces.load(
      createTaskBoardSurfaceMessages(
        taskId: taskId,
        title: title,
        status: status,
        tenantId: tenantId,
      ),
    );
    agentState.value = DemoAgentState.completed;
  }

  void _handleAction(A2uiRendererAction action) {
    unawaited(_executeAction(action));
  }

  /// Every renderer action crosses [A2uiActionPolicy.execute] and leaves a
  /// receipt, whatever the verdict.
  Future<void> _executeAction(A2uiRendererAction action) async {
    final receipt = await policy.execute(
      action.toJson(),
      onApproval: (request) async {
        final handler = approvalHandler;
        if (handler == null) return false;
        return handler(request);
      },
    );
    receipts.value = [...receipts.value, receipt];
  }

  void dispose() {
    surfaces.dispose();
    agentState.dispose();
    receipts.dispose();
  }
}
