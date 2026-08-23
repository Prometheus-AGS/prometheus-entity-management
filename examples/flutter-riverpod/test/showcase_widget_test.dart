import 'dart:async';

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:prometheus_entity_showcase/features/entity_management/application/showcase_controller.dart';
import 'package:prometheus_entity_showcase/features/entity_management/domain/demo_models.dart';

import 'support/showcase_test_harness.dart';

Finder _semanticsLabel(String label) => find.byWidgetPredicate(
  (widget) => widget is Semantics && widget.properties.label == label,
  description: 'Semantics label "$label"',
);

final class _ControlledTaskTransport extends EntityTransport<DemoTask> {
  final result = Completer<ListResult<DemoTask>>();

  @override
  bool get authoritative => true;

  @override
  Duration? get staleTime => const Duration(seconds: 30);

  @override
  String identify(DemoTask row) => row.id;

  @override
  Map<String, Object?> toGraph(DemoTask row) => demoTaskToGraph(row);

  @override
  Future<ListResult<DemoTask>> list(ListQuery query) => result.future;
}

void main() {
  testWidgets('phone workspace joins list, detail, project, and assignee', (
    tester,
  ) async {
    final harness = ShowcaseTestHarness.create();
    addTearDown(harness.dispose);
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await harness.pumpApp(tester, surfaceSize: const Size(430, 1400));

    expect(find.text('PROMETHEUS · ENTITY GRAPH'), findsOneWidget);
    expect(_semanticsLabel('Transport online'), findsOneWidget);
    expect(_semanticsLabel('View completeness mode'), findsOneWidget);
    expect(find.text('Prove offline convergence'), findsNWidgets(2));
    expect(find.text('Atlas Migration'), findsWidgets);
    expect(find.text('Grace Example'), findsOneWidget);

    await tester.tap(
      _semanticsLabel('Publish migration guide, project Hermes Launch'),
    );
    await tester.pumpAndSettle();

    expect(find.text('Publish migration guide'), findsNWidgets(2));
    expect(find.text('Hermes Launch'), findsWidgets);
    expect(
      _semanticsLabel('Publish migration guide, project Hermes Launch'),
      findsOneWidget,
    );
  });

  testWidgets('full A2UI flow allows, denies, and requires human approval', (
    tester,
  ) async {
    final harness = ShowcaseTestHarness.create();
    addTearDown(harness.dispose);
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await harness.pumpApp(tester, surfaceSize: const Size(1024, 1400));
    await tester.tap(find.text('A2UI agent'));
    await tester.pumpAndSettle();

    expect(_semanticsLabel('Interactive agent interface'), findsOneWidget);
    expect(find.text('Mark task done'), findsOneWidget);

    await tester.ensureVisible(find.text('Attempt denied delete'));
    await tester.tap(find.text('Attempt denied delete'));
    await tester.pumpAndSettle();
    expect(find.text('task.delete · denied'), findsOneWidget);
    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
      'todo',
    );

    await tester.tap(find.text('Mark task done'));
    await tester.pumpAndSettle();
    expect(find.text('task.update · allowed'), findsOneWidget);
    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
      'done',
    );
    expect(
      find.textContaining('Prove offline convergence · done'),
      findsOneWidget,
    );

    await tester.tap(find.text('Archive with approval'));
    await tester.pumpAndSettle();
    expect(find.text('Human approval required'), findsOneWidget);
    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
      'done',
    );

    await tester.tap(find.text('Deny'));
    await tester.pump();
    expect(find.text('Human approval required'), findsNothing);
    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
      'done',
    );

    await tester.tap(find.text('Archive with approval'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Approve'));
    await tester.pumpAndSettle();
    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
      'archived',
    );

    await tester.tap(
      find.widgetWithText(
        SwitchListTile,
        'Load hostile unknown-component fixture',
      ),
    );
    await tester.pumpAndSettle();
    expect(_semanticsLabel('A2UI validation failed'), findsOneWidget);
    expect(
      find.text('This agent-generated surface was rejected safely.'),
      findsOneWidget,
    );
    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
      'archived',
    );
  });

  testWidgets('remote list exposes loading then terminal error semantics', (
    tester,
  ) async {
    final transport = _ControlledTaskTransport();
    final harness = ShowcaseTestHarness.create(taskTransport: transport);
    addTearDown(harness.dispose);
    addTearDown(() => tester.binding.setSurfaceSize(null));
    harness.container
        .read(showcaseControllerProvider.notifier)
        .setCompleteness(ViewCompleteness.remote);

    await harness.pumpApp(
      tester,
      surfaceSize: const Size(1024, 900),
      settle: false,
    );
    await tester.pump();
    expect(_semanticsLabel('Entity data is loading'), findsOneWidget);

    transport.result.completeError(
      const TerminalError('Deterministic list failure', statusCode: 503),
    );
    await tester.pumpAndSettle();

    expect(_semanticsLabel('Entity data failed to load'), findsOneWidget);
    expect(
      find.textContaining('Unable to load the normalized view'),
      findsOneWidget,
    );
  });

  testWidgets('local mode exposes a deterministic empty state', (tester) async {
    final graph = EntityGraph();
    final harness = ShowcaseTestHarness.create(graph: graph);
    addTearDown(harness.dispose);
    addTearDown(() => tester.binding.setSurfaceSize(null));
    graph.removeEntity(demoTaskType, 'task-sync');
    graph.removeEntity(demoTaskType, 'task-docs');
    harness.container
        .read(showcaseControllerProvider.notifier)
        .setCompleteness(ViewCompleteness.local);

    await harness.pumpApp(tester, surfaceSize: const Size(430, 932));

    expect(_semanticsLabel('No matching tasks'), findsWidgets);
    expect(find.text('No todo tasks match this view.'), findsWidgets);
  });
}
