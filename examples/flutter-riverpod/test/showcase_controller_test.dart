import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:prometheus_entity_showcase/features/a2ui/domain/a2ui_contract.dart';
import 'package:prometheus_entity_showcase/features/entity_management/application/showcase_controller.dart';
import 'package:prometheus_entity_showcase/features/entity_management/domain/demo_models.dart';
import 'package:prometheus_entity_showcase/features/entity_management/infrastructure/demo_repository.dart';

import 'support/showcase_test_harness.dart';

A2uiActionIntent _action(
  String name, {
  String tenantId = demoTenantId,
  String taskId = 'task-sync',
  Object? status,
}) => A2uiActionIntent(
  surfaceId: 'surface-task-sync',
  name: name,
  sourceComponentId: 'test-button',
  context: {'tenantId': tenantId, 'taskId': taskId, 'status': ?status},
);

void main() {
  late ShowcaseTestHarness harness;
  late ShowcaseController controller;

  setUp(() {
    harness = ShowcaseTestHarness.create();
    controller = harness.container.read(showcaseControllerProvider.notifier);
  });

  tearDown(() => harness.dispose());

  test('seeded graph retains ID-only lists and relationship rows', () {
    expect(harness.graph.listState(demoTaskListKey).ids, [
      'task-docs',
      'task-sync',
    ]);
    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['projectId'],
      'project-atlas',
    );
    expect(
      harness.graph.readEntity(demoProjectType, 'project-atlas')?['name'],
      'Atlas Migration',
    );
    expect(
      harness.graph.readEntity(demoUserType, 'user-grace')?['name'],
      'Grace Example',
    );
  });

  test('optimistic rename is global before server confirmation', () async {
    final before = harness.graph.readCanonicalEntity(
      demoTaskType,
      'task-sync',
    )?['title'];

    final pending = controller.renameSelectedTask();

    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['title'],
      '$before · mobile',
    );
    expect(
      harness.graph.readCanonicalEntity(demoTaskType, 'task-sync')?['title'],
      before,
    );
    expect(
      harness.graph.syncMetadata(demoTaskType, 'task-sync').origin,
      SyncOrigin.optimistic,
    );

    await pending;

    expect(
      harness.graph.readCanonicalEntity(demoTaskType, 'task-sync')?['title'],
      '$before · mobile',
    );
    expect(
      harness.graph.readEntityPatch(demoTaskType, 'task-sync') ?? const {},
      isEmpty,
    );
    expect(
      harness.graph.syncMetadata(demoTaskType, 'task-sync').origin,
      SyncOrigin.server,
    );
    expect(harness.graph.listState(demoTaskListKey).ids, contains('task-sync'));
  });

  test(
    'deterministic rejection restores canonical and optimistic state',
    () async {
      final before = Map<String, Object?>.from(
        harness.graph.readEntity(demoTaskType, 'task-sync')!,
      );

      await controller.demonstrateRollback();

      expect(harness.graph.readEntity(demoTaskType, 'task-sync'), before);
      expect(
        harness.graph.readEntityPatch(demoTaskType, 'task-sync') ?? const {},
        isEmpty,
      );
      expect(
        harness.container.read(showcaseControllerProvider).notice,
        contains('restored canonical state and patches'),
      );
    },
  );

  test(
    'project move invalidates both relationships and related entities',
    () async {
      await controller.moveSelectedTask();

      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['projectId'],
        'project-hermes',
      );
      expect(harness.graph.listState('tasks:project-atlas').stale, isTrue);
      expect(harness.graph.listState('tasks:project-hermes').stale, isTrue);
      expect(
        harness.graph.entityState(demoProjectType, 'project-atlas').stale,
        isTrue,
      );
      expect(
        harness.graph.entityState(demoProjectType, 'project-hermes').stale,
        isTrue,
      );
    },
  );

  test(
    'offline create queues locally and reconnect converges through realtime',
    () async {
      final bridge = harness.container.listen(
        entityChangeBridgeProvider<DemoTask>(type: demoTaskType),
        (_, _) {},
      );
      addTearDown(bridge.close);

      controller.setOnline(false);
      await controller.createTask();
      final createdId = harness.container
          .read(showcaseControllerProvider)
          .selectedTaskId!;

      expect(createdId, 'task-mobile-1');
      expect(
        harness.graph.readEntity(demoTaskType, createdId)?['pendingSync'],
        isTrue,
      );
      expect(harness.repository.status.pendingWrites, 1);
      expect(harness.graph.listState(demoTaskListKey).ids, contains(createdId));

      controller.setOnline(true);

      expect(harness.repository.status.pendingWrites, 0);
      expect(
        harness.graph.readEntity(demoTaskType, createdId)?['pendingSync'],
        isFalse,
      );
      expect(
        harness.container
            .read(showcaseControllerProvider)
            .repositoryStatus
            .isOnline,
        isTrue,
      );
    },
  );

  test(
    'realtime updates task and joined project through generated bridges',
    () {
      final taskBridge = harness.container.listen(
        entityChangeBridgeProvider<DemoTask>(type: demoTaskType),
        (_, _) {},
      );
      final projectBridge = harness.container.listen(
        entityChangeBridgeProvider<DemoProject>(type: demoProjectType),
        (_, _) {},
      );
      addTearDown(taskBridge.close);
      addTearDown(projectBridge.close);

      controller.simulateRealtimeChange();

      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
        'in-progress',
      );
      expect(
        harness.graph.readEntity(demoProjectType, 'project-atlas')?['name'],
        'Atlas 3.0 Migration',
      );
      expect(harness.graph.listState(demoTaskListKey).stale, isTrue);
    },
  );

  test(
    'create and delete clean canonical entities and every ID list',
    () async {
      await controller.createTask();
      final createdId = harness.container
          .read(showcaseControllerProvider)
          .selectedTaskId!;
      expect(harness.graph.readEntity(demoTaskType, createdId), isNotNull);
      expect(harness.graph.listState(demoTaskListKey).ids, contains(createdId));

      await controller.deleteSelectedTask();

      expect(harness.graph.readEntity(demoTaskType, createdId), isNull);
      expect(
        harness.graph.listState(demoTaskListKey).ids,
        isNot(contains(createdId)),
      );
      expect(
        harness.container.read(showcaseControllerProvider).selectedTaskId,
        isNull,
      );
    },
  );

  test(
    'agent policy denies without mutation and gates archive approval',
    () async {
      final before = Map<String, Object?>.from(
        harness.graph.readEntity(demoTaskType, 'task-sync')!,
      );

      await controller.handleAgentAction(_action('task.delete'));
      expect(harness.graph.readEntity(demoTaskType, 'task-sync'), before);
      expect(
        harness.container
            .read(showcaseControllerProvider)
            .lastDecision
            ?.outcome,
        A2uiPolicyOutcome.denied,
      );

      await controller.handleAgentAction(
        _action('task.update', status: 'done'),
      );
      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
        'done',
      );

      await controller.handleAgentAction(_action('task.archive'));
      expect(
        harness.container.read(showcaseControllerProvider).pendingApproval,
        isNotNull,
      );
      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
        'done',
      );

      controller.denyAgentAction();
      expect(
        harness.container.read(showcaseControllerProvider).pendingApproval,
        isNull,
      );
      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
        'done',
      );

      await controller.handleAgentAction(_action('task.archive'));
      await controller.approveAgentAction();
      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
        'archived',
      );
    },
  );

  test('completeness modes remain explicit application state', () {
    for (final mode in ViewCompleteness.values) {
      controller.setCompleteness(mode);
      expect(
        harness.container.read(showcaseControllerProvider).completeness,
        mode,
      );
    }
  });

  test('optional Rust bridge forwards I/O without owning a graph', () async {
    final detachedGraph = EntityGraph();
    final bridge = DemoRustTaskBridge(harness.repository);

    final result = await bridge.list(const ListQuery());
    final found = await bridge.get('task-sync');

    expect(result.rows, hasLength(3));
    expect(found?.id, 'task-sync');
    expect(detachedGraph.entityIds(demoTaskType), isEmpty);
  });
}
