// Kebab-case subject plus Flutter's required _test.dart discovery suffix.
// ignore_for_file: file_names

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:prometheus_flutter_showcase/app.dart';
import 'package:prometheus_flutter_showcase/domain/models.dart';

import 'test_harness.dart';

Future<void> pumpApp(
  WidgetTester tester,
  ShowcaseHarness harness, {
  Size surfaceSize = const Size(960, 700),
}) async {
  await tester.binding.setSurfaceSize(surfaceSize);
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: harness.container(),
      child: const PrometheusShowcaseApp(),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('seeded tasks render sorted with the project header', (
    tester,
  ) async {
    final harness = ShowcaseHarness();
    await pumpApp(tester, harness);

    expect(find.text('Prometheus Tasks'), findsOneWidget);
    expect(find.text('Atlas 3.0'), findsOneWidget);
    expect(find.text('Ship the graph schema'), findsOneWidget);
    expect(find.text('Wire realtime sync'), findsOneWidget);
    // Foreign-tenant and other-project tasks never enter this list.
    expect(find.text('Foreign tenant task'), findsNothing);

    final schema = tester.getTopLeft(find.text('Ship the graph schema'));
    final sync = tester.getTopLeft(find.text('Wire realtime sync'));
    expect(schema.dy, lessThan(sync.dy));
  });

  testWidgets('optimistic toggle confirms through the canonical graph', (
    tester,
  ) async {
    final harness = ShowcaseHarness();
    await pumpApp(tester, harness);

    await tester.tap(
      find.descendant(
        of: find.ancestor(
          of: find.text('Wire realtime sync'),
          matching: find.byType(ListTile),
        ),
        matching: find.byType(Checkbox),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['status'],
      'done',
    );
    expect(find.text('done · v1'), findsOneWidget);
  });

  testWidgets('injected transport failure rolls the toggle back exactly', (
    tester,
  ) async {
    final harness = ShowcaseHarness();
    harness.taskTransport.failNextUpdate = true;
    await pumpApp(tester, harness);

    await tester.tap(
      find.descendant(
        of: find.ancestor(
          of: find.text('Wire realtime sync'),
          matching: find.byType(ListTile),
        ),
        matching: find.byType(Checkbox),
      ),
    );
    await tester.pumpAndSettle();

    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['status'],
      'todo',
    );
    expect(harness.graph.readEntity('Task', 'task-sync')?['status'], 'todo');
    expect(find.text('todo · v1'), findsOneWidget);
  });

  testWidgets('detail sheet save propagates to the list join', (tester) async {
    final harness = ShowcaseHarness();
    await pumpApp(tester, harness);

    await tester.tap(find.text('Wire realtime sync'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.byKey(const Key('task-title-field')),
      'Wire realtime sync v2',
    );
    // Let the edit-buffer rebuild enable the save button before tapping.
    await tester.pump();
    await tester.tap(find.byKey(const Key('task-save-button')));
    await tester.pumpAndSettle();

    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['title'],
      'Wire realtime sync v2',
    );
    // The list view behind the sheet reads the same canonical entity.
    expect(find.text('Wire realtime sync v2'), findsWidgets);
  });

  testWidgets('coalesced realtime burst updates every joined view once', (
    tester,
  ) async {
    final harness = ShowcaseHarness();
    await pumpApp(tester, harness);

    final syncSeed = harness.graph.readCanonicalEntity('Task', 'task-sync')!;
    final schemaSeed = harness.graph.readCanonicalEntity(
      'Task',
      'task-schema',
    )!;
    final v2 = {...syncSeed, 'version': 2};
    final v3 = {...syncSeed, 'version': 3};
    final schemaV2 = {...schemaSeed, 'version': 2};
    final emitted = harness.taskTransport.simulateRealtimeBurst([
      ChangeEvent<DemoTask>(
        op: ChangeOp.update,
        id: 'task-sync',
        row: DemoTask.fromGraph(v2),
      ),
      ChangeEvent<DemoTask>(
        op: ChangeOp.update,
        id: 'task-sync',
        row: DemoTask.fromGraph(v3),
      ),
      ChangeEvent<DemoTask>(
        op: ChangeOp.update,
        id: 'task-schema',
        row: DemoTask.fromGraph(schemaV2),
      ),
    ]);
    await tester.pumpAndSettle();

    // Three queued events coalesce to one per entity id before the flush.
    expect(emitted, hasLength(2));
    expect(harness.taskTransport.realtimeBuffer.queuedSinceFlush, 3);
    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['version'],
      3,
    );
    expect(
      harness.graph.readCanonicalEntity('Task', 'task-schema')?['version'],
      2,
    );
    expect(find.text('todo · v3'), findsOneWidget);
    expect(find.text('in-progress · v2'), findsOneWidget);
  });

  testWidgets('empty list renders the empty state', (tester) async {
    final harness = ShowcaseHarness(taskSeed: const []);
    await pumpApp(tester, harness);
    expect(find.text('No tasks yet'), findsOneWidget);
  });

  testWidgets('list failure renders the error state with retry', (
    tester,
  ) async {
    final harness = ShowcaseHarness(taskSeed: const []);
    harness.taskTransport.failList = true;
    await pumpApp(tester, harness);
    // Bounded retry (1 call + 2 backoff retries at 200/400 ms) outlives
    // pumpAndSettle; advance the fake clock until the retries are exhausted.
    for (var i = 0; i < 10; i++) {
      await tester.pump(const Duration(milliseconds: 500));
    }
    expect(find.textContaining('Failed to load tasks'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });

  testWidgets('loading state shows an accessible indicator', (tester) async {
    final harness = ShowcaseHarness();
    await tester.binding.setSurfaceSize(const Size(960, 700));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: harness.container(),
        child: const PrometheusShowcaseApp(),
      ),
    );
    // First frame, before the hybrid remote fetch resolves.
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    await tester.pumpAndSettle();
  });
}
