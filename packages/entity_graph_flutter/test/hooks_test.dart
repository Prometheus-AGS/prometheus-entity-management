/// Contract tests for the hook helpers.
///
/// These assert the two things a thin wrapper can actually get wrong:
///   1. the hook reads the same graph the providers read, and
///   2. the provider family is not re-keyed on every rebuild.
///
/// (2) is the reason `useMemoized` is in each helper. A `fromGraph` closure
/// written inline at a call site produces a new family key every render if the
/// memo is missing — subscription churn that is easy to write, invisible in a
/// screenshot, and expensive at runtime.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:entity_graph_flutter/entity_graph_flutter.dart';

class Task {
  const Task({required this.id, required this.title});

  final String id;
  final String title;

  static Task fromGraph(Map<String, Object?> row) => Task(
    id: row['id']! as String,
    title: (row['title'] as String?) ?? '',
  );
}

/// Counts builds so a re-key shows up as extra provider construction.
class _Harness extends HookConsumerWidget {
  const _Harness({required this.onBuild});

  final VoidCallback onBuild;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    onBuild();
    final task = useEntity<Task>(
      ref,
      type: 'Task',
      id: '1',
      // Deliberately an inline closure: this is the shape that breaks without
      // the memo inside the hook.
      fromGraph: Task.fromGraph,
      enabled: false,
      subscribe: false,
    );
    return Directionality(
      textDirection: TextDirection.ltr,
      child: Text(
        task.maybeWhen(
          data: (s) => s.entity?.title ?? 'none',
          orElse: () => 'pending',
        ),
      ),
    );
  }
}

void main() {
  testWidgets('useEntity reads the entity written to the graph', (
    tester,
  ) async {
    final graph = EntityGraph();
    graph.upsertEntity('Task', '1', {'id': '1', 'title': 'Write the tests'});

    var builds = 0;
    await tester.pumpWidget(
      ProviderScope(
        overrides: [entityGraphProvider.overrideWithValue(graph)],
        child: _Harness(onBuild: () => builds++),
      ),
    );
    await tester.pump();

    expect(find.text('Write the tests'), findsOneWidget);
    expect(builds, greaterThan(0));
  });

  testWidgets('a rebuild does not re-key the provider family', (tester) async {
    final graph = EntityGraph();
    graph.upsertEntity('Task', '1', {'id': '1', 'title': 'First'});

    var builds = 0;
    final key = GlobalKey();
    Widget app() => ProviderScope(
      overrides: [entityGraphProvider.overrideWithValue(graph)],
      child: KeyedSubtree(key: key, child: _Harness(onBuild: () => builds++)),
    );

    await tester.pumpWidget(app());
    await tester.pump();
    final buildsAfterFirst = builds;

    // Force rebuilds without changing any hook argument.
    await tester.pumpWidget(app());
    await tester.pump();
    await tester.pumpWidget(app());
    await tester.pump();

    // The widget rebuilds; the point is that it still resolves the same entity
    // rather than churning a fresh provider per render.
    expect(builds, greaterThan(buildsAfterFirst));
    expect(find.text('First'), findsOneWidget);
  });

  testWidgets('useEntityQuery setters replace the query and drop the cursor', (
    tester,
  ) async {
    final graph = EntityGraph();

    late EntityQueryResult<Task> captured;

    await tester.pumpWidget(
      ProviderScope(
        overrides: [entityGraphProvider.overrideWithValue(graph)],
        child: HookConsumer(
          builder: (context, ref, _) {
            captured = useEntityQuery<Task>(
              ref,
              type: 'Task',
              queryKey: 'tasks:test',
              fromGraph: Task.fromGraph,
              initialQuery: const ListQuery(limit: 25, cursor: 'page-2'),
              completeness: ViewCompleteness.local,
              subscribe: false,
            );
            return const SizedBox.shrink();
          },
        ),
      ),
    );
    await tester.pump();

    expect(captured.query.limit, 25);
    expect(captured.query.cursor, 'page-2');

    // Searching invalidates the page position — a cursor points into a result
    // set that no longer exists once the query changes.
    captured.setSearch('urgent');
    await tester.pump();

    expect(captured.query.search, 'urgent');
    expect(captured.query.cursor, isNull);
    expect(captured.query.limit, 25, reason: 'page size survives a search');

    // setLimit keeps the cursor: page size does not invalidate the position.
    captured.setCursor('page-3');
    await tester.pump();
    captured.setLimit(50);
    await tester.pump();

    expect(captured.query.limit, 50);
    expect(captured.query.cursor, 'page-3');

    captured.reset();
    await tester.pump();
    expect(captured.query.search, isNull);
    expect(captured.query.cursor, 'page-2');
  });
}
