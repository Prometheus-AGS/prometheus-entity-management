import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../a2ui/domain/a2ui_contract.dart';
import '../../a2ui/infrastructure/deterministic_fixture.dart';
import '../../a2ui/presentation/safe_a2ui_surface.dart';
import '../application/showcase_controller.dart';
import '../domain/demo_models.dart';

final class ShowcaseScreen extends ConsumerWidget {
  const ShowcaseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(showcaseControllerProvider);
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          titleSpacing: 20,
          title: const _BrandTitle(),
          bottom: const TabBar(
            tabs: [
              Tab(icon: Icon(Icons.hub_outlined), text: 'Entity graph'),
              Tab(icon: Icon(Icons.auto_awesome_outlined), text: 'A2UI agent'),
            ],
          ),
        ),
        body: Column(
          children: [
            _StatusStrip(state: state),
            if (state.notice case final notice?)
              Semantics(
                liveRegion: true,
                label: 'Showcase status',
                child: Container(
                  width: double.infinity,
                  color: Theme.of(context).colorScheme.primaryContainer,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 10,
                  ),
                  child: Text(notice),
                ),
              ),
            Expanded(
              child: TabBarView(
                children: [
                  _EntityWorkspace(state: state),
                  _AgentWorkspace(state: state),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final class _BrandTitle extends StatelessWidget {
  const _BrandTitle();

  @override
  Widget build(BuildContext context) => const Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(Icons.local_fire_department_outlined),
      SizedBox(width: 10),
      Flexible(
        child: Text(
          'PROMETHEUS · ENTITY GRAPH',
          overflow: TextOverflow.ellipsis,
        ),
      ),
    ],
  );
}

final class _StatusStrip extends ConsumerWidget {
  const _StatusStrip({required this.state});

  final ShowcaseState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = state.repositoryStatus;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
      child: Wrap(
        spacing: 12,
        runSpacing: 8,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Semantics(
            label: status.isOnline ? 'Transport online' : 'Transport offline',
            child: Chip(
              avatar: Icon(
                status.isOnline ? Icons.cloud_done : Icons.cloud_off,
                size: 18,
              ),
              label: Text(status.isOnline ? 'ONLINE' : 'LOCAL-FIRST'),
            ),
          ),
          Chip(
            avatar: const Icon(Icons.sync, size: 18),
            label: Text('${status.pendingWrites} queued'),
          ),
          Chip(
            avatar: const Icon(Icons.memory_outlined, size: 18),
            label: Text(status.transportLabel),
          ),
          Semantics(
            label: 'Toggle offline mode',
            child: Switch(
              value: status.isOnline,
              onChanged: state.isBusy
                  ? null
                  : ref.read(showcaseControllerProvider.notifier).setOnline,
            ),
          ),
        ],
      ),
    );
  }
}

final class _EntityWorkspace extends ConsumerWidget {
  const _EntityWorkspace({required this.state});

  final ShowcaseState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listProvider = entityListProvider<DemoTask>(
      type: demoTaskType,
      queryKey: demoTaskListKey,
      fromGraph: demoTaskFromGraph,
      toGraph: demoTaskToGraph,
      query: const ListQuery(
        filter: [
          FilterClause(field: 'status', op: FilterOperator.eq, value: 'todo'),
        ],
        sort: [SortClause(field: 'title')],
      ),
      completeness: state.completeness,
      subscribe: true,
    );
    final tasks = ref.watch(listProvider);
    final controller = ref.read(showcaseControllerProvider.notifier);

    return RefreshIndicator(
      onRefresh: () => ref.read(listProvider.notifier).refetch(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 48),
        children: [
          Text(
            'Normalized task workspace',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 6),
          const Text(
            'Lists retain IDs. List, detail, project, and assignee views rejoin '
            'one canonical EntityGraph through generated Riverpod providers.',
          ),
          const SizedBox(height: 20),
          _CompletenessSelector(state: state),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              FilledButton.icon(
                onPressed: state.isBusy ? null : controller.createTask,
                icon: const Icon(Icons.add),
                label: const Text('Create task'),
              ),
              OutlinedButton.icon(
                onPressed: state.isBusy
                    ? null
                    : controller.simulateRealtimeChange,
                icon: const Icon(Icons.bolt_outlined),
                label: const Text('Realtime change'),
              ),
            ],
          ),
          const SizedBox(height: 20),
          LayoutBuilder(
            builder: (context, constraints) {
              final list = _TaskList(
                tasks: tasks,
                selectedId: state.selectedTaskId,
              );
              final detail = _TaskDetail(state: state);
              if (constraints.maxWidth < 760) {
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [list, const SizedBox(height: 16), detail],
                );
              }
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(flex: 5, child: list),
                  const SizedBox(width: 16),
                  Expanded(flex: 6, child: detail),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

final class _CompletenessSelector extends ConsumerWidget {
  const _CompletenessSelector({required this.state});

  final ShowcaseState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) => Semantics(
    label: 'View completeness mode',
    child: SegmentedButton<ViewCompleteness>(
      segments: const [
        ButtonSegment(value: ViewCompleteness.local, label: Text('Local')),
        ButtonSegment(value: ViewCompleteness.remote, label: Text('Remote')),
        ButtonSegment(value: ViewCompleteness.hybrid, label: Text('Hybrid')),
      ],
      selected: {state.completeness},
      onSelectionChanged: state.isBusy
          ? null
          : (selection) => ref
                .read(showcaseControllerProvider.notifier)
                .setCompleteness(selection.single),
    ),
  );
}

final class _TaskList extends StatelessWidget {
  const _TaskList({required this.tasks, required this.selectedId});

