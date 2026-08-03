// Kebab-case subject plus Flutter's required _test.dart discovery suffix.
// ignore_for_file: file_names

import 'dart:async';

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

final class BridgeRow {
  const BridgeRow(this.id, this.value);
  final String id;
  final String value;
}

final class RecordingBridge implements FfiEntityBridge<BridgeRow> {
  final controller = StreamController<ChangeEvent<BridgeRow>>.broadcast();
  final calls = <String>[];

  @override
  Future<BridgeRow> create(Map<String, Object?> data) async {
    calls.add('create');
    return BridgeRow('created', data['value']! as String);
  }

  @override
  Future<void> delete(String id) async => calls.add('delete:$id');

  @override
  Future<BridgeRow?> get(String id) async {
    calls.add('get:$id');
    return BridgeRow(id, 'found');
  }

  @override
  String identify(BridgeRow row) => row.id;

  @override
  Future<ListResult<BridgeRow>> list(ListQuery query) async {
    calls.add('list');
    return const ListResult(rows: [BridgeRow('1', 'listed')]);
  }

  @override
  Map<String, Object?> toGraph(BridgeRow row) => {
    'id': row.id,
    'value': row.value,
  };

  @override
  Future<BridgeRow> update(String id, Map<String, Object?> patch) async {
    calls.add('update:$id');
    return BridgeRow(id, patch['value']! as String);
  }

  @override
  Stream<ChangeEvent<BridgeRow>>? changes() => controller.stream;
}

void main() {
  test(
    'optional FFI adapter delegates every transport operation and changes',
    () async {
      final bridge = RecordingBridge();
      final transport = FfiEntityTransportAdapter<BridgeRow>(bridge: bridge);
      final changes = <ChangeEvent<BridgeRow>>[];
      final subscription = transport.subscribe(changes.add);

      expect(
        (await transport.list(const ListQuery())).rows.single.value,
        'listed',
      );
      expect((await transport.get('1'))?.value, 'found');
      expect((await transport.create({'value': 'new'})).id, 'created');
      expect(
        (await transport.update('1', {'value': 'changed'})).value,
        'changed',
      );
      await transport.delete('1');
      bridge.controller.add(
        const ChangeEvent(
          op: ChangeOp.update,
          id: '1',
          row: BridgeRow('1', 'live'),
        ),
      );
      await Future<void>.delayed(Duration.zero);

      expect(transport.identify(const BridgeRow('7', 'x')), '7');
      expect(transport.toGraph(const BridgeRow('7', 'x'))['value'], 'x');
      expect(changes.single.row?.value, 'live');
      expect(bridge.calls, ['list', 'get:1', 'create', 'update:1', 'delete:1']);

      await subscription?.cancel();
      await bridge.controller.close();
    },
  );
}
