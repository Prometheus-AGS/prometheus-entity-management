import 'dart:async';

import 'package:entity_graph_flutter/entity_graph_flutter.dart';

import '../domain/demo_models.dart';

final class DemoRepositoryStatus {
  const DemoRepositoryStatus({
    required this.isOnline,
    required this.pendingWrites,
    required this.transportLabel,
  });

  final bool isOnline;
  final int pendingWrites;
  final String transportLabel;
}

/// Deterministic local-first service used by the showcase.
///
/// This service owns transport state and the offline write queue. It never owns
/// UI state or a second application entity cache: every visible row is
/// normalized into [EntityGraph] by the generated Riverpod providers.
final class DemoRepository {
  DemoRepository._({
    required this._tasks,
    required this._projects,
    required this._users,
  });

  factory DemoRepository.seeded() => DemoRepository._(
    tasks: {
      'task-schema': const DemoTask(
        id: 'task-schema',
        tenantId: demoTenantId,
        projectId: 'project-atlas',
        assigneeId: 'user-ada',
        title: 'Define shared schema',
        status: 'in-progress',
        priority: 'high',
        version: 1,
        updatedAt: '2030-01-15T11:15:00.000Z',
      ),
      'task-sync': const DemoTask(
        id: 'task-sync',
        tenantId: demoTenantId,
        projectId: 'project-atlas',
        assigneeId: 'user-grace',
        title: 'Prove offline convergence',
        status: 'todo',
        priority: 'critical',
        version: 1,
        updatedAt: '2030-01-15T11:20:00.000Z',
      ),
      'task-docs': const DemoTask(
        id: 'task-docs',
        tenantId: demoTenantId,
        projectId: 'project-hermes',
        assigneeId: 'user-grace',
        title: 'Publish migration guide',
        status: 'todo',
        priority: 'medium',
        version: 1,
        updatedAt: '2030-01-15T11:25:00.000Z',
      ),
    },
    projects: {
      'project-atlas': const DemoProject(
        id: 'project-atlas',
        tenantId: demoTenantId,
        name: 'Atlas Migration',
        status: 'active',
        ownerId: 'user-ada',
      ),
      'project-hermes': const DemoProject(
        id: 'project-hermes',
        tenantId: demoTenantId,
        name: 'Hermes Launch',
        status: 'planning',
        ownerId: 'user-grace',
      ),
    },
    users: {
      'user-ada': const DemoUser(
        id: 'user-ada',
        tenantId: demoTenantId,
        name: 'Ada Example',
        role: 'admin',
      ),
      'user-grace': const DemoUser(
        id: 'user-grace',
        tenantId: demoTenantId,
        name: 'Grace Example',
        role: 'member',
      ),
    },
  );

  final Map<String, DemoTask> _tasks;
  final Map<String, DemoProject> _projects;
  final Map<String, DemoUser> _users;
  final StreamController<ChangeEvent<DemoTask>> _taskChanges =
      StreamController.broadcast(sync: true);
  final StreamController<ChangeEvent<DemoProject>> _projectChanges =
      StreamController.broadcast(sync: true);
  final StreamController<ChangeEvent<DemoUser>> _userChanges =
      StreamController.broadcast(sync: true);
  final StreamController<DemoRepositoryStatus> _statusChanges =
      StreamController.broadcast(sync: true);

  bool _isOnline = true;
  bool _rejectNextWrite = false;
  int _pendingWrites = 0;
  int _nextTask = 1;
  int _clockTick = 0;

  DemoRepositoryStatus get status => DemoRepositoryStatus(
    isOnline: _isOnline,
    pendingWrites: _pendingWrites,
    transportLabel: 'Optional Rust FFI adapter → local-first service',
  );

  Stream<DemoRepositoryStatus> get statusChanges => _statusChanges.stream;
  Stream<ChangeEvent<DemoTask>> get taskChanges => _taskChanges.stream;
  Stream<ChangeEvent<DemoProject>> get projectChanges => _projectChanges.stream;
  Stream<ChangeEvent<DemoUser>> get userChanges => _userChanges.stream;

  void seedGraph(EntityGraph graph) {
    graph.upsertEntities(
      demoTaskType,
      _tasks.values
          .map((task) => (id: task.id, data: demoTaskToGraph(task)))
          .toList(),
    );
    graph.upsertEntities(
      demoProjectType,
      _projects.values
          .map((project) => (id: project.id, data: demoProjectToGraph(project)))
          .toList(),
    );
    graph.upsertEntities(
      demoUserType,
      _users.values
          .map((user) => (id: user.id, data: demoUserToGraph(user)))
          .toList(),
    );
    final todoIds =
        _tasks.values
            .where((task) => task.status == 'todo')
            .map((task) => task.id)
            .toList()
          ..sort();
    graph.setListResult(
      demoTaskListKey,
      todoIds,
      entityType: demoTaskType,
      total: todoIds.length,
    );
    graph.setListResult(
      'tasks:project-atlas',
      ['task-schema', 'task-sync'],
      entityType: demoTaskType,
      total: 2,
    );
    graph.setListResult(
      'tasks:project-hermes',
      ['task-docs'],
      entityType: demoTaskType,
      total: 1,
    );
  }

