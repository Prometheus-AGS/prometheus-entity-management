import 'dart:async';

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../a2ui/domain/a2ui_contract.dart';
import '../domain/demo_models.dart';
import '../infrastructure/demo_repository.dart';

part 'showcase_controller.g.dart';

const _unchanged = Object();

@Riverpod(keepAlive: true)
DemoRepository demoRepository(Ref ref) => throw StateError(
  'DemoRepository must be supplied by the application ProviderScope.',
);

final class PendingAgentApproval {
  const PendingAgentApproval({required this.decision});

  final A2uiPolicyDecision decision;
}

final class ShowcaseState {
  const ShowcaseState({
    required this.repositoryStatus,
    this.completeness = ViewCompleteness.hybrid,
    this.selectedTaskId = 'task-sync',
    this.isBusy = false,
    this.showHostileFixture = false,
    this.notice = 'Hybrid view: local graph first, deterministic service next.',
    this.pendingApproval,
    this.lastDecision,
  });

  final DemoRepositoryStatus repositoryStatus;
  final ViewCompleteness completeness;
  final String? selectedTaskId;
  final bool isBusy;
  final bool showHostileFixture;
  final String? notice;
  final PendingAgentApproval? pendingApproval;
  final A2uiPolicyDecision? lastDecision;

  ShowcaseState copyWith({
    DemoRepositoryStatus? repositoryStatus,
    ViewCompleteness? completeness,
    Object? selectedTaskId = _unchanged,
    bool? isBusy,
    bool? showHostileFixture,
    Object? notice = _unchanged,
    Object? pendingApproval = _unchanged,
    Object? lastDecision = _unchanged,
  }) => ShowcaseState(
    repositoryStatus: repositoryStatus ?? this.repositoryStatus,
    completeness: completeness ?? this.completeness,
    selectedTaskId: identical(selectedTaskId, _unchanged)
        ? this.selectedTaskId
        : selectedTaskId as String?,
    isBusy: isBusy ?? this.isBusy,
    showHostileFixture: showHostileFixture ?? this.showHostileFixture,
    notice: identical(notice, _unchanged) ? this.notice : notice as String?,
    pendingApproval: identical(pendingApproval, _unchanged)
        ? this.pendingApproval
        : pendingApproval as PendingAgentApproval?,
    lastDecision: identical(lastDecision, _unchanged)
        ? this.lastDecision
        : lastDecision as A2uiPolicyDecision?,
  );
}

@Riverpod(keepAlive: true)
final class ShowcaseController extends _$ShowcaseController {
  static const _policy = A2uiActionPolicy();

  @override
  ShowcaseState build() {
    final repository = ref.watch(demoRepositoryProvider);
    final subscription = repository.statusChanges.listen((status) {
      state = state.copyWith(repositoryStatus: status);
    });
    ref.onDispose(subscription.cancel);
    return ShowcaseState(repositoryStatus: repository.status);
  }

  void selectTask(String id) {
    state = state.copyWith(
      selectedTaskId: id,
      notice: 'Detail and list now join the same normalized task $id.',
    );
  }

  void setCompleteness(ViewCompleteness value) {
    state = state.copyWith(
      completeness: value,
      notice: switch (value) {
        ViewCompleteness.local => 'Local mode evaluates the canonical graph.',
        ViewCompleteness.remote =>
          'Remote mode refreshes ID membership through the transport.',
        ViewCompleteness.hybrid =>
          'Hybrid mode renders local IDs before transport reconciliation.',
      },
    );
  }

  void setOnline(bool value) {
    ref.read(demoRepositoryProvider).setOnline(value);
    state = state.copyWith(
      notice: value
          ? 'Online: queued local writes converged through realtime events.'
          : 'Offline: CRUD commits to the local authority and queues sync.',
    );
  }

  Future<void> createTask() => _execute(
    'Task created and normalized.',
    () async {
      final optimisticId = 'optimistic-mobile';
      final data = <String, Object?>{
        'id': optimisticId,
        'tenantId': demoTenantId,
        'projectId': 'project-atlas',
        'assigneeId': 'user-grace',
        'title': 'Review mobile entity graph',
        'status': 'todo',
        'priority': 'medium',
        'version': 0,
        'updatedAt': '2030-01-15T12:00:00.000Z',
        'pendingSync': !state.repositoryStatus.isOnline,
      };
      final created = await ref
          .read(
            entityMutationsProvider<DemoTask>(
              type: demoTaskType,
              toGraph: demoTaskToGraph,
            ).notifier,
          )
          .create(data, optimisticId: optimisticId, queryKey: demoTaskListKey);
      state = state.copyWith(selectedTaskId: created.id);
    },
  );

  Future<void> renameSelectedTask() async {
    final id = state.selectedTaskId;
    if (id == null) return;
    await _execute('Optimistic title confirmed in every view.', () async {
      final graph = ref.read(entityGraphProvider);
      final current = graph.readEntity(demoTaskType, id);
      if (current == null) return;
      final controller = _crud(id);
      controller.edit('tenantId', demoTenantId);
      controller.edit('title', '${current['title']} · mobile');
      controller.applyOptimistic();
      await controller.save();
    });
  }

