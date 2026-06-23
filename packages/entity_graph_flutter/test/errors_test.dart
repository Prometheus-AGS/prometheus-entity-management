import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('TerminalError', () {
    test('is an EntityGraphError', () {
      const err = TerminalError('Not found', statusCode: 404);
      expect(err, isA<EntityGraphError>());
      expect(err.message, equals('Not found'));
      expect(err.statusCode, equals(404));
    });

    test('toString includes type and message', () {
      const err = TerminalError('Unauthorized', statusCode: 401);
      expect(err.toString(), contains('TerminalError'));
      expect(err.toString(), contains('Unauthorized'));
    });
  });

  group('TransientError', () {
    test('is an EntityGraphError', () {
      const err = TransientError('Service unavailable', statusCode: 503);
      expect(err, isA<EntityGraphError>());
      expect(err.statusCode, equals(503));
    });
  });

  group('toEntityGraphError', () {
    test('passes through TerminalError unchanged', () {
      const input = TerminalError('pass-through');
      final result = toEntityGraphError(input);
      expect(result, same(input));
    });

    test('passes through TransientError unchanged', () {
      const input = TransientError('pass-through');
      final result = toEntityGraphError(input);
      expect(result, same(input));
    });

    test('maps unknown exception to TransientError', () {
      final result = toEntityGraphError(Exception('boom'));
      expect(result, isA<TransientError>());
    });

    test('maps a plain string to TransientError', () {
      final result = toEntityGraphError('network failure');
      expect(result, isA<TransientError>());
      expect(result.message, contains('network failure'));
    });
  });
}