  final AsyncValue<EntityListSnapshot<DemoTask>> tasks;
  final String? selectedId;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Todo list · ID membership',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 12),
          tasks.when(
            loading: () => const _LoadingState(),
            error: (error, stackTrace) => _ErrorState(error: error),
            data: (snapshot) => snapshot.items.isEmpty
                ? const _EmptyState()
                : Column(
                    children: [
                      for (final task in snapshot.items)
                        _TaskListTile(
                          task: task,
                          selected: task.id == selectedId,
                        ),
                    ],
                  ),
          ),
        ],
      ),
    ),
  );
}

final class _TaskListTile extends ConsumerWidget {
  const _TaskListTile({required this.task, required this.selected});

  final DemoTask task;
  final bool selected;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final project = ref.watch(
      entityProvider<DemoProject>(
        type: demoProjectType,
        id: task.projectId,
        fromGraph: demoProjectFromGraph,
        toGraph: demoProjectToGraph,
        enabled: false,
        subscribe: true,
      ),
    );
    final projectName = project.asData?.value.entity?.name ?? task.projectId;
    return Semantics(
      selected: selected,
      button: true,
      label: '${task.title}, project $projectName',
      child: ListTile(
        selected: selected,
        contentPadding: const EdgeInsets.symmetric(horizontal: 8),
        leading: CircleAvatar(child: Text('${task.version}')),
        title: Text(task.title),
        subtitle: Text('$projectName · ${task.priority}'),
        trailing: task.pendingSync
            ? const Tooltip(
                message: 'Queued for sync',
                child: Icon(Icons.schedule_send),
              )
            : const Icon(Icons.chevron_right),
        onTap: () =>
            ref.read(showcaseControllerProvider.notifier).selectTask(task.id),
      ),
    );
  }
}

final class _TaskDetail extends ConsumerWidget {
  const _TaskDetail({required this.state});

  final ShowcaseState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final id = state.selectedTaskId;
    if (id == null) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text('Select a task to inspect the canonical graph row.'),
        ),
      );
    }
    final task = ref.watch(
      entityProvider<DemoTask>(
        type: demoTaskType,
        id: id,
        fromGraph: demoTaskFromGraph,
        toGraph: demoTaskToGraph,
        enabled: false,
        subscribe: true,
      ),
    );
    return task.when(
      loading: () => const Card(
        child: Padding(padding: EdgeInsets.all(24), child: _LoadingState()),
      ),
      error: (error, stackTrace) => Card(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _ErrorState(error: error),
        ),
      ),
      data: (snapshot) {
        final row = snapshot.entity;
        if (row == null) {
          return const Card(
            child: Padding(padding: EdgeInsets.all(24), child: _EmptyState()),
          );
        }
        return _TaskDetailCard(task: row, state: state);
      },
    );
  }
}

final class _TaskDetailCard extends ConsumerWidget {
  const _TaskDetailCard({required this.task, required this.state});

