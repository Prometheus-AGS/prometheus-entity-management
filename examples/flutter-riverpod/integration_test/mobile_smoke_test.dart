import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:prometheus_entity_showcase/features/entity_management/domain/demo_models.dart';

import '../test/support/showcase_test_harness.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('mobile app renders graph and fails hostile A2UI closed', (
    tester,
  ) async {
    final harness = ShowcaseTestHarness.create();
    addTearDown(harness.dispose);

    await harness.pumpApp(tester);

    expect(find.text('PROMETHEUS · ENTITY GRAPH'), findsOneWidget);
    expect(find.text('Prove offline convergence'), findsNWidgets(2));
    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
      'todo',
    );

    await tester.tap(find.text('A2UI agent'));
    await tester.pumpAndSettle();
    expect(find.text('Mark task done'), findsOneWidget);

    await tester.tap(
      find.widgetWithText(
        SwitchListTile,
        'Load hostile unknown-component fixture',
      ),
    );
    await tester.pumpAndSettle();

    expect(
      find.text('This agent-generated surface was rejected safely.'),
      findsOneWidget,
    );
    expect(
      harness.graph.readEntity(demoTaskType, 'task-sync')?['status'],
      'todo',
    );
  });
}
