import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:prometheus_entity_showcase/features/entity_management/domain/demo_models.dart';

import '../test/support/showcase_test_harness.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'mobile app renders the graph, gates A2UI 1.0 actions, and refuses '
    'hostile surfaces',
    (tester) async {
      final harness = ShowcaseTestHarness.create();
      addTearDown(harness.dispose);

      await harness.pumpApp(tester);

      expect(find.text('PROMETHEUS · ENTITY GRAPH'), findsOneWidget);
      expect(find.text('Prove offline convergence'), findsNWidgets(2));
      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
        'todo',
      );

      // The official a2ui_flutter renderer draws the A2UI 1.0 task surface.
      await tester.tap(find.text('A2UI agent'));
      await tester.pumpAndSettle();
      expect(
        find.bySemanticsLabel('Interactive agent interface'),
        findsOneWidget,
      );
      expect(find.text('AGENT RECOMMENDATION'), findsOneWidget);
      expect(find.text('Review: Prove offline convergence'), findsOneWidget);
      expect(find.text('Mark task done'), findsOneWidget);
      expect(find.text('Archive with approval'), findsOneWidget);
      expect(find.text('Attempt denied delete'), findsOneWidget);

      // A non-allowlisted action leaves a denial receipt and no mutation.
      await tester.ensureVisible(find.text('Attempt denied delete'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Attempt denied delete'));
      await tester.pumpAndSettle();
      expect(find.text('task.delete · denied'), findsOneWidget);
      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
        'todo',
      );

      // A policy-approved action leaves a receipt and reaches the graph.
      await tester.ensureVisible(find.text('Mark task done'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Mark task done'));
      await tester.pumpAndSettle();
      expect(find.text('task.update · allowed'), findsOneWidget);
      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
        'done',
      );

      // A batch naming an unknown component is refused by the processor and
      // renders nothing of the agent surface. The switch sits above the
      // surface, so scroll the list back until it is built and visible.
      await tester.dragUntilVisible(
        find.widgetWithText(
          SwitchListTile,
          'Load hostile unknown-component fixture',
        ),
        find.byType(ListView).first,
        const Offset(0, 300),
      );
      await tester.ensureVisible(
        find.widgetWithText(
          SwitchListTile,
          'Load hostile unknown-component fixture',
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(
        find.widgetWithText(
          SwitchListTile,
          'Load hostile unknown-component fixture',
        ),
      );
      await tester.pumpAndSettle();

      expect(find.bySemanticsLabel('A2UI validation failed'), findsOneWidget);
      expect(
        find.text('This agent-generated surface was rejected safely.'),
        findsOneWidget,
      );
      expect(find.textContaining('Processor refusal:'), findsOneWidget);
      expect(
        find.bySemanticsLabel('Interactive agent interface'),
        findsNothing,
      );
      expect(find.text('Mark task done'), findsNothing);
      expect(find.text('ignored'), findsNothing);
      expect(
        harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
        'done',
      );
    },
  );
}