  final DemoTask task;
  final ShowcaseState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final project = ref.watch(
      entityProvider<DemoProject>(
        type: demoProjectType,
        id: task.projectId,
        fromGraph: demoProjectFromGraph,
        toGraph: demoProjectToGraph,
        enabled: false,
        subscribe: true,
      ),
    );
    final assignee = ref.watch(
      entityProvider<DemoUser>(
        type: demoUserType,
        id: task.assigneeId,
        fromGraph: demoUserFromGraph,
        toGraph: demoUserToGraph,
        enabled: false,
        subscribe: true,
      ),
    );
    final controller = ref.read(showcaseControllerProvider.notifier);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Canonical detail',
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: 8),
            Text(task.title, style: Theme.of(context).textTheme.headlineSmall),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                Chip(label: Text(task.status)),
                Chip(label: Text(task.priority)),
                Chip(label: Text('v${task.version}')),
                if (task.pendingSync) const Chip(label: Text('pending sync')),
              ],
            ),
            const Divider(height: 28),
            _RelationshipRow(
              icon: Icons.folder_outlined,
              label: 'Project',
              value: project.asData?.value.entity?.name ?? task.projectId,
            ),
            _RelationshipRow(
              icon: Icons.person_outline,
              label: 'Assignee',
              value: assignee.asData?.value.entity?.name ?? task.assigneeId,
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton.tonalIcon(
                  onPressed: state.isBusy
                      ? null
                      : controller.renameSelectedTask,
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Optimistic rename'),
                ),
                FilledButton.tonalIcon(
                  onPressed: state.isBusy ? null : controller.moveSelectedTask,
                  icon: const Icon(Icons.move_up_outlined),
                  label: const Text('Move project'),
                ),
                OutlinedButton.icon(
                  onPressed: state.isBusy
                      ? null
                      : controller.demonstrateRollback,
                  icon: const Icon(Icons.undo),
                  label: const Text('Prove rollback'),
                ),
                OutlinedButton.icon(
                  onPressed: state.isBusy
                      ? null
                      : () => _confirmDelete(context, controller),
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Delete'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    ShowcaseController controller,
  ) async {
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete this task?'),
        content: const Text(
          'This demonstrates graph-owned optimistic removal and list cleanup.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (approved == true) await controller.deleteSelectedTask();
  }
}

final class _RelationshipRow extends StatelessWidget {
  const _RelationshipRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => ListTile(
    contentPadding: EdgeInsets.zero,
    leading: Icon(icon),
    title: Text(label),
    subtitle: Text(value),
  );
}

final class _AgentWorkspace extends ConsumerWidget {
  const _AgentWorkspace({required this.state});

  final ShowcaseState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(showcaseControllerProvider.notifier);
    final task = ref.watch(
      entityProvider<DemoTask>(
        type: demoTaskType,
        id: 'task-sync',
        fromGraph: demoTaskFromGraph,
        toGraph: demoTaskToGraph,
        enabled: false,
        subscribe: true,
      ),
    );
    final taskRow = task.asData?.value.entity;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 48),
      children: [
        Text(
          'Policy-gated A2UI',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: 6),
        const Text(
          'The app validates A2UI 1.0-RC surfaces, then adapts them to the '
          'published GenUI v0.9 renderer boundary. An atomic '
          'preflight restricts widgets and declared actions; application policy '
          'then validates tenant, payload, approval, and mutation intent.',
        ),
        const SizedBox(height: 16),
        SwitchListTile(
          title: const Text('Load hostile unknown-component fixture'),
          subtitle: const Text(
            'It must fail before the official surface mutates.',
          ),
          value: state.showHostileFixture,
          onChanged: controller.showHostileFixture,
        ),
        const SizedBox(height: 8),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: SafeA2uiSurface(
              key: ValueKey(state.showHostileFixture),
              source: state.showHostileFixture
                  ? hostileUnknownComponentFixture
                  : sharedTaskReviewFixture,
              onAction: controller.handleAgentAction,
            ),
          ),
        ),
        const SizedBox(height: 16),
        if (state.lastDecision case final decision?)
          _PolicyReceipt(decision: decision),
        if (state.pendingApproval case final approval?)
          _ApprovalCard(approval: approval),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            leading: const Icon(Icons.account_tree_outlined),
            title: const Text('Canonical task-sync projection'),
            subtitle: Text(
              taskRow != null
                  ? '${taskRow.title} · ${taskRow.status} · v${taskRow.version}'
                  : 'Task not present',
            ),
          ),
        ),
      ],
    );
  }
}

final class _PolicyReceipt extends StatelessWidget {
  const _PolicyReceipt({required this.decision});

  final A2uiPolicyDecision decision;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    label: 'A2UI policy decision ${decision.outcome.name}',
    child: Card(
      child: ListTile(
        leading: Icon(switch (decision.outcome) {
          A2uiPolicyOutcome.allowed => Icons.verified_outlined,
          A2uiPolicyOutcome.requiresApproval => Icons.approval_outlined,
          A2uiPolicyOutcome.denied => Icons.block_outlined,
        }),
        title: Text('${decision.intent.name} · ${decision.outcome.name}'),
        subtitle: Text(decision.reason),
      ),
    ),
  );
}

final class _ApprovalCard extends ConsumerWidget {
  const _ApprovalCard({required this.approval});

  final PendingAgentApproval approval;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final controller = ref.read(showcaseControllerProvider.notifier);
    return Card(
      color: Theme.of(context).colorScheme.tertiaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Human approval required',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 6),
            Text(approval.decision.reason),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton(
                  onPressed: controller.denyAgentAction,
                  child: const Text('Deny'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: controller.approveAgentAction,
                  child: const Text('Approve'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

final class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    label: 'Entity data is loading',
    child: const Center(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: CircularProgressIndicator(),
      ),
    ),
  );
}

final class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error});

  final Object error;

  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    label: 'Entity data failed to load',
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Text('Unable to load the normalized view: $error'),
    ),
  );
}

final class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) => Semantics(
    label: 'No matching tasks',
    child: const Padding(
      padding: EdgeInsets.all(24),
      child: Column(
        children: [
          Icon(Icons.inbox_outlined, size: 36),
          SizedBox(height: 8),
          Text('No todo tasks match this view.'),
        ],
      ),
    ),
  );
}
