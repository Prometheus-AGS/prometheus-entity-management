// Kebab-case subject plus Flutter's required _test.dart discovery suffix.
// ignore_for_file: file_names

import 'package:flutter_test/flutter_test.dart';
import 'package:prometheus_flutter_showcase/domain/demo_data.dart';
import 'package:prometheus_flutter_showcase/transport/offline_convergence.dart';
import 'package:prometheus_flutter_showcase/transport/persistence_adapter.dart';

import 'test_harness.dart';

void main() {
  group('adapter boundary', () {
    test('saveGraph and loadGraph round-trip canonical entities and lists', () {
      final harness = ShowcaseHarness();
      final adapter = DemoPersistenceAdapter();
      harness.graph.upsertEntity(
        'Task',
        'task-sync',
        demoTasks.firstWhere((task) => task.id == 'task-sync').toGraph(),
      );
      harness.graph.setListResult(
        DemoListKeys.projectTasks,
        const ['task-sync'],
        entityType: 'Task',
        total: 1,
      );

      adapter.saveGraph(
        harness.graph,
        types: const ['Task'],
        listTypes: const {DemoListKeys.projectTasks: 'Task'},
      );

      final restored = ShowcaseHarness();
      final loaded = adapter.loadGraph(restored.graph);
      expect(loaded, 1);
      expect(
        restored.graph.readCanonicalEntity('Task', 'task-sync')?['title'],
        'Wire realtime sync',
      );
      expect(restored.graph.listState(DemoListKeys.projectTasks).ids, [
        'task-sync',
      ]);
    });

    test('patches never cross the persistence boundary', () {
      final harness = ShowcaseHarness();
      final adapter = DemoPersistenceAdapter();
      harness.graph.upsertEntity(
        'Task',
        'task-sync',
        demoTasks.firstWhere((task) => task.id == 'task-sync').toGraph(),
      );
      harness.graph.patchEntity('Task', 'task-sync', const {'_selected': true});

      final snapshot = adapter.saveGraph(harness.graph, types: const ['Task']);
      final rows = (snapshot['entities']! as Map)['Task']! as Map;
      expect((rows['task-sync']! as Map).containsKey('_selected'), isFalse);
      // The merged read still shows the patch locally.
      expect(
        harness.graph.readEntity('Task', 'task-sync')?['_selected'],
        isTrue,
      );
    });

    test('deleteAll and unknown commands are denied fail-closed', () {
      final adapter = DemoPersistenceAdapter();
      expect(
        () => adapter.execute('deleteAll'),
        throwsA(isA<AdapterDeniedError>()),
      );
      expect(
        () => adapter.execute('wipeTenants'),
        throwsA(isA<AdapterDeniedError>()),
      );
      expect(DemoPersistenceAdapter.allowedCommands, {
        'loadGraph',
        'saveGraph',
      });
    });
  });

  group('offline convergence', () {
    test('two clients converge with zero conflicts and matching reload', () {
      final result = runOfflineConvergenceDemo();
      expect(result.convergedClients, 2);
      expect(result.conflicts, 0);
      expect(result.reloadMatches, isTrue);
      expect(result.mergedRow['title'], 'Prove deterministic convergence');
      expect(result.mergedRow['status'], 'in-progress');
    });

    test('conflicting writes to one field keep the base value', () {
      final base = const {'id': 'task-sync', 'title': 'Base'};
      final merge = mergeOfflineRows(
        base: base,
        clientA: const {'id': 'task-sync', 'title': 'A'},
        clientB: const {'id': 'task-sync', 'title': 'B'},
      );
      expect(merge.conflicts, 1);
      expect(merge.merged['title'], 'Base');
    });
  });
}
