import 'dart:convert';

import '../application/a2ui_surface_store.dart' show prometheusFlutterCatalogId;

/// A2UI wire version every fixture envelope declares.
const prometheusFlutterProtocolVersion = '1.0';

/// Surface id the agent workspace registers; any other is refused.
const agentSurfaceId = 'surface-task-sync';

/// Deterministic A2UI 1.0 surface used by the Flutter showcase, as the JSON
/// an agent would send. The official `a2ui_core` processor consumes it
/// natively against the 1.0 basic catalog.
final String sharedTaskReviewFixture = jsonEncode([
  {
    'version': prometheusFlutterProtocolVersion,
    'createSurface': {
      'surfaceId': agentSurfaceId,
      'catalogId': prometheusFlutterCatalogId,
      'sendDataModel': true,
    },
  },
  {
    'version': prometheusFlutterProtocolVersion,
    'updateComponents': {
      'surfaceId': agentSurfaceId,
      'components': [
        {'id': 'root', 'component': 'Card', 'child': 'content'},
        {
          'id': 'content',
          'component': 'Column',
          'children': [
            'eyebrow',
            'heading',
            'summary',
            'update_button',
            'archive_button',
            'delete_button',
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
          'text': {'@path': '/heading'},
          'variant': 'body',
        },
        {
          'id': 'summary',
          'component': 'Text',
          'text': {'@path': '/summary'},
        },
        {
          'id': 'update_button',
          'component': 'Button',
          'child': 'update_label',
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
        {'id': 'update_label', 'component': 'Text', 'text': 'Mark task done'},
        {
          'id': 'archive_button',
          'component': 'Button',
          'child': 'archive_label',
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
          'id': 'archive_label',
          'component': 'Text',
          'text': 'Archive with approval',
        },
        {
          'id': 'delete_button',
          'component': 'Button',
          'child': 'delete_label',
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
          'id': 'delete_label',
          'component': 'Text',
          'text': 'Attempt denied delete',
        },
      ],
    },
  },
  {
    'version': prometheusFlutterProtocolVersion,
    'updateDataModel': {
      'surfaceId': agentSurfaceId,
      'path': '/',
      'value': {
        'heading': 'Review: Prove offline convergence',
        'summary':
            'This A2UI 1.0 surface can update the canonical task, request '
            'human approval, and prove denied actions do not mutate the graph.',
      },
    },
  },
]);

/// A batch naming a component outside the catalog; the processor must refuse
/// it before any of it renders.
final String hostileUnknownComponentFixture = jsonEncode([
  {
    'version': prometheusFlutterProtocolVersion,
    'createSurface': {
      'surfaceId': agentSurfaceId,
      'catalogId': prometheusFlutterCatalogId,
    },
  },
  {
    'version': prometheusFlutterProtocolVersion,
    'updateComponents': {
      'surfaceId': agentSurfaceId,
      'components': [
        {
          'id': 'root',
          'component': 'UntrustedShellCommand',
          'command': 'ignored',
        },
      ],
    },
  },
]);
