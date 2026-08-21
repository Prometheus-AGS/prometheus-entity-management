/// Task board page: the primary cross-view surface of the showcase.
///
/// The task list and project header both read the same canonical graph
/// through generated Riverpod families; one entity update propagates to every
/// joined view without any manual refresh.
library;

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../a2ui/showcase_runtime.dart';
import '../domain/demo_data.dart';
import '../domain/models.dart';
import '../transport/demo_transport.dart';
import 'a2ui_panel.dart';
import 'platform_page.dart';
import 'task_detail_sheet.dart';

/// The demo transport registered for `Task`, exposed so the UI layer can arm
/// deterministic failure hooks without owning I/O.
final demoTaskTransportProvider = Provider<DemoEntityTransport<DemoTask>>(
  (ref) =>
      ref.watch(entityTransportRegistryProvider).get<DemoTask>('Task')
          as DemoEntityTransport<DemoTask>,
);

/// One A2UI runtime per application scope.
final showcaseRuntimeProvider = Provider<ShowcaseA2uiRuntime>((ref) {
  final runtime = ShowcaseA2uiRuntime(
    graph: ref.watch(entityGraphProvider),
    tenantId: demoTenant,
  );
  ref.onDispose(runtime.dispose);
  return runtime;
});

/// Parameter bundle for the generated task list family.
const taskListParams = (
  type: 'Task',
  queryKey: DemoListKeys.projectTasks,
  query: ListQuery(
    filter: [
      FilterClause(
        field: 'projectId',
        op: FilterOperator.eq,
        value: 'project-atlas',
      ),
    ],
    sort: [SortClause(field: 'title')],
  ),
);

/// Branded task board with list, detail, A2UI panel, and platform boundary.
class TaskBoardPage extends ConsumerStatefulWidget {
  const TaskBoardPage({super.key});

  @override
  ConsumerState<TaskBoardPage> createState() => _TaskBoardPageState();
}

class _TaskBoardPageState extends ConsumerState<TaskBoardPage> {
  var _showA2uiPanel = false;

  @override
  Widget build(BuildContext context) {
    final tasks = ref.watch(
      entityListProvider<DemoTask>(
        type: taskListParams.type,
        queryKey: taskListParams.queryKey,
        fromGraph: DemoTask.fromGraph,
        toGraph: DemoTask.encode,
        query: taskListParams.query,
        completeness: ViewCompleteness.hybrid,
      ),
    );
    return Scaffold(
      appBar: AppBar(
        title: const Text('Prometheus Tasks'),
        actions: [
          IconButton(
            tooltip: 'Toggle A2UI agent panel',
            icon: const Icon(Icons.smart_toy_outlined),
            onPressed: () => setState(() => _showA2uiPanel = !_showA2uiPanel),
          ),
          IconButton(
            tooltip: 'Open platform boundary page',
            icon: const Icon(Icons.phonelink_setup_outlined),
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute<void>(builder: (_) => const PlatformPage()),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          if (_showA2uiPanel) const A2uiPanel(),
          const _ProjectHeader(),
          Expanded(child: _buildTaskList(tasks)),
        ],
      ),
    );
  }

  Widget _buildTaskList(AsyncValue<EntityListSnapshot<DemoTask>> tasks) {
    return tasks.when(
      loading: () => const Center(
        child: CircularProgressIndicator(semanticsLabel: 'Loading tasks'),
      ),
      error: (error, _) => _errorView('$error'),
      // The provider self-heals transport failures into data snapshots that
      // still carry the stored list error; surface it identically.
      data: (snapshot) {
        if (snapshot.hasError && snapshot.items.isEmpty) {
          return _errorView(snapshot.error!.message);
        }
        if (snapshot.items.isEmpty) {
          return const Center(child: Text('No tasks yet'));
        }
        return ListView.builder(
          itemCount: snapshot.items.length,
          itemBuilder: (context, index) =>
              _TaskTile(task: snapshot.items[index]),
        );
      },
    );
  }

  Widget _errorView(String message) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text('Failed to load tasks: $message'),
        const SizedBox(height: 8),
        FilledButton(
          onPressed: () => ref.invalidate(
            entityListProvider<DemoTask>(
              type: taskListParams.type,
              queryKey: taskListParams.queryKey,
              fromGraph: DemoTask.fromGraph,
              toGraph: DemoTask.encode,
              query: taskListParams.query,
              completeness: ViewCompleteness.hybrid,
            ),
          ),
          child: const Text('Retry'),
        ),
      ],
    ),
  );
}

class _ProjectHeader extends ConsumerWidget {
  const _ProjectHeader();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final project = ref.watch(
      entityProvider<DemoProject>(
        type: 'Project',
        id: 'project-atlas',
        fromGraph: DemoProject.fromGraph,
        toGraph: DemoProject.encode,
        enabled: false,
      ),
    );
    final name = project.asData?.value.entity?.name ?? 'Atlas 3.0';
    return Semantics(
      header: true,
      child: ListTile(
        title: Text(name, style: Theme.of(context).textTheme.titleLarge),
        subtitle: const Text('tenant-a · hybrid view · canonical graph'),
      ),
    );
  }
}

class _TaskTile extends ConsumerWidget {
  const _TaskTile({required this.task});

  final DemoTask task;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Watching .notifier keeps the auto-dispose CRUD controller alive for the
    // tile's lifetime without rebuilding on buffer changes.
    final crud = ref.watch(
      entityCrudProvider<DemoTask>(
        type: 'Task',
        id: task.id,
        toGraph: DemoTask.encode,
      ).notifier,
    );
    final done = task.status == 'done';
    return Semantics(
      label: 'Task ${task.title}, status ${task.status}',
      child: ListTile(
        leading: Checkbox(
          value: done,
          onChanged: (value) async {
            crud.edit('status', value == true ? 'done' : 'todo');
            try {
              await crud.save();
            } on Object {
              // Rollback already restored the graph; the tile rebuilds from
              // the canonical state. The receipt surfaces via the tile error.
            }
          },
        ),
        title: Text(task.title),
        subtitle: Text('${task.status} · v${task.version}'),
        onTap: () => showModalBottomSheet<void>(
          context: context,
          builder: (_) => TaskDetailSheet(taskId: task.id),
        ),
      ),
    );
  }
}
