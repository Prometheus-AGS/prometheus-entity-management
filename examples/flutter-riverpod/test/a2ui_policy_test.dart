// Kebab-case subject plus Flutter's required _test.dart discovery suffix.
// ignore_for_file: file_names

import 'package:flutter_test/flutter_test.dart';
import 'package:prometheus_flutter_showcase/a2ui/action_policy.dart';
import 'package:prometheus_flutter_showcase/domain/demo_data.dart';

import 'test_harness.dart';

Map<String, Object?> _action({
  String name = 'task.update',
  String tenantId = demoTenant,
  Map<String, Object?> data = const {'status': 'done'},
}) => {
  'name': name,
  'surfaceId': 'surface-task-sync',
  'sourceComponentId': 'mark-done',
  'context': {
    'entityType': 'Task',
    'entityId': 'task-sync',
    'tenantId': tenantId,
    'data': data,
  },
};

Future<bool> _approve(A2uiApprovalRequest _) async => true;
Future<bool> _reject(A2uiApprovalRequest _) async => false;

void main() {
  late ShowcaseHarness harness;
  late A2uiActionPolicy policy;

  setUp(() {
    harness = ShowcaseHarness();
    policy = A2uiActionPolicy(graph: harness.graph, tenantId: demoTenant);
    harness.graph.upsertEntity(
      'Task',
      'task-sync',
      demoTasks.firstWhere((task) => task.id == 'task-sync').toGraph(),
    );
  });

  test('allowlisted task.update applies through the canonical graph', () async {
    final receipt = await policy.execute(_action(), onApproval: _approve);
    expect(receipt.decision, A2uiActionDecision.approved);
    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['status'],
      'done',
    );
  });

  test('task.delete is not allowlisted and fails closed', () async {
    final receipt = await policy.execute(
      _action(name: 'task.delete', data: const {}),
      onApproval: _approve,
    );
    expect(receipt.decision, A2uiActionDecision.denied);
    expect(receipt.reason, contains('not allowlisted'));
    expect(harness.graph.readCanonicalEntity('Task', 'task-sync'), isNotNull);
  });

  test('unknown actions fail closed before any graph access', () async {
    final receipt = await policy.execute(
      _action(name: 'graph.wipe'),
      onApproval: _approve,
    );
    expect(receipt.decision, A2uiActionDecision.denied);
  });

  test('malformed payloads are rejected', () async {
    for (final malformed in <Map<String, Object?>>[
      const {},
      const {'name': 42},
      const {'name': 'task.update'},
      const {'name': 'task.update', 'context': 'not-a-map'},
    ]) {
      final receipt = await policy.execute(malformed, onApproval: _approve);
      expect(receipt.decision, A2uiActionDecision.malformed);
      expect(
        harness.graph.readCanonicalEntity('Task', 'task-sync')?['status'],
        'todo',
      );
    }
  });

  test('tenant mismatch is denied', () async {
    final receipt = await policy.execute(
      _action(tenantId: otherTenant),
      onApproval: _approve,
    );
    expect(receipt.decision, A2uiActionDecision.denied);
    expect(receipt.reason, contains('tenant'));
  });

  test('non-allowlisted fields are denied', () async {
    final receipt = await policy.execute(
      _action(data: const {'status': 'done', 'tenantId': 'tenant-b'}),
      onApproval: _approve,
    );
    expect(receipt.decision, A2uiActionDecision.denied);
    expect(receipt.reason, contains('tenantId'));
  });

  test('destructive task.replace requires human approval', () async {
    final rejected = await policy.execute(
      _action(name: 'task.replace', data: const {'title': 'Replaced'}),
      onApproval: _reject,
    );
    expect(rejected.decision, A2uiActionDecision.denied);
    expect(rejected.reason, contains('human rejected'));
    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['title'],
      'Wire realtime sync',
    );

    final approved = await policy.execute(
      _action(name: 'task.replace', data: const {'title': 'Replaced'}),
      onApproval: _approve,
    );
    expect(approved.decision, A2uiActionDecision.approvalRequired);
    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['title'],
      'Replaced',
    );
  });

  test('actions on entities outside the catalog are denied', () async {
    final receipt = await policy.execute(
      _action()
        ..['context'] = {
          'entityType': 'User',
          'entityId': 'user-1',
          'tenantId': demoTenant,
          'data': {'name': 'Eve'},
        },
      onApproval: _approve,
    );
    expect(receipt.decision, A2uiActionDecision.denied);
    expect(receipt.reason, contains('entity catalog'));
  });
}
