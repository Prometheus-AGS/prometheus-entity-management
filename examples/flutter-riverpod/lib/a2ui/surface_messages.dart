/// Application-owned A2UI 1.0 surface messages for the deterministic task
/// board.
///
/// The keyless demo agent emits these exact envelopes into the official
/// `a2ui_core` `MessageProcessor`; interactive buttons route through the
/// app-owned [A2uiActionPolicy], so an agent can never write outside the
/// declared action catalog. Mirrors `surface-messages.ts` in the agentic-a2ui
/// example on the A2UI 1.0 wire: `version: "1.0"`, `@path` bindings, no
/// theme, and the 1.0 basic catalog.
library;

import '../features/a2ui/application/a2ui_surface_store.dart'
    show prometheusFlutterCatalogId;

import '../domain/demo_data.dart';

/// Surface id asserted by the shared scenario contract.
const taskBoardSurfaceId = 'surface-task-sync';

/// A2UI wire version every envelope declares.
const _version = '1.0';

/// The `mark-done` button sends an allowlisted `task.update`; `replace-task`
/// is destructive and gated behind human approval; `delete-task` is
/// intentionally not allowlisted so the fail-closed denial path is visible in
/// the rendered surface itself.
List<Map<String, Object?>> createTaskBoardSurfaceMessages({
  required String taskId,
  required String title,
  required String status,
  String tenantId = demoTenant,
}) {
  return [
    {
      'version': _version,
      'createSurface': {
        'surfaceId': taskBoardSurfaceId,
        'catalogId': prometheusFlutterCatalogId,
        'sendDataModel': true,
      },
    },
    {
      'version': _version,
      'updateComponents': {
        'surfaceId': taskBoardSurfaceId,
        'components': [
          {'id': 'root', 'component': 'Card', 'child': 'layout'},
          {
            'id': 'layout',
            'component': 'Column',
            'children': ['heading', 'status', 'actions'],
          },
          {
            'id': 'heading',
            'component': 'Text',
            'text': {'@path': '/title'},
            'variant': 'body',
          },
          {
            'id': 'status',
            'component': 'Text',
            'text': {'@path': '/status'},
            'variant': 'caption',
          },
          {
            'id': 'actions',
            'component': 'Row',
            'children': ['mark_done', 'replace_task', 'delete_task'],
          },
          {
            'id': 'mark_done',
            'component': 'Button',
            'child': 'mark_done_label',
            'variant': 'primary',
            'action': {
              'event': {
                'name': 'task.update',
                'context': {
                  'entityType': 'Task',
                  'entityId': taskId,
                  'tenantId': tenantId,
                  'data': {'@path': '/markDoneData'},
                },
              },
            },
          },
          {'id': 'mark_done_label', 'component': 'Text', 'text': 'Mark done'},
          {
            'id': 'replace_task',
            'component': 'Button',
            'child': 'replace_task_label',
            'action': {
              'event': {
                'name': 'task.replace',
                'context': {
                  'entityType': 'Task',
                  'entityId': taskId,
                  'tenantId': tenantId,
                  'data': {'@path': '/replaceData'},
                },
              },
            },
          },
          {
            'id': 'replace_task_label',
            'component': 'Text',
            'text': 'Replace title',
          },
          {
            'id': 'delete_task',
            'component': 'Button',
            'child': 'delete_task_label',
            'action': {
              'event': {
                'name': 'task.delete',
                'context': {
                  'entityType': 'Task',
                  'entityId': taskId,
                  'tenantId': tenantId,
                },
              },
            },
          },
          {'id': 'delete_task_label', 'component': 'Text', 'text': 'Delete'},
        ],
      },
    },
    {
      'version': _version,
      'updateDataModel': {
        'surfaceId': taskBoardSurfaceId,
        'path': '/',
        'value': {
          'title': title,
          'status': 'Status: $status',
          'markDoneData': {'status': 'done'},
          'replaceData': {'title': '$title (replaced)'},
        },
      },
    },
  ];
}
