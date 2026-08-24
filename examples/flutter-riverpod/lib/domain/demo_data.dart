/// Deterministic demo seed mirroring
/// `examples/agentic-a2ui/src/lib/demo-data.ts` byte for byte in meaning, so
/// the shared scenario contract (`project-atlas`, `task-schema`, `task-sync`,
/// `surface-task-sync`, `task.update`/`task.delete`) holds in every showcase.
library;

import 'models.dart';

const demoTenant = 'tenant-a';
const otherTenant = 'tenant-b';

const demoProjects = <DemoProject>[
  DemoProject(
    id: 'project-atlas',
    tenantId: demoTenant,
    name: 'Atlas 3.0',
    status: 'active',
  ),
  DemoProject(
    id: 'project-hermes',
    tenantId: demoTenant,
    name: 'Hermes Relay',
    status: 'paused',
  ),
];

const demoTasks = <DemoTask>[
  DemoTask(
    id: 'task-schema',
    tenantId: demoTenant,
    projectId: 'project-atlas',
    title: 'Ship the graph schema',
    status: 'in-progress',
    version: 1,
  ),
  DemoTask(
    id: 'task-sync',
    tenantId: demoTenant,
    projectId: 'project-atlas',
    title: 'Wire realtime sync',
    status: 'todo',
    version: 1,
  ),
  DemoTask(
    id: 'task-foreign',
    tenantId: otherTenant,
    projectId: 'project-hermes',
    title: 'Foreign tenant task',
    status: 'todo',
    version: 1,
  ),
];

const demoComments = <DemoComment>[
  DemoComment(
    id: 'comment-sync-1',
    tenantId: demoTenant,
    taskId: 'task-sync',
    body: 'Realtime coalescing is verified by the agent run.',
  ),
];

/// Stable query keys shared by the app, tests, and the coverage manifest.
abstract final class DemoListKeys {
  static const activeProjects = 'projects:active';
  static const projectTasks = 'tasks:by-project:project-atlas';
  static const taskComments = 'comments:by-task:task-sync';
}