  Future<void> moveSelectedTask() async {
    final id = state.selectedTaskId;
    if (id == null) return;
    await _execute(
      'Old and new relationship views were invalidated.',
      () async {
        final graph = ref.read(entityGraphProvider);
        final current = graph.readEntity(demoTaskType, id);
        if (current == null) return;
        final oldProject = current['projectId']! as String;
        final newProject = oldProject == 'project-atlas'
            ? 'project-hermes'
            : 'project-atlas';
        final controller = _crud(id);
        controller.edit('tenantId', demoTenantId);
        controller.edit('projectId', newProject);
        controller.applyOptimistic();
        await controller.save();
        graph.setListStale('tasks:$oldProject', stale: true);
        graph.setListStale('tasks:$newProject', stale: true);
        graph.invalidateEntity(demoProjectType, id: oldProject);
        graph.invalidateEntity(demoProjectType, id: newProject);
      },
    );
  }

  Future<void> demonstrateRollback() async {
    final id = state.selectedTaskId;
    if (id == null) return;
    ref.read(demoRepositoryProvider).rejectNextWrite();
    await _execute(
      'The deterministic rejection restored canonical state and patches.',
      () async {
        final controller = _crud(id);
        controller.edit('tenantId', demoTenantId);
        controller.edit('priority', 'blocked');
        controller.applyOptimistic();
        await controller.save();
      },
      expectedFailure: true,
    );
  }

  Future<void> deleteSelectedTask() async {
    final id = state.selectedTaskId;
    if (id == null) return;
    await _execute('Task deleted from the graph and all ID lists.', () async {
      await _crud(id).deleteEntity();
      state = state.copyWith(selectedTaskId: null);
    });
  }

  void simulateRealtimeChange() {
    ref.read(demoRepositoryProvider).simulateRealtimeChange();
    state = state.copyWith(
      notice: 'Realtime changed task-sync and its joined project once.',
    );
  }

  void showHostileFixture(bool value) {
    state = state.copyWith(
      showHostileFixture: value,
      notice: value
          ? 'The hostile component fixture is rejected before GenUI mutation.'
          : 'The shared task-review fixture is active.',
    );
  }

  Future<void> handleAgentAction(A2uiActionIntent intent) async {
    final decision = _policy.evaluate(intent);
    state = state.copyWith(lastDecision: decision);
    switch (decision.outcome) {
      case A2uiPolicyOutcome.allowed:
        await _updateTaskFromAgent(decision);
      case A2uiPolicyOutcome.requiresApproval:
        state = state.copyWith(
          pendingApproval: PendingAgentApproval(decision: decision),
          notice: decision.reason,
        );
      case A2uiPolicyOutcome.denied:
        state = state.copyWith(
          notice: 'Denied without graph mutation: ${decision.reason}',
        );
    }
  }

  Future<void> approveAgentAction() async {
    final approval = state.pendingApproval;
    if (approval == null) return;
    state = state.copyWith(pendingApproval: null);
    await _execute(
      'Human-approved archive updated the canonical task.',
      () async {
        final taskId = approval.decision.intent.context['taskId']! as String;
        final controller = _crud(taskId);
        controller.edit('tenantId', demoTenantId);
        controller.edit('status', 'archived');
        controller.applyOptimistic();
        await controller.save();
      },
    );
  }

  void denyAgentAction() {
    state = state.copyWith(
      pendingApproval: null,
      notice: 'Human denied the pending action; the graph was unchanged.',
    );
  }

  EntityCrud<DemoTask> _crud(String id) => ref.read(
    entityCrudProvider<DemoTask>(
      type: demoTaskType,
      id: id,
      toGraph: demoTaskToGraph,
    ).notifier,
  );

  Future<void> _updateTaskFromAgent(A2uiPolicyDecision decision) => _execute(
    'Allowlisted A2UI update reached list and detail projections.',
    () async {
      final context = decision.intent.context;
      final taskId = context['taskId']! as String;
      final controller = _crud(taskId);
      controller.edit('tenantId', demoTenantId);
      controller.edit('status', context['status']);
      controller.applyOptimistic();
      await controller.save();
      state = state.copyWith(selectedTaskId: taskId);
    },
  );

  Future<void> _execute(
    String success,
    Future<void> Function() operation, {
    bool expectedFailure = false,
  }) async {
    if (state.isBusy) return;
    state = state.copyWith(isBusy: true, notice: null);
    try {
      await operation();
      state = state.copyWith(isBusy: false, notice: success);
    } on EntityGraphError catch (error) {
      state = state.copyWith(
        isBusy: false,
        notice: expectedFailure
            ? '$success (${error.message})'
            : 'Operation failed: ${error.message}',
      );
    }
  }
}
