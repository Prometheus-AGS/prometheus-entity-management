
import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late EntityGraph graph;

  setUp(() {
    graph = EntityGraph.instance;
    graph.reset();
  });

  group('EntityGraph.upsertEntity', () {
    test('stores an entity and returns it via readEntity', () {
      graph.upsertEntity('User', '1', {'name': 'Alice', 'age': 30});
      final row = graph.readEntity('User', '1');
      expect(row, isNotNull);
      expect(row!['name'], equals('Alice'));
      expect(row['age'], equals(30));
    });

    test('shallow-merges on second upsert', () {
      graph.upsertEntity('User', '1', {'name': 'Alice', 'role': 'admin'});
      graph.upsertEntity('User', '1', {'name': 'Alice B'});
      final row = graph.readEntity('User', '1');
      expect(row!['name'], equals('Alice B'));
      // role is preserved because merge is shallow
      expect(row['role'], equals('admin'));
    });

    test('readEntity returns null for absent entity', () {
      expect(graph.readEntity('User', 'missing'), isNull);
    });
  });

  group('EntityGraph.upsertEntities', () {
    test('batch inserts multiple entities', () {
      graph.upsertEntities('Post', [
        (id: '1', data: {'title': 'First'}),
        (id: '2', data: {'title': 'Second'}),
      ]);
      expect(graph.readEntity('Post', '1')!['title'], equals('First'));
      expect(graph.readEntity('Post', '2')!['title'], equals('Second'));
    });
  });

  group('EntityGraph.replaceEntity', () {
    test('replaces entire entity without merge', () {
      graph.upsertEntity('User', '1', {'name': 'Alice', 'role': 'admin'});
      graph.replaceEntity('User', '1', {'name': 'Bob'});
      final row = graph.readEntity('User', '1');
      expect(row!['name'], equals('Bob'));
      expect(row.containsKey('role'), isFalse);
    });
  });

  group('EntityGraph.removeEntity', () {
    test('removes entity and clears state', () {
      graph.upsertEntity('User', '1', {'name': 'Alice'});
      graph.removeEntity('User', '1');
      expect(graph.readEntity('User', '1'), isNull);
    });

    test('patches are also removed', () {
      graph.upsertEntity('User', '1', {'name': 'Alice'});
      graph.patchEntity('User', '1', {'_selected': true});
      graph.removeEntity('User', '1');
      expect(graph.readEntity('User', '1'), isNull);
    });
  });

  group('EntityGraph.patchEntity', () {
    test('merges patch at read time without touching canonical data', () {
      graph.upsertEntity('User', '1', {'name': 'Alice'});
      graph.patchEntity('User', '1', {'_selected': true, '_loading': false});
      final row = graph.readEntity('User', '1')!;
      expect(row['name'], equals('Alice'));
      expect(row['_selected'], isTrue);
    });

    test('unpatchEntity removes specific keys', () {
      graph.upsertEntity('User', '1', {'name': 'Alice'});
      graph.patchEntity('User', '1', {'_a': 1, '_b': 2});
      graph.unpatchEntity('User', '1', ['_a']);
      final row = graph.readEntity('User', '1')!;
      expect(row.containsKey('_a'), isFalse);
      expect(row['_b'], equals(2));
    });

    test('clearPatch removes all patch keys', () {
      graph.upsertEntity('User', '1', {'name': 'Alice'});
      graph.patchEntity('User', '1', {'_selected': true});
      graph.clearPatch('User', '1');
      final row = graph.readEntity('User', '1')!;
      expect(row.containsKey('_selected'), isFalse);
    });
  });

  group('EntityGraph list API', () {
    test('setListResult stores ids and pagination', () {
      graph.setListResult('users:all', ['1', '2', '3'], total: 3);
      final state = graph.listState('users:all');
      expect(state.ids, equals(['1', '2', '3']));
      expect(state.total, equals(3));
      expect(state.isFetching, isFalse);
    });

    test('appendListResult deduplicates ids', () {
      graph.setListResult('users:all', ['1', '2']);
      graph.appendListResult('users:all', ['2', '3'], total: 3);
      final state = graph.listState('users:all');
      expect(state.ids, equals(['1', '2', '3']));
    });

    test('setListFetching sets isFetching', () {
      graph.setListFetching('users:all', fetching: true);
      expect(graph.listState('users:all').isFetching, isTrue);
    });

    test('setListError records error and stamps lastFetched', () {
      graph.setListError('users:all', 'Network error');
      final state = graph.listState('users:all');
      expect(state.error, equals('Network error'));
      expect(state.lastFetched, isNotNull);
    });

    test('removeIdFromAllLists removes id from every list', () {
      graph.setListResult('users:all', ['1', '2', '3']);
      graph.setListResult('users:active', ['1', '3'], total: 2);
      graph.removeIdFromAllLists('User', '1');
      expect(graph.listState('users:all').ids, equals(['2', '3']));
      expect(graph.listState('users:active').ids, equals(['3']));
      expect(graph.listState('users:active').total, equals(1));
    });

    test('insertIdInList inserts at start/end/index', () {
      graph.setListResult('posts', ['b', 'c']);
      graph.insertIdInList('posts', 'a', 'start');
      expect(graph.listState('posts').ids, equals(['a', 'b', 'c']));
      graph.insertIdInList('posts', 'd', 'end');
      expect(graph.listState('posts').ids, equals(['a', 'b', 'c', 'd']));
      graph.insertIdInList('posts', 'x', 1);
      expect(graph.listState('posts').ids, equals(['a', 'x', 'b', 'c', 'd']));
    });
  });

  group('EntityGraph.invalidate', () {
    test('invalidateEntity marks entity stale', () {
      graph.upsertEntity('User', '1', {'name': 'Alice'});
      graph.setEntityFetched('User', '1');
      graph.invalidateEntity('User', id: '1');
      expect(graph.entityState('User', '1').stale, isTrue);
    });

    test('invalidateLists marks lists with matching prefix stale', () {
      graph.setListResult('users:all', ['1']);
      graph.setListResult('posts:all', ['2']);
      graph.invalidateLists('users');
      expect(graph.listState('users:all').stale, isTrue);
      expect(graph.listState('posts:all').stale, isFalse);
    });
  });

  group('EntityGraph change stream', () {
    test('emits EntityChanged when entity is upserted', () async {
      final events = <GraphChange>[];
      final sub = graph.changes.listen(events.add);
      graph.upsertEntity('User', '42', {'name': 'Charlie'});
      await Future<void>.delayed(Duration.zero);
      sub.cancel();
      expect(
        events.whereType<EntityChanged>(),
        isNotEmpty,
      );
      final change = events.whereType<EntityChanged>().first;
      expect(change.type, equals('User'));
      expect(change.id, equals('42'));
    });

    test('emits ListChanged when list result is set', () async {
      final events = <GraphChange>[];
      final sub = graph.changes.listen(events.add);
      graph.setListResult('users:all', ['1', '2']);
      await Future<void>.delayed(Duration.zero);
      sub.cancel();
      expect(
        events.whereType<ListChanged>().map((e) => e.queryKey),
        contains('users:all'),
      );
    });
  });

  group('EntityGraph.readEntitySnapshot', () {
    test('includes \$synced metadata fields', () {
      graph.upsertEntity('User', '1', {'name': 'Alice'});
      final snap = graph.readEntitySnapshot('User', '1');
      expect(snap, isNotNull);
      expect(snap![r'$synced'], isNotNull);
      expect(snap[r'$origin'], isNotNull);
    });
  });
}
