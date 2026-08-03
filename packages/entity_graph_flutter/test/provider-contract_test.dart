// Kebab-case subject plus Flutter's required _test.dart discovery suffix.
// ignore_for_file: file_names

import 'dart:async';

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

final class User {
  const User(this.id, this.name, {this.role = 'member'});

  final String id;
  final String name;
  final String role;

  Map<String, Object?> toJson() => {'id': id, 'name': name, 'role': role};

  static User fromGraph(Map<String, Object?> row) => User(
    row['id']! as String,
    row['name']! as String,
    role: (row['role'] as String?) ?? 'member',
  );
}

final class FakeUserTransport extends EntityTransport<User> {
  FakeUserTransport({
    this.rows = const [User('1', 'Alice'), User('2', 'Bob')],
    this.failList,
    this.failUpdate,
    this.failCreate,
    this.failDelete,
  });

  final List<User> rows;
  Object? failList;
  Object? failUpdate;
  Object? failCreate;
  Object? failDelete;
  int listCalls = 0;
  int getCalls = 0;
  final changes = StreamController<ChangeEvent<User>>.broadcast();

  @override
  bool get authoritative => false;

  @override
  Duration? get staleTime => const Duration(seconds: 30);

  @override
  String identify(User row) => row.id;

  @override
  Map<String, Object?> toGraph(User row) => row.toJson();

  @override
  Future<ListResult<User>> list(ListQuery query) async {
    listCalls += 1;
    if (failList != null) throw failList!;
    return ListResult(rows: rows, total: rows.length);
  }

  @override
  Future<User?> get(String id) async {
    getCalls += 1;
    return rows.where((row) => row.id == id).firstOrNull;
  }

  @override
  Future<User> create(Map<String, Object?> data) async {
    if (failCreate != null) throw failCreate!;
    return User('server-1', data['name']! as String);
  }

  @override
  Future<User> update(String id, Map<String, Object?> patch) async {
    if (failUpdate != null) throw failUpdate!;
    return User(id, patch['name']! as String, role: 'confirmed');
  }

  @override
  Future<void> delete(String id) async {
    if (failDelete != null) throw failDelete!;
  }

  @override
  StreamSubscription<ChangeEvent<User>>? subscribe(
    void Function(ChangeEvent<User> event) onChange,
  ) => changes.stream.listen(onChange);

  Future<void> close() => changes.close();
}

extension on Iterable<User> {
  User? get firstOrNull {
    final iterator = this.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }
}

ProviderContainer testContainer(
  EntityGraph graph,
  EntityTransportRegistry registry,
) => ProviderContainer(
  overrides: [
    entityGraphProvider.overrideWithValue(graph),
    entityTransportRegistryProvider.overrideWithValue(registry),
  ],
);

EntityListProvider<User> usersProvider({
  ViewCompleteness completeness = ViewCompleteness.remote,
  bool subscribe = false,
}) => entityListProvider<User>(
  type: 'User',
  queryKey: 'users:all',
  fromGraph: User.fromGraph,
  completeness: completeness,
  subscribe: subscribe,
);

