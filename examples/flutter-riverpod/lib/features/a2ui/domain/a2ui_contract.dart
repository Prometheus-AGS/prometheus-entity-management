import '../../entity_management/domain/demo_models.dart';

enum A2uiPolicyOutcome { allowed, requiresApproval, denied }

final class A2uiActionIntent {
  const A2uiActionIntent({
    required this.surfaceId,
    required this.name,
    required this.sourceComponentId,
    required this.context,
  });

  final String surfaceId;
  final String name;
  final String sourceComponentId;
  final Map<String, Object?> context;
}

final class A2uiPolicyDecision {
  const A2uiPolicyDecision({
    required this.outcome,
    required this.reason,
    required this.intent,
  });

  final A2uiPolicyOutcome outcome;
  final String reason;
  final A2uiActionIntent intent;
}

/// Application policy applied after GenUI emits user intent and before any
/// Riverpod controller can mutate the graph.
final class A2uiActionPolicy {
  const A2uiActionPolicy();

  A2uiPolicyDecision evaluate(A2uiActionIntent intent) {
    if (intent.surfaceId != 'surface-task-sync') {
      return _deny(intent, 'The surface is not registered.');
    }
    if (intent.context['tenantId'] != demoTenantId) {
      return _deny(intent, 'The tenant boundary rejected this action.');
    }
    if (intent.context['taskId'] != 'task-sync') {
      return _deny(intent, 'The task context is missing or invalid.');
    }

    return switch (intent.name) {
      'task.update' when _validStatus(intent.context['status']) =>
        A2uiPolicyDecision(
          outcome: A2uiPolicyOutcome.allowed,
          reason: 'Allowlisted task update.',
          intent: intent,
        ),
      'task.update' => _deny(intent, 'The update payload is malformed.'),
      'task.archive' => A2uiPolicyDecision(
        outcome: A2uiPolicyOutcome.requiresApproval,
        reason: 'Archiving requires explicit human approval.',
        intent: intent,
      ),
      'task.delete' => _deny(
        intent,
        'Delete is intentionally absent from the mobile action policy.',
      ),
      _ => _deny(intent, 'The action is not declared by this application.'),
    };
  }

  bool _validStatus(Object? value) =>
      value == 'todo' || value == 'in-progress' || value == 'done';

  A2uiPolicyDecision _deny(A2uiActionIntent intent, String reason) =>
      A2uiPolicyDecision(
        outcome: A2uiPolicyOutcome.denied,
        reason: reason,
        intent: intent,
      );
}
