import 'dart:convert';

const prometheusFlutterCatalogId = 'urn:prometheus-ags:a2ui:flutter-catalog:v3';
const prometheusFlutterProtocolVersion = 'v0.9';

/// Flutter-compatible projection of the shared `surface-task-sync` fixture.
///
/// The shared semantic contract names A2UI 0.9.1. Flutter GenUI 0.10.1
/// currently accepts the official wire identifier `v0.9`, so the entity IDs,
/// actions, tenant, and expected policy outcomes are shared while the wire
/// version is adapted at this explicit compatibility boundary.
final String sharedTaskReviewFixture = [
  {
    'version': prometheusFlutterProtocolVersion,
    'createSurface': {
      'surfaceId': 'surface-task-sync',
      'catalogId': prometheusFlutterCatalogId,
      'sendDataModel': true,
    },
  },
  {
    'version': prometheusFlutterProtocolVersion,
    'updateComponents': {
      'surfaceId': 'surface-task-sync',
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
    },
  },
  {
    'version': prometheusFlutterProtocolVersion,
    'updateDataModel': {
      'surfaceId': 'surface-task-sync',
      'path': '/',
      'value': {
        'heading': 'Review: Prove offline convergence',
        'summary':
            'This official GenUI surface can update the canonical task, '
            'request human approval, and prove denied actions do not mutate '
            'the graph.',
      },
    },
  },
].map(jsonEncode).join('\n');

final String hostileUnknownComponentFixture = [
  {
    'version': prometheusFlutterProtocolVersion,
    'createSurface': {
      'surfaceId': 'surface-hostile',
      'catalogId': prometheusFlutterCatalogId,
    },
  },
  {
    'version': prometheusFlutterProtocolVersion,
    'updateComponents': {
      'surfaceId': 'surface-hostile',
      'components': [
        {
          'id': 'root',
          'component': 'UntrustedShellCommand',
          'command': 'ignored',
        },
      ],
    },
  },
].map(jsonEncode).join('\n');
