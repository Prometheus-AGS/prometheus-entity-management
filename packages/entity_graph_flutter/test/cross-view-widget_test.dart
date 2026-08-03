// Kebab-case subject plus Flutter's required _test.dart discovery suffix.
// ignore_for_file: file_names

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final class VisualUser {
  const VisualUser({required this.id, required this.name, required this.role});

  final String id;
  final String name;
  final String role;

  static VisualUser fromGraph(Map<String, Object?> row) => VisualUser(
    id: row['id']! as String,
    name: row['name']! as String,
    role: row['role']! as String,
  );
}

final listProvider = entityListProvider<VisualUser>(
  type: 'User',
  queryKey: 'users:visual',
  fromGraph: VisualUser.fromGraph,
  completeness: ViewCompleteness.local,
  subscribe: false,
);

final detailProvider = entityProvider<VisualUser>(
  type: 'User',
  id: '1',
  fromGraph: VisualUser.fromGraph,
  enabled: false,
  subscribe: false,
);

class CrossViewHarness extends ConsumerWidget {
  const CrossViewHarness({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list = ref.watch(listProvider);
    final detail = ref.watch(detailProvider);
    final listName = list.value?.items.single.name ?? 'Loading';
    final detailName = detail.value?.entity?.name ?? 'Loading';

    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xffee5a24),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xff0f172a),
        useMaterial3: true,
      ),
      home: Scaffold(
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: Color(0xffee5a24),
                        borderRadius: BorderRadius.all(Radius.circular(12)),
                      ),
                      child: Padding(
                        padding: EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 10,
                        ),
                        child: Text(
                          'PROMETHEUS',
                          style: TextStyle(
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.8,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    SizedBox(width: 18),
                    Text(
                      'One graph. Every view.',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                const Text(
                  'Optimistic entity update · Riverpod 3 generated providers',
                  style: TextStyle(color: Color(0xff94a3b8), fontSize: 16),
                ),
                const SizedBox(height: 34),
                Expanded(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Expanded(
                        child: _Surface(
                          eyebrow: 'LIST VIEW',
                          title: 'Team members',
                          name: listName,
                          detail: 'Admin · Online',
                          icon: Icons.table_rows_rounded,
                        ),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        child: _Surface(
                          eyebrow: 'DETAIL VIEW',
                          title: 'User profile',
                          name: detailName,
                          detail: 'Canonical ID · User/1',
                          icon: Icons.badge_outlined,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                const Row(
                  children: [
                    Icon(Icons.hub_outlined, color: Color(0xfffb923c)),
                    SizedBox(width: 10),
                    Text(
                      'Both surfaces join IDs against the same normalized graph',
                      style: TextStyle(
                        color: Color(0xffcbd5e1),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _Surface extends StatelessWidget {
  const _Surface({
    required this.eyebrow,
    required this.title,
    required this.name,
    required this.detail,
    required this.icon,
  });

  final String eyebrow;
  final String title;
  final String name;
  final String detail;
  final IconData icon;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: const Color(0xff172033),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xff334155)),
      boxShadow: const [
        BoxShadow(
          color: Color(0x33000000),
          blurRadius: 24,
          offset: Offset(0, 12),
        ),
      ],
    ),
    child: Padding(
      padding: const EdgeInsets.all(28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            eyebrow,
            style: const TextStyle(
              color: Color(0xfffb923c),
              fontWeight: FontWeight.w800,
              letterSpacing: 1.6,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(fontSize: 22)),
          const Spacer(),
          Row(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: const Color(0xff7c2d12),
                child: Icon(icon, color: const Color(0xffffedd5), size: 30),
              ),
              const SizedBox(width: 18),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      key: ValueKey('$eyebrow-name'),
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      detail,
                      style: const TextStyle(color: Color(0xff94a3b8)),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const Spacer(),
          const DecoratedBox(
            decoration: BoxDecoration(
              color: Color(0xff203047),
              borderRadius: BorderRadius.all(Radius.circular(9)),
            ),
            child: Padding(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              child: Text(
                'OPTIMISTIC · UNSYNCED',
                style: TextStyle(
                  color: Color(0xfffdba74),
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

void main() {
  testWidgets('optimistic edit renders through list and detail joins', (
    tester,
  ) async {
    await tester.binding.setSurfaceSize(const Size(960, 600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final graph = EntityGraph()
      ..upsertEntity('User', '1', {
        'id': '1',
        'name': 'Alice Rivera',
        'role': 'admin',
      });
    final container = ProviderContainer(
      overrides: [entityGraphProvider.overrideWithValue(graph)],
    );
    addTearDown(container.dispose);

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const CrossViewHarness(),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Alice Rivera'), findsNWidgets(2));
    await expectLater(
      find.byType(CrossViewHarness),
      matchesGoldenFile('goldens/cross-view-initial.png'),
    );

    final crud = entityCrudProvider<VisualUser>(type: 'User', id: '1');
    final subscription = container.listen(crud, (_, _) {});
    addTearDown(subscription.close);
    final controller = container.read(crud.notifier);
    controller.edit('name', 'Alicia Rivera');
    controller.applyOptimistic();
    await tester.pump();

    expect(find.text('Alicia Rivera'), findsNWidgets(2));
    expect(graph.readCanonicalEntity('User', '1')?['name'], 'Alice Rivera');
    expect(graph.readEntity('User', '1')?['name'], 'Alicia Rivera');
    await expectLater(
      find.byType(CrossViewHarness),
      matchesGoldenFile('goldens/cross-view-optimistic.png'),
    );
  });
}