  void setOnline(bool value) {
    if (_isOnline == value) return;
    _isOnline = value;
    if (value) _flushPendingWrites();
    _emitStatus();
  }

  void rejectNextWrite() {
    _rejectNextWrite = true;
  }

  Future<ListResult<DemoTask>> listTasks(ListQuery query) async {
    await _latency();
    var rows = _tasks.values.where((task) => task.tenantId == demoTenantId);
    for (final clause in query.filter ?? const <FilterClause>[]) {
      rows = rows.where((task) => _matchesTask(task, clause));
    }
    if (query.search case final search? when search.isNotEmpty) {
      final needle = search.toLowerCase();
      rows = rows.where((task) => task.title.toLowerCase().contains(needle));
    }
    final ordered = rows.toList()
      ..sort((left, right) => left.title.compareTo(right.title));
    final limited = query.limit == null
        ? ordered
        : ordered.take(query.limit!).toList();
    return ListResult(rows: List.unmodifiable(limited), total: ordered.length);
  }

  Future<DemoTask?> getTask(String id) async {
    await _latency();
    return _tasks[id];
  }

  Future<DemoTask> createTask(Map<String, Object?> data) async {
    await _beforeWrite(data['tenantId']);
    final id = 'task-mobile-${_nextTask++}';
    final task = DemoTask(
      id: id,
      tenantId: demoTenantId,
      projectId: (data['projectId'] as String?) ?? 'project-atlas',
      assigneeId: (data['assigneeId'] as String?) ?? 'user-grace',
      title: (data['title'] as String?) ?? 'Untitled mobile task',
      status: (data['status'] as String?) ?? 'todo',
      priority: (data['priority'] as String?) ?? 'medium',
      version: 1,
      updatedAt: _nextTimestamp(),
      pendingSync: !_isOnline,
    );
    _tasks[id] = task;
    _recordWrite();
    _taskChanges.add(ChangeEvent(op: ChangeOp.insert, id: id, row: task));
    return task;
  }

  Future<DemoTask> updateTask(String id, Map<String, Object?> patch) async {
    await _beforeWrite(patch['tenantId']);
    final current = _tasks[id];
    if (current == null) {
      throw TerminalError('Task $id does not exist', statusCode: 404);
    }
    final next = current.copyWith(
      projectId: patch['projectId'] as String?,
      assigneeId: patch['assigneeId'] as String?,
      title: patch['title'] as String?,
      status: patch['status'] as String?,
      priority: patch['priority'] as String?,
      version: current.version + 1,
      updatedAt: _nextTimestamp(),
      pendingSync: !_isOnline,
    );
    _tasks[id] = next;
    _recordWrite();
    _taskChanges.add(ChangeEvent(op: ChangeOp.update, id: id, row: next));
    return next;
  }

  Future<void> deleteTask(String id) async {
    await _beforeWrite(demoTenantId);
    if (_tasks.remove(id) == null) {
      throw TerminalError('Task $id does not exist', statusCode: 404);
    }
    _recordWrite();
    _taskChanges.add(ChangeEvent(op: ChangeOp.delete, id: id));
  }

  Future<ListResult<DemoProject>> listProjects(ListQuery query) async {
    await _latency();
    final rows = _projects.values.toList()
      ..sort((left, right) => left.name.compareTo(right.name));
    return ListResult(rows: List.unmodifiable(rows), total: rows.length);
  }

  Future<DemoProject?> getProject(String id) async {
    await _latency();
    return _projects[id];
  }

  Future<ListResult<DemoUser>> listUsers(ListQuery query) async {
    await _latency();
    final rows = _users.values.toList()
      ..sort((left, right) => left.name.compareTo(right.name));
    return ListResult(rows: List.unmodifiable(rows), total: rows.length);
  }

  Future<DemoUser?> getUser(String id) async {
    await _latency();
    return _users[id];
  }

  void simulateRealtimeChange() {
    final current = _tasks['task-sync'];
    if (current == null) return;
    final next = current.copyWith(
      status: current.status == 'todo' ? 'in-progress' : 'todo',
      version: current.version + 1,
      updatedAt: _nextTimestamp(),
    );
    _tasks[next.id] = next;
    _taskChanges.add(ChangeEvent(op: ChangeOp.update, id: next.id, row: next));

    final project = _projects['project-atlas'];
    if (project != null) {
      final renamed = DemoProject(
        id: project.id,
        tenantId: project.tenantId,
        name: project.name == 'Atlas Migration'
            ? 'Atlas 3.0 Migration'
            : 'Atlas Migration',
        status: project.status,
        ownerId: project.ownerId,
      );
      _projects[renamed.id] = renamed;
      _projectChanges.add(
        ChangeEvent(op: ChangeOp.update, id: renamed.id, row: renamed),
      );
    }
  }

