// Kebab-case subject plus Flutter's required _test.dart discovery suffix.
// ignore_for_file: file_names

import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:genui/genui.dart';
import 'package:prometheus_flutter_showcase/a2ui/action_policy.dart';
import 'package:prometheus_flutter_showcase/a2ui/showcase_runtime.dart';
import 'package:prometheus_flutter_showcase/a2ui/surface_messages.dart';
import 'package:prometheus_flutter_showcase/domain/demo_data.dart';

import 'test_harness.dart';

/// Hosts the genui surface exactly as the app panel does.
class _SurfaceHost extends StatefulWidget {
  const _SurfaceHost({required this.runtime});

  final ShowcaseA2uiRuntime runtime;

  @override
  State<_SurfaceHost> createState() => _SurfaceHostState();
}

class _SurfaceHostState extends State<_SurfaceHost> {
  @override
  Widget build(BuildContext context) {
    final runtime = widget.runtime;
    return MaterialApp(
      home: Scaffold(
        body: Column(
          children: [
            StreamBuilder<SurfaceUpdate>(
              stream: runtime.controller.surfaceUpdates,
              builder: (context, _) {
                if (!runtime.controller.activeSurfaceIds.contains(
                  taskBoardSurfaceId,
                )) {
                  return const Text('No agent surface yet');
                }
                return Expanded(
                  child: Surface(
                    surfaceContext: runtime.controller.contextFor(
                      taskBoardSurfaceId,
                    ),
                  ),
                );
              },
            ),
            ValueListenableBuilder<List<A2uiActionReceipt>>(
              valueListenable: runtime.receipts,
              builder: (context, receipts, _) => Column(
                children: [
                  for (final receipt in receipts)
                    Text(
                      receipt.toString(),
                      key: Key('receipt-${receipt.decision.name}'),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bounded settle: genui surfaces keep stream subscriptions open, so the
/// default pumpAndSettle can wait indefinitely; pump a fixed number of frames
/// instead.
Future<void> pumpFrames(WidgetTester tester, [int frames = 20]) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

/// Pumps until the runtime has logged [count] receipts. Policy execution is
/// async: the graph mutation lands inside `execute` while the receipt append
/// is a later continuation, so tests must wait for the receipt itself.
Future<void> pumpUntilReceipts(
  WidgetTester tester,
  ShowcaseA2uiRuntime runtime,
  int count,
) async {
  for (var i = 0; i < 60 && runtime.receipts.value.length < count; i++) {
    await tester.pump(const Duration(milliseconds: 20));
  }
}

void main() {
  late ShowcaseHarness harness;

  setUp(() {
    harness = ShowcaseHarness();
    // The surface acts on canonical graph rows; seed them exactly as the
    // app's transport fetch would.
    for (final task in demoTasks) {
      harness.graph.upsertEntity('Task', task.id, task.toGraph());
    }
  });

  /// Builds the runtime inside the test body on purpose: broadcast stream
  /// controllers bind to the ambient zone at construction, and creating the
  /// runtime in `setUp` (real zone) would strand `onSubmit` continuations
  /// outside the widget test's fake clock.
  Future<ShowcaseA2uiRuntime> pumpSurfaceHost(
    WidgetTester tester, {
    Future<bool> Function(A2uiApprovalRequest)? approvalHandler,
  }) async {
    final runtime = ShowcaseA2uiRuntime(
      graph: harness.graph,
      tenantId: 'tenant-a',
    );
    addTearDown(runtime.dispose);
    runtime.approvalHandler = approvalHandler;
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: harness.container(),
        child: _SurfaceHost(runtime: runtime),
      ),
    );
    await runtime.runDemoAgent(
      taskId: 'task-sync',
      title: 'Wire realtime sync',
      status: 'todo',
    );
    await pumpFrames(tester);
    return runtime;
  }

  testWidgets('deterministic surface messages match the pinned golden', (
    tester,
  ) async {
    final messages = createTaskBoardSurfaceMessages(
      taskId: 'task-sync',
      title: 'Wire realtime sync',
      status: 'todo',
    );
    final actual = messages.map((message) => message.toJson()).toList();
    final goldenFile = File('test/goldens/a2ui-surface-messages.json');
    if (!goldenFile.existsSync()) {
      goldenFile.parent.createSync(recursive: true);
      goldenFile.writeAsStringSync(
        const JsonEncoder.withIndent('  ').convert(actual),
      );
      fail('golden fixture created; re-run to verify');
    }
    final golden = jsonDecode(goldenFile.readAsStringSync());
    expect(actual, golden);
  });

  testWidgets(
    'agent run renders the surface and task.update crosses the policy gate',
    (tester) async {
      final runtime = await pumpSurfaceHost(tester);
      expect(runtime.agentState.value, DemoAgentState.completed);
      expect(find.text('Wire realtime sync'), findsOneWidget);
      expect(find.text('Status: todo'), findsOneWidget);

      await tester.tap(find.text('Mark done'));
      await pumpUntilReceipts(tester, runtime, 1);

      expect(
        harness.graph.readCanonicalEntity('Task', 'task-sync')?['status'],
        'done',
      );
      expect(
        runtime.receipts.value.map((receipt) => receipt.decision),
        contains(A2uiActionDecision.approved),
      );
    },
  );

  testWidgets('task.delete fails closed inside the rendered surface', (
    tester,
  ) async {
    final runtime = await pumpSurfaceHost(tester);

    await tester.tap(find.text('Delete'));
    await pumpUntilReceipts(tester, runtime, 1);

    expect(harness.graph.readCanonicalEntity('Task', 'task-sync'), isNotNull);
    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['status'],
      'todo',
    );
    expect(find.byKey(const Key('receipt-denied')), findsOneWidget);
    expect(find.textContaining('not allowlisted'), findsOneWidget);
  });

  testWidgets('destructive task.replace awaits the human approval dialog', (
    tester,
  ) async {
    final runtime = await pumpSurfaceHost(
      tester,
      approvalHandler: (_) async {
        // The app routes through a dialog; this harness auto-rejects first.
        return false;
      },
    );

    await tester.tap(find.text('Replace title'));
    await pumpUntilReceipts(tester, runtime, 1);
    expect(runtime.receipts.value.single.decision, A2uiActionDecision.denied);
    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['title'],
      'Wire realtime sync',
    );

    runtime.approvalHandler = (_) async => true;
    await tester.tap(find.text('Replace title'));
    await pumpUntilReceipts(tester, runtime, 2);
    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['title'],
      'Wire realtime sync (replaced)',
    );
  });

  testWidgets('malformed interaction payloads fail closed at the sink', (
    tester,
  ) async {
    final runtime = await pumpSurfaceHost(tester);
    // Simulate a malformed interaction arriving at the policy boundary.
    final receipt = await runtime.policy.execute(const {
      'name': 'task.update',
      'context': 42,
    }, onApproval: (_) async => true);
    expect(receipt.decision, A2uiActionDecision.malformed);
    expect(
      harness.graph.readCanonicalEntity('Task', 'task-sync')?['status'],
      'todo',
    );
  });
}
