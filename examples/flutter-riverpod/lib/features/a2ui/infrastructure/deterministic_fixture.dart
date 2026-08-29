import 'dart:convert';

const prometheusFlutterCatalogId = 'urn:prometheus-ags:a2ui:flutter-catalog:v3';
const prometheusFlutterProtocolVersion = 'v1.0';
const prometheusFlutterGenUiWireVersion = 'v0.9';

/// Deterministic A2UI 1.0-RC surface used by the Flutter showcase.
///
/// The RC embeds components and the initial data model in `createSurface`.
/// [A2uiEnvelopeValidator] validates this public contract and normalizes it at
/// the renderer boundary because the published GenUI 0.10.x engine still
/// consumes the official v0.9 wire format.
final String sharedTaskReviewFixture = jsonEncode({
  'version': prometheusFlutterProtocolVersion,
  'createSurface': {
    'surfaceId': 'surface-task-sync',
    'catalogId': prometheusFlutterCatalogId,
    'sendDataModel': true,
    'components': [
      {'id': 'root', 'component': 'Card', 'child': 'content'},
      {
        'id': 'content',
        'component': 'Column',
        'children': [
          'eyebrow',
          'heading',
          'summary',
          'update-button',
          'archive-button',
          'delete-button',
        ],
      },
      {
        'id': 'eyebrow',
        'component': 'Text',
        'text': 'AGENT RECOMMENDATION',
        'variant': 'caption',
      },
      {
        'id': 'heading',
        'component': 'Text',
        'text': {'path': '/heading'},
        'variant': 'h3',
      },
      {
        'id': 'summary',
        'component': 'Text',
        'text': {'path': '/summary'},
      },
      {
        'id': 'update-button',
        'component': 'Button',
        'child': 'update-label',
        'variant': 'primary',
        'action': {
          'event': {
            'name': 'task.update',
            'context': {
              'taskId': 'task-sync',
              'tenantId': 'tenant-prometheus-demo',
              'status': 'done',
            },
            'wantResponse': true,
            'responsePath': '/lastAction',
          },
        },
      },
      {'id': 'update-label', 'component': 'Text', 'text': 'Mark task done'},
      {
        'id': 'archive-button',
        'component': 'Button',
        'child': 'archive-label',
        'action': {
          'event': {
            'name': 'task.archive',
            'context': {
              'taskId': 'task-sync',
              'tenantId': 'tenant-prometheus-demo',
            },
          },
        },
      },
      {
        'id': 'archive-label',
        'component': 'Text',
        'text': 'Archive with approval',
      },
      {
        'id': 'delete-button',
        'component': 'Button',
        'child': 'delete-label',
        'variant': 'borderless',
        'action': {
          'event': {
            'name': 'task.delete',
            'context': {
              'taskId': 'task-sync',
              'tenantId': 'tenant-prometheus-demo',
            },
          },
        },
      },
      {
        'id': 'delete-label',
        'component': 'Text',
        'text': 'Attempt denied delete',
      },
    ],
    'dataModel': {
      'heading': 'Review: Prove offline convergence',
      'summary':
          'This A2UI 1.0-RC surface can update the canonical task, request '
          'human approval, and prove denied actions do not mutate the graph.',
      'lastAction': 'pending',
    },
  },
});

final String hostileUnknownComponentFixture = jsonEncode({
  'version': prometheusFlutterProtocolVersion,
  'createSurface': {
    'surfaceId': 'surface-task-sync',
    'catalogId': prometheusFlutterCatalogId,
    'components': [
      {
        'id': 'root',
        'component': 'UntrustedShellCommand',
        'command': 'ignored',
      },
    ],
  },
});