  Future<void> dispose() async {
    await Future.wait([
      _taskChanges.close(),
      _projectChanges.close(),
      _userChanges.close(),
      _statusChanges.close(),
    ]);
  }

  bool _matchesTask(DemoTask task, FilterClause clause) {
    final value = switch (clause.field) {
      'status' => task.status,
      'projectId' => task.projectId,
      'assigneeId' => task.assigneeId,
      'priority' => task.priority,
      _ => null,
    };
    return switch (clause.op) {
      FilterOperator.eq => value == clause.value,
      FilterOperator.neq => value != clause.value,
      FilterOperator.contains => value.toString().contains(
        clause.value.toString(),
      ),
      _ => true,
    };
  }

  Future<void> _beforeWrite(Object? tenantId) async {
    await _latency();
    if (tenantId != null && tenantId != demoTenantId) {
      throw const TerminalError('Tenant mismatch', statusCode: 403);
    }
    if (_rejectNextWrite) {
      _rejectNextWrite = false;
      throw const TerminalError(
        'Deterministic server rejection for rollback demonstration',
        statusCode: 409,
      );
    }
  }

  Future<void> _latency() =>
      Future<void>.delayed(const Duration(milliseconds: 180));

  void _recordWrite() {
    if (!_isOnline) _pendingWrites += 1;
    _emitStatus();
  }

  void _flushPendingWrites() {
    if (_pendingWrites == 0) return;
    for (final entry in _tasks.entries.toList()) {
      if (!entry.value.pendingSync) continue;
      final synced = entry.value.copyWith(
        pendingSync: false,
        updatedAt: _nextTimestamp(),
      );
      _tasks[entry.key] = synced;
      _taskChanges.add(
        ChangeEvent(op: ChangeOp.update, id: entry.key, row: synced),
      );
    }
    _pendingWrites = 0;
  }

  void _emitStatus() => _statusChanges.add(status);

  String _nextTimestamp() {
    _clockTick += 1;
    return DateTime.utc(2030, 1, 15, 12, 0, _clockTick).toIso8601String();
  }
}

/// Callback-backed Rust transport seam. It deliberately forwards to the
/// service and never stores graph state.
final class DemoRustTaskBridge implements FfiEntityBridge<DemoTask> {
  const DemoRustTaskBridge(this.repository);

  final DemoRepository repository;

  @override
  String identify(DemoTask row) => row.id;

  @override
  Map<String, Object?> toGraph(DemoTask row) => demoTaskToGraph(row);

  @override
  Future<ListResult<DemoTask>> list(ListQuery query) =>
      repository.listTasks(query);

  @override
  Future<DemoTask?> get(String id) => repository.getTask(id);

  @override
  Future<DemoTask> create(Map<String, Object?> data) =>
      repository.createTask(data);

  @override
  Future<DemoTask> update(String id, Map<String, Object?> patch) =>
      repository.updateTask(id, patch);

  @override
  Future<void> delete(String id) => repository.deleteTask(id);

  @override
  Stream<ChangeEvent<DemoTask>> changes() => repository.taskChanges;
}

final class DemoProjectTransport extends EntityTransport<DemoProject> {
  const DemoProjectTransport(this.repository);

  final DemoRepository repository;

  @override
  bool get authoritative => true;

  @override
  Duration? get staleTime => const Duration(seconds: 30);

  @override
  String identify(DemoProject row) => row.id;

  @override
  Map<String, Object?> toGraph(DemoProject row) => demoProjectToGraph(row);

  @override
  Future<ListResult<DemoProject>> list(ListQuery query) =>
      repository.listProjects(query);

  @override
  Future<DemoProject?> get(String id) => repository.getProject(id);

  @override
  StreamSubscription<ChangeEvent<DemoProject>> subscribe(
    void Function(ChangeEvent<DemoProject> event) onChange,
  ) => repository.projectChanges.listen(onChange);
}

final class DemoUserTransport extends EntityTransport<DemoUser> {
  const DemoUserTransport(this.repository);

  final DemoRepository repository;

  @override
  bool get authoritative => true;

  @override
  Duration? get staleTime => const Duration(seconds: 30);

  @override
  String identify(DemoUser row) => row.id;

  @override
  Map<String, Object?> toGraph(DemoUser row) => demoUserToGraph(row);

  @override
  Future<ListResult<DemoUser>> list(ListQuery query) =>
      repository.listUsers(query);

  @override
  Future<DemoUser?> get(String id) => repository.getUser(id);

  @override
  StreamSubscription<ChangeEvent<DemoUser>> subscribe(
    void Function(ChangeEvent<DemoUser> event) onChange,
  ) => repository.userChanges.listen(onChange);
}
