// Kebab-case subject plus Flutter's required _test.dart discovery suffix.
// ignore_for_file: file_names

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late EntityGraph graph;

  setUp(() {
    graph = EntityGraph();
    graph.upsertEntities('User', [
      (id: '3', data: {'name': 'Alina', 'age': 30, 'team': null}),
      (id: '1', data: {'name': 'Alice', 'age': 30, 'team': 'Core'}),
      (id: '2', data: {'name': 'Bob', 'age': 42, 'team': 'Edge'}),
      (id: '4', data: {'name': 'Carol', 'age': 24, 'team': 'Core'}),
    ]);
  });

  List<String> ids(FilterClause filter) =>
      evaluateLocalEntityIds(graph, 'User', ListQuery(filter: [filter]));

  test('local filters implement the transport-neutral operator contract', () {
    expect(
      ids(const FilterClause(field: 'age', op: FilterOperator.eq, value: 30)),
      ['3', '1'],
    );
    expect(
      ids(const FilterClause(field: 'age', op: FilterOperator.neq, value: 30)),
      ['2', '4'],
    );
    expect(
      ids(const FilterClause(field: 'age', op: FilterOperator.gt, value: 30)),
      ['2'],
    );
    expect(
      ids(const FilterClause(field: 'age', op: FilterOperator.gte, value: 30)),
      ['3', '1', '2'],
    );
    expect(
      ids(const FilterClause(field: 'age', op: FilterOperator.lt, value: 30)),
      ['4'],
    );
    expect(
      ids(const FilterClause(field: 'age', op: FilterOperator.lte, value: 30)),
      ['3', '1', '4'],
    );
    expect(
      ids(
        const FilterClause(
          field: 'name',
          op: FilterOperator.contains,
          value: 'li',
        ),
      ),
      ['3', '1'],
    );
    expect(
      ids(
        const FilterClause(
          field: 'name',
          op: FilterOperator.startsWith,
          value: 'al',
        ),
      ),
      ['3', '1'],
    );
    expect(
      ids(
        const FilterClause(
          field: 'name',
          op: FilterOperator.endsWith,
          value: 'ol',
        ),
      ),
      ['4'],
    );
    expect(ids(const FilterClause(field: 'team', op: FilterOperator.isNull)), [
      '3',
    ]);
    expect(
      ids(const FilterClause(field: 'team', op: FilterOperator.isNotNull)),
      ['1', '2', '4'],
    );
    expect(
      ids(
        const FilterClause(
          field: 'team',
          op: FilterOperator.inList,
          value: ['Core', 'Edge'],
        ),
      ),
      ['1', '2', '4'],
    );
    expect(
      ids(
        const FilterClause(
          field: 'team',
          op: FilterOperator.nin,
          value: ['Core'],
        ),
      ),
      ['3', '2'],
    );
  });

  test(
    'search, multi-sort, stable id tie-break, and limit return ids only',
    () {
      final result = evaluateLocalEntityIds(
        graph,
        'User',
        const ListQuery(
          search: 'a',
          sort: [
            SortClause(field: 'age', direction: SortDirection.desc),
            SortClause(field: 'name'),
          ],
          limit: 3,
        ),
      );

      expect(result, ['1', '3', '4']);
      expect(result, everyElement(isA<String>()));
      expect(() => result.add('copy'), throwsUnsupportedError);
    },
  );

  test(
    'local evaluation reads the graph again instead of caching row copies',
    () {
      const query = ListQuery(
        filter: [
          FilterClause(field: 'team', op: FilterOperator.eq, value: 'Core'),
        ],
      );
      expect(evaluateLocalEntityIds(graph, 'User', query), ['1', '4']);

      graph.upsertEntity('User', '2', {'team': 'Core'});

      expect(evaluateLocalEntityIds(graph, 'User', query), ['1', '2', '4']);
    },
  );
}
