/// Application-owned A2UI v0.9 surface messages for the deterministic task
/// board.
///
/// The keyless demo agent emits these exact messages through genui's
/// `SurfaceController`; interactive buttons route through the app-owned
/// [A2uiActionPolicy], so an agent can never write outside the declared
/// action catalog. Mirrors `surface-messages.ts` in the agentic-a2ui example
/// on the A2UI v0.9 wire required by `a2ui_core`.
library;

import 'package:a2ui_core/a2ui_core.dart' as core;
import 'package:genui/genui.dart' show basicCatalogId;

import '../domain/demo_data.dart';

/// Surface id asserted by the shared scenario contract.
const taskBoardSurfaceId = 'surface-task-sync';

/// The `mark-done` button sends an allowlisted `task.update`; `replace-task`
/// is destructive and gated behind human approval; `delete-task` is
/// intentionally not allowlisted so the fail-closed denial path is visible in
/// the rendered surface itself.
List<core.A2uiMessage> createTaskBoardSurfaceMessages({
  required String taskId,
  required String title,
  required String status,
  String tenantId = demoTenant,
}) {
  return [
    core.CreateSurfaceMessage(
      surfaceId: taskBoardSurfaceId,
      catalogId: basicCatalogId,
      sendDataModel: true,
    ),
    core.UpdateComponentsMessage(
      surfaceId: taskBoardSurfaceId,
      components: [
        {'id': 'root', 'component': 'Card', 'child': 'layout'},
        {
          'id': 'layout',
          'component': 'Column',
          'children': ['heading', 'status', 'actions'],
        },
        {
          'id': 'heading',
          'component': 'Text',
          'text': {'path': '/title'},
          'variant': 'h2',
        },
        {
          'id': 'status',
          'component': 'Text',
          'text': {'path': '/status'},
          'variant': 'body',
        },
        {
          'id': 'actions',
          'component': 'Row',
          'children': ['mark-done', 'replace-task', 'delete-task'],
        },
        {
          'id': 'mark-done',
          'component': 'Button',
          'child': 'mark-done-label',
          'variant': 'primary',
          'action': {
            'event': {
              'name': 'task.update',
              'context': {
                'entityType': 'Task',
                'entityId': taskId,
                'tenantId': tenantId,
                'data': {'path': '/markDoneData'},
              },
            },
          },
        },
        {
          'id': 'mark-done-label',
          'component': 'Text',
          'text': 'Mark done',
          'variant': 'body',
        },
        {
          'id': 'replace-task',
          'component': 'Button',
          'child': 'replace-task-label',
          'action': {
            'event': {
              'name': 'task.replace',
              'context': {
                'entityType': 'Task',
                'entityId': taskId,
                'tenantId': tenantId,
                'data': {'path': '/replaceData'},
              },
            },
          },
        },
        {
          'id': 'replace-task-label',
          'component': 'Text',
          'text': 'Replace title',
          'variant': 'body',
        },
        {
          'id': 'delete-task',
          'component': 'Button',
          'child': 'delete-task-label',
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
        {
          'id': 'delete-task-label',
          'component': 'Text',
          'text': 'Delete',
          'variant': 'body',
        },
      ],
    ),
    core.UpdateDataModelMessage(
      surfaceId: taskBoardSurfaceId,
      value: {
        'title': title,
        'status': 'Status: $status',
        'markDoneData': {'status': 'done'},
        'replaceData': {'title': '$title (replaced)'},
      },
    ),
  ];
}
