import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:prometheus_entity_showcase/features/a2ui/domain/a2ui_contract.dart';
import 'package:prometheus_entity_showcase/features/a2ui/infrastructure/deterministic_fixture.dart';
import 'package:prometheus_entity_showcase/features/a2ui/presentation/safe_a2ui_surface.dart';
import 'package:prometheus_entity_showcase/features/entity_management/domain/demo_models.dart';

String _fixture({
  String version = prometheusFlutterProtocolVersion,
  String surfaceId = 'surface-task-sync',
  String catalogId = prometheusFlutterCatalogId,
  String component = 'Button',
  String componentId = 'root',
  String actionName = 'task.update',
  bool functionCall = false,
  bool includeRoot = true,
  bool duplicateId = false,
}) {
  final action = functionCall
      ? {
          'functionCall': {'name': 'shell.exec'},
        }
      : {
          'event': {
            'name': actionName,
            'context': {
              'taskId': 'task-sync',
              'tenantId': demoTenantId,
              'status': 'done',
            },
          },
        };
  final components = <Map<String, Object?>>[
    {
      'id': includeRoot ? 'root' : componentId,
      'component': component,
      if (component == 'Button') 'action': action,
    },
    if (duplicateId)
      {
        'id': includeRoot ? 'root' : componentId,
        'component': 'Text',
        'text': 'duplicate',
      },
  ];
  return [
    {
      'version': version,
      'createSurface': {'surfaceId': surfaceId, 'catalogId': catalogId},
    },
    {
      'version': version,
      'updateComponents': {'surfaceId': surfaceId, 'components': components},
    },
  ].map(jsonEncode).join('\n');
}

A2uiActionIntent _intent(
  String name, {
  String surfaceId = 'surface-task-sync',
  String tenantId = demoTenantId,
  String taskId = 'task-sync',
  Object? status = 'done',
}) => A2uiActionIntent(
  surfaceId: surfaceId,
  name: name,
  sourceComponentId: 'test-button',
  context: {'tenantId': tenantId, 'taskId': taskId, 'status': ?status},
);

void main() {
  group('A2uiEnvelopeValidator', () {
    const validator = A2uiEnvelopeValidator();

    test('accepts the complete shared GenUI fixture', () {
      expect(
        () => validator.validate(sharedTaskReviewFixture),
        returnsNormally,
      );
    });

    test('normalizes the v1.0-RC surface for the published GenUI engine', () {
      final normalized = validator.normalizeForGenUi(sharedTaskReviewFixture);
      final messages = const LineSplitter()
          .convert(normalized)
          .map((line) => jsonDecode(line) as Map<String, Object?>)
          .toList();

      expect(messages, hasLength(3));
      expect(
        messages.map((message) => message['version']),
        everyElement(prometheusFlutterGenUiWireVersion),
      );
      final create = messages.first['createSurface'] as Map;
      expect(create.containsKey('components'), isFalse);
      expect(create.containsKey('dataModel'), isFalse);
      final components =
          (messages[1]['updateComponents'] as Map)['components'] as List;
      final updateButton = components.cast<Map>().singleWhere(
        (component) => component['id'] == 'update-button',
      );
      final event = ((updateButton['action'] as Map)['event'] as Map);
      expect(event.containsKey('wantResponse'), isFalse);
      expect(event.containsKey('responsePath'), isFalse);
    });

    test('rejects every unsafe protocol boundary before rendering', () {
      final invalid = <String, String>{
        'wire version': _fixture(version: '0.9.1'),
        'surface': _fixture(surfaceId: 'surface-hostile'),
        'catalog': _fixture(catalogId: 'urn:untrusted'),
        'component': _fixture(component: 'UntrustedShellCommand'),
        'action': _fixture(actionName: 'system.run'),
        'client function': _fixture(functionCall: true),
        'root': _fixture(componentId: 'not-root', includeRoot: false),
        'duplicate id': _fixture(duplicateId: true),
      };

      for (final entry in invalid.entries) {
        expect(
          () => validator.validate(entry.value),
          throwsFormatException,
          reason: entry.key,
        );
      }
    });

    test('rejects malformed or incomplete JSONL batches atomically', () {
      final incomplete = jsonEncode({
        'version': prometheusFlutterProtocolVersion,
        'createSurface': {
          'surfaceId': 'surface-task-sync',
          'catalogId': prometheusFlutterCatalogId,
        },
      });
      final nonObject = jsonEncode(['not', 'an', 'object']);
      final multipleMessages = jsonEncode({
        'version': prometheusFlutterProtocolVersion,
        'createSurface': {
          'surfaceId': 'surface-task-sync',
          'catalogId': prometheusFlutterCatalogId,
        },
        'deleteSurface': {'surfaceId': 'surface-task-sync'},
      });

      for (final fixture in [incomplete, nonObject, multipleMessages, '{']) {
        expect(() => validator.validate(fixture), throwsFormatException);
      }
    });
  });

  group('A2uiActionPolicy', () {
    const policy = A2uiActionPolicy();

    test('allows only valid task updates', () {
      final decision = policy.evaluate(_intent('task.update'));
      expect(decision.outcome, A2uiPolicyOutcome.allowed);
      expect(decision.reason, 'Allowlisted task update.');

      for (final status in ['archived', '', 7, null]) {
        expect(
          policy.evaluate(_intent('task.update', status: status)).outcome,
          A2uiPolicyOutcome.denied,
        );
      }
    });

    test('requires approval for archive and denies delete', () {
      expect(
        policy.evaluate(_intent('task.archive')).outcome,
        A2uiPolicyOutcome.requiresApproval,
      );
      expect(
        policy.evaluate(_intent('task.delete')).outcome,
        A2uiPolicyOutcome.denied,
      );
    });

    test('denies invalid surface, tenant, task, and undeclared action', () {
      final denied = [
        _intent('task.update', surfaceId: 'surface-other'),
        _intent('task.update', tenantId: 'tenant-other'),
        _intent('task.update', taskId: 'task-other'),
        _intent('system.run'),
      ];
      expect(
        denied.map(policy.evaluate).map((decision) => decision.outcome),
        everyElement(A2uiPolicyOutcome.denied),
      );
    });
  });

  group('SafeA2uiSurface', () {
    testWidgets('renders the official safe catalog and forwards user intent', (
      tester,
    ) async {
      final actions = <A2uiActionIntent>[];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SafeA2uiSurface(
              source: sharedTaskReviewFixture,
              onAction: actions.add,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Mark task done'), findsOneWidget);
      expect(find.text('Archive with approval'), findsOneWidget);
      expect(find.text('Attempt denied delete'), findsOneWidget);
      await tester.tap(find.text('Mark task done'));
      await tester.pump();

      expect(actions, hasLength(1));
      expect(actions.single.name, 'task.update');
      expect(actions.single.context['tenantId'], demoTenantId);
      expect(actions.single.context['taskId'], 'task-sync');
    });

    testWidgets('rejects a hostile batch without rendering a surface', (
      tester,
    ) async {
      var actionCount = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SafeA2uiSurface(
              source: hostileUnknownComponentFixture,
              onAction: (_) => actionCount += 1,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.text('This agent-generated surface was rejected safely.'),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('A2UI validation failed'), findsOneWidget);
      expect(find.text('ignored'), findsNothing);
      expect(actionCount, 0);
    });
  });
}