void main() {
  late EntityGraph graph;
  late EntityTransportRegistry registry;
  late FakeUserTransport transport;
  late ProviderContainer container;

  setUp(() {
    graph = EntityGraph();
    registry = EntityTransportRegistry();
    transport = FakeUserTransport();
    registry.register<User>('User', transport);
    container = testContainer(graph, registry);
  });

  tearDown(() async {
    container.dispose();
    await transport.close();
  });

  test('remote list normalizes ids and entity reads share one graph', () async {
    final listProvider = usersProvider();
    final entityDetails = entityProvider<User>(
      type: 'User',
      id: '1',
      fromGraph: User.fromGraph,
      enabled: false,
      subscribe: false,
    );
    final listSubscription = container.listen(listProvider, (_, _) {});
    final entitySubscription = container.listen(entityDetails, (_, _) {});

    final list = await container.read(listProvider.future);
    final detail = await container.read(entityDetails.future);
    expect(graph.listState('users:all').ids, ['1', '2']);
    expect(list.items.map((row) => row.name), ['Alice', 'Bob']);
    expect(detail.entity?.name, 'Alice');

    graph.upsertEntity('User', '1', {'name': 'Alicia'});
    await Future<void>.delayed(Duration.zero);

    expect(
      container.read(listProvider).requireValue.items.first.name,
      'Alicia',
    );
    expect(container.read(entityDetails).requireValue.entity?.name, 'Alicia');
    listSubscription.close();
    entitySubscription.close();
  });

  test('local mode evaluates immediately without a transport call', () async {
    graph.upsertEntity('User', 'local', {'id': 'local', 'name': 'Local first'});
    final provider = usersProvider(completeness: ViewCompleteness.local);
    final subscription = container.listen(provider, (_, _) {});

    final snapshot = await container.read(provider.future);

    expect(snapshot.items.single.name, 'Local first');
    expect(transport.listCalls, 0);
    subscription.close();
  });

  test(
    'hybrid mode renders local data then replaces remote membership',
    () async {
      graph.upsertEntity('User', 'local', {'id': 'local', 'name': 'Cached'});
      final provider = usersProvider(completeness: ViewCompleteness.hybrid);
      final subscription = container.listen(provider, (_, _) {});

      final first = await container.read(provider.future);
      expect(first.items.single.name, 'Cached');

      await Future<void>.delayed(const Duration(milliseconds: 20));
      final settled = container.read(provider).requireValue;
      expect(settled.items.map((row) => row.name), ['Alice', 'Bob']);
      expect(transport.listCalls, 1);
      subscription.close();
    },
  );

  test('terminal failures stop after one attempt', () async {
    transport.failList = const TerminalError('invalid query', statusCode: 400);
    final provider = usersProvider();
    final subscription = container.listen(provider, (_, _) {});

    await expectLater(
      container.read(provider.future),
      throwsA(isA<TerminalError>()),
    );

    expect(transport.listCalls, 1);
    subscription.close();
  });

  test('transient failures are bounded to one call plus two retries', () async {
    transport.failList = const TransientError('offline', statusCode: 503);
    final provider = usersProvider();
    final subscription = container.listen(provider, (_, _) {});

    await expectLater(
      container.read(provider.future),
      throwsA(isA<TransientError>()),
    );

    expect(transport.listCalls, 3);
    subscription.close();
  });

  test('realtime update and delete mutate the canonical graph', () async {
    graph.upsertEntity('User', '1', {'id': '1', 'name': 'Alice'});
    graph.setListResult('users:all', ['1'], entityType: 'User', total: 1);
    final bridge = entityChangeBridgeProvider<User>(type: 'User');
    final subscription = container.listen(bridge, (_, _) {});
    expect(container.read(bridge).isActive, isTrue);

    transport.changes.add(
      const ChangeEvent(op: ChangeOp.update, id: '1', row: User('1', 'Live')),
    );
    await Future<void>.delayed(Duration.zero);
    expect(graph.readEntity('User', '1')?['name'], 'Live');
    expect(graph.listState('users:all').stale, isTrue);

    transport.changes.add(const ChangeEvent(op: ChangeOp.delete, id: '1'));
    await Future<void>.delayed(Duration.zero);
    expect(graph.readEntity('User', '1'), isNull);
    expect(graph.listState('users:all').ids, isEmpty);
    subscription.close();
  });

  test(
    'optimistic update is global and confirmation clears its patch',
    () async {
      graph.upsertEntity('User', '1', {'id': '1', 'name': 'Alice'});
      final provider = entityCrudProvider<User>(type: 'User', id: '1');
      final subscription = container.listen(provider, (_, _) {});
      final controller = container.read(provider.notifier);

      controller.edit('name', 'Alicia');
      controller.applyOptimistic();
      expect(graph.readEntity('User', '1')?['name'], 'Alicia');
      expect(graph.syncMetadata('User', '1').origin, SyncOrigin.optimistic);

      await controller.save();
      expect(graph.readCanonicalEntity('User', '1')?['name'], 'Alicia');
      expect(graph.readEntityPatch('User', '1'), isEmpty);
      expect(graph.syncMetadata('User', '1').origin, SyncOrigin.server);
      subscription.close();
    },
  );

  test(
    'failed optimistic update restores prior patch and sync metadata',
    () async {
      transport.failUpdate = const TerminalError('denied', statusCode: 403);
      graph.upsertEntity('User', '1', {'id': '1', 'name': 'Alice'});
      graph.patchEntity('User', '1', {'name': 'Pinned', '_selected': true});
      final before = graph.syncMetadata('User', '1');
      final provider = entityCrudProvider<User>(type: 'User', id: '1');
      final subscription = container.listen(provider, (_, _) {});
      final controller = container.read(provider.notifier);
      controller.edit('name', 'Denied');

      await expectLater(controller.save(), throwsA(isA<TerminalError>()));

      expect(graph.readEntityPatch('User', '1'), {
        'name': 'Pinned',
        '_selected': true,
      });
      expect(graph.syncMetadata('User', '1').origin, before.origin);
      expect(graph.readCanonicalEntity('User', '1')?['name'], 'Alice');
      subscription.close();
    },
  );

  test(
    'failed optimistic delete restores entity and exact list position',
    () async {
      transport.failDelete = const TransientError('offline');
      graph.upsertEntities('User', [
        (id: '1', data: {'id': '1', 'name': 'Alice'}),
        (id: '2', data: {'id': '2', 'name': 'Bob'}),
      ]);
      graph.setListResult(
        'users:all',
        ['2', '1'],
        entityType: 'User',
        total: 2,
      );
      final provider = entityCrudProvider<User>(type: 'User', id: '1');
      final subscription = container.listen(provider, (_, _) {});
      final controller = container.read(provider.notifier);

      await expectLater(
        controller.deleteEntity(),
        throwsA(isA<TransientError>()),
      );

      expect(graph.readEntity('User', '1')?['name'], 'Alice');
      expect(graph.listState('users:all').ids, ['2', '1']);
      expect(graph.listState('users:all').total, 2);
      subscription.close();
    },
  );

  test('optimistic create swaps placeholder for confirmed id', () async {
    graph.setListResult('users:all', const [], entityType: 'User', total: 0);
    final provider = entityMutationsProvider<User>(type: 'User');
    final subscription = container.listen(provider, (_, _) {});
    final controller = container.read(provider.notifier);

    final created = await controller.create(
      {'name': 'Created'},
      optimisticId: 'temp-1',
      queryKey: 'users:all',
    );

    expect(created.id, 'server-1');
    expect(graph.readEntity('User', 'temp-1'), isNull);
    expect(graph.readEntity('User', 'server-1')?['name'], 'Created');
    expect(graph.listState('users:all').ids, ['server-1']);
    subscription.close();
  });

  test('failed optimistic create removes its placeholder', () async {
    transport.failCreate = const TerminalError('invalid');
    graph.setListResult('users:all', const [], entityType: 'User', total: 0);
    final provider = entityMutationsProvider<User>(type: 'User');
    final subscription = container.listen(provider, (_, _) {});
    final controller = container.read(provider.notifier);

    await expectLater(
      controller.create(
        {'name': 'Invalid'},
        optimisticId: 'temp-1',
        queryKey: 'users:all',
      ),
      throwsA(isA<TerminalError>()),
    );

    expect(graph.readEntity('User', 'temp-1'), isNull);
    expect(graph.listState('users:all').ids, isEmpty);
    subscription.close();
  });
}
