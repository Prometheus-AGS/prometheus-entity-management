import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

// ─── Fake transport ───────────────────────────────────────────────────────

class _FakeRow {
  const _FakeRow(this.id, this.name);
  final String id;
  final String name;
  Map<String, Object?> toJson() => {'id': id, 'name': name};
}

class _FakeTransport extends EntityTransport<_FakeRow> {
  _FakeTransport({List<_FakeRow>? rows}) : _rows = rows ?? [];

  final List<_FakeRow> _rows;

  @override
  String identify(_FakeRow row) => row.id;

  @override
  bool get authoritative => false;

  @override
  Duration? get staleTime => null;

  @override
  Future<ListResult<_FakeRow>> list(ListQuery query) async {
    return ListResult(rows: _rows, total: _rows.length);
  }

  @override
  Future<_FakeRow?> get(String id) async {
    try {
      return _rows.firstWhere((r) => r.id == id);
    } catch (_) {
      return null;
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────

void main() {
  late EntityTransportRegistry registry;

  setUp(() {
    registry = EntityTransportRegistry.instance;
    registry.reset();
  });

  group('EntityTransportRegistry', () {
    test('register and get a transport', () {
      final transport = _FakeTransport();
      registry.register('Widget', transport);
      final t = registry.get<_FakeRow>('Widget');
      expect(t, same(transport));
    });

    test('re-registering replaces the prior transport', () {
      final t1 = _FakeTransport();
      final t2 = _FakeTransport();
      registry.register('Widget', t1);
      registry.register('Widget', t2);
      expect(registry.get<_FakeRow>('Widget'), same(t2));
    });

    test('get throws TerminalError for unregistered type', () {
      expect(
        () => registry.get<_FakeRow>('Unregistered'),
        throwsA(isA<TerminalError>()),
      );
    });

    test('registeredTypes lists all types', () {
      registry.register('Alpha', _FakeTransport());
      registry.register('Beta', _FakeTransport());
      expect(registry.registeredTypes, containsAll(['Alpha', 'Beta']));
    });

    test('reset clears all transports', () {
      registry.register('Alpha', _FakeTransport());
      registry.reset();
      expect(registry.registeredTypes, isEmpty);
    });
  });

  group('EntityTransport.list', () {
    test('returns rows and total', () async {
      final rows = [const _FakeRow('1', 'Alice'), const _FakeRow('2', 'Bob')];
      final transport = _FakeTransport(rows: rows);
      final result = await transport.list(const ListQuery());
      expect(result.rows.length, equals(2));
      expect(result.total, equals(2));
    });

    test('identify returns the correct id', () {
      final transport = _FakeTransport();
      const row = _FakeRow('abc', 'Carol');
      expect(transport.identify(row), equals('abc'));
    });
  });

  group('EntityTransport.get', () {
    test('returns row when present', () async {
      final rows = [const _FakeRow('1', 'Alice')];
      final transport = _FakeTransport(rows: rows);
      final row = await transport.get('1');
      expect(row?.name, equals('Alice'));
    });

    test('returns null when absent', () async {
      final transport = _FakeTransport();
      final row = await transport.get('missing');
      expect(row, isNull);
    });
  });

  group('FilterClause', () {
    test('toJson includes field, op, and value', () {
      const clause = FilterClause(
        field: 'status',
        op: FilterOperator.eq,
        value: 'active',
      );
      final json = clause.toJson();
      expect(json['field'], equals('status'));
      expect(json['op'], equals('eq'));
      expect(json['value'], equals('active'));
    });
  });

  group('SortClause', () {
    test('toJson includes field and direction', () {
      const clause = SortClause(
        field: 'createdAt',
        direction: SortDirection.desc,
      );
      final json = clause.toJson();
      expect(json['field'], equals('createdAt'));
      expect(json['direction'], equals('desc'));
    });
  });
}
