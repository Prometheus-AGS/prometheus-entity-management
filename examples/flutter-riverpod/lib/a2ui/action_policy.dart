/// App-owned fail-closed A2UI action policy (cand-009 adaption).
///
/// genui owns protocol parsing; this policy owns authority. Every action
/// emitted by a rendered surface is evaluated before any graph access:
/// malformed payloads are rejected, unknown actions are denied, tenants must
/// match the session, destructive actions require explicit human approval,
/// and only allowlisted fields of allowlisted entities may be written.
library;

import 'package:entity_graph_flutter/entity_graph_flutter.dart';

/// Policy outcome for a single surface action.
enum A2uiActionDecision { approved, denied, approvalRequired, malformed }

/// Immutable record of a policy decision, rendered in the A2UI panel so the
/// denial path is visible rather than silent.
final class A2uiActionReceipt {
  const A2uiActionReceipt({
    required this.decision,
    required this.actionName,
    required this.reason,
  });

  final A2uiActionDecision decision;
  final String actionName;
  final String reason;

  @override
  String toString() => '${decision.name}: $actionName — $reason';
}

/// Destructive action awaiting a human decision.
final class A2uiApprovalRequest {
  const A2uiApprovalRequest({
    required this.actionName,
    required this.entityType,
    required this.entityId,
    required this.data,
  });

  final String actionName;
  final String entityType;
  final String entityId;
  final Map<String, Object?> data;
}

/// Fail-closed policy gate between genui `onSubmit` events and the graph.
class A2uiActionPolicy {
  A2uiActionPolicy({required this.graph, required this.tenantId});

  /// Actions that may write without additional approval.
  static const allowedActions = <String>{'task.update'};

  /// Allowlisted actions that additionally require human approval.
  static const approvalGatedActions = <String>{'task.replace'};

  /// Entity types actions may target.
  static const allowedEntities = <String>{'Task'};

  /// Fields an action payload may write.
  static const allowedFields = <String>{'title', 'status'};

  /// Canonical graph this policy may write to.
  final EntityGraph graph;

  /// Session tenant every action must match.
  final String tenantId;

  /// Evaluates an action without mutating anything.
  A2uiActionReceipt evaluate(Map<String, Object?> action) {
    final name = action['name'];
    if (name is! String || name.isEmpty) {
      return const A2uiActionReceipt(
        decision: A2uiActionDecision.malformed,
        actionName: '<missing>',
        reason: 'action name is missing or not a string',
      );
    }
    final context = action['context'];
    if (context is! Map) {
      return A2uiActionReceipt(
        decision: A2uiActionDecision.malformed,
        actionName: name,
        reason: 'action context is missing or not an object',
      );
    }
    final tenant = context['tenantId'];
    if (tenant != tenantId) {
      return A2uiActionReceipt(
        decision: A2uiActionDecision.denied,
        actionName: name,
        reason: 'tenant "$tenant" does not match the session tenant',
      );
    }
    final entityType = context['entityType'];
    final entityId = context['entityId'];
    if (!allowedEntities.contains(entityType) || entityId is! String) {
      return A2uiActionReceipt(
        decision: A2uiActionDecision.denied,
        actionName: name,
        reason: 'entity "$entityType" is outside the allowed entity catalog',
      );
    }
    if (approvalGatedActions.contains(name)) {
      return A2uiActionReceipt(
        decision: A2uiActionDecision.approvalRequired,
        actionName: name,
        reason: 'destructive action requires explicit human approval',
      );
    }
    if (!allowedActions.contains(name)) {
      return A2uiActionReceipt(
        decision: A2uiActionDecision.denied,
        actionName: name,
        reason: 'action is not allowlisted; failing closed',
      );
    }
    final data = context['data'];
    if (data is! Map) {
      return A2uiActionReceipt(
        decision: A2uiActionDecision.malformed,
        actionName: name,
        reason: 'action data is missing or not an object',
      );
    }
    final unknownFields = data.keys.where(
      (key) => !allowedFields.contains(key),
    );
    if (unknownFields.isNotEmpty) {
      return A2uiActionReceipt(
        decision: A2uiActionDecision.denied,
        actionName: name,
        reason: 'fields ${unknownFields.toList()} are not allowlisted',
      );
    }
    return A2uiActionReceipt(
      decision: A2uiActionDecision.approved,
      actionName: name,
      reason: 'allowlisted action on session tenant',
    );
  }

  /// Evaluates and, when the verdict allows it, applies the action through
  /// the canonical graph. Denied and malformed actions never touch the graph.
  Future<A2uiActionReceipt> execute(
    Map<String, Object?> action, {
    required Future<bool> Function(A2uiApprovalRequest request) onApproval,
  }) async {
    final verdict = evaluate(action);
    if (verdict.decision == A2uiActionDecision.denied ||
        verdict.decision == A2uiActionDecision.malformed) {
      return verdict;
    }
    final context = action['context']! as Map;
    final entityType = context['entityType']! as String;
    final entityId = context['entityId']! as String;
    final data = Map<String, Object?>.from(
      (context['data'] as Map?)?.cast<String, Object?>() ?? const {},
    );

    if (verdict.decision == A2uiActionDecision.approvalRequired) {
      final approved = await onApproval(
        A2uiApprovalRequest(
          actionName: verdict.actionName,
          entityType: entityType,
          entityId: entityId,
          data: data,
        ),
      );
      if (!approved) {
        return A2uiActionReceipt(
          decision: A2uiActionDecision.denied,
          actionName: verdict.actionName,
          reason: 'human rejected the destructive action',
        );
      }
    }

    final current = graph.readCanonicalEntity(entityType, entityId);
    if (current == null) {
      return A2uiActionReceipt(
        decision: A2uiActionDecision.denied,
        actionName: verdict.actionName,
        reason: 'entity $entityType/$entityId is not in the graph',
      );
    }
    graph.upsertEntity(entityType, entityId, {...current, ...data});
    graph.markEntitySynced(entityType, entityId);
    graph.invalidateListsForType(entityType);
    return verdict;
  }
}
