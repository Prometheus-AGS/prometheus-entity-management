const demoTenantId = 'tenant-prometheus-demo';
const demoTaskType = 'Task';
const demoProjectType = 'Project';
const demoUserType = 'User';
const demoTaskListKey = 'tasks:todo';

final class DemoTask {
  const DemoTask({
    required this.id,
    required this.tenantId,
    required this.projectId,
    required this.assigneeId,
    required this.title,
    required this.status,
    required this.priority,
    required this.version,
    required this.updatedAt,
    this.pendingSync = false,
  });

  final String id;
  final String tenantId;
  final String projectId;
  final String assigneeId;
  final String title;
  final String status;
  final String priority;
  final int version;
  final String updatedAt;
  final bool pendingSync;

  DemoTask copyWith({
    String? id,
    String? tenantId,
    String? projectId,
    String? assigneeId,
    String? title,
    String? status,
    String? priority,
    int? version,
    String? updatedAt,
    bool? pendingSync,
  }) => DemoTask(
    id: id ?? this.id,
    tenantId: tenantId ?? this.tenantId,
    projectId: projectId ?? this.projectId,
    assigneeId: assigneeId ?? this.assigneeId,
    title: title ?? this.title,
    status: status ?? this.status,
    priority: priority ?? this.priority,
    version: version ?? this.version,
    updatedAt: updatedAt ?? this.updatedAt,
    pendingSync: pendingSync ?? this.pendingSync,
  );
}

final class DemoProject {
  const DemoProject({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.status,
    required this.ownerId,
  });

  final String id;
  final String tenantId;
  final String name;
  final String status;
  final String ownerId;
}

final class DemoUser {
  const DemoUser({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.role,
  });

  final String id;
  final String tenantId;
  final String name;
  final String role;
}

DemoTask demoTaskFromGraph(Map<String, Object?> row) => DemoTask(
  id: row['id']! as String,
  tenantId: row['tenantId']! as String,
  projectId: row['projectId']! as String,
  assigneeId: row['assigneeId']! as String,
  title: row['title']! as String,
  status: row['status']! as String,
  priority: row['priority']! as String,
  version: row['version']! as int,
  updatedAt: row['updatedAt']! as String,
  pendingSync: (row['pendingSync'] as bool?) ?? false,
);

Map<String, Object?> demoTaskToGraph(DemoTask task) => {
  'id': task.id,
  'tenantId': task.tenantId,
  'projectId': task.projectId,
  'assigneeId': task.assigneeId,
  'title': task.title,
  'status': task.status,
  'priority': task.priority,
  'version': task.version,
  'updatedAt': task.updatedAt,
  'pendingSync': task.pendingSync,
};

DemoProject demoProjectFromGraph(Map<String, Object?> row) => DemoProject(
  id: row['id']! as String,
  tenantId: row['tenantId']! as String,
  name: row['name']! as String,
  status: row['status']! as String,
  ownerId: row['ownerId']! as String,
);

Map<String, Object?> demoProjectToGraph(DemoProject project) => {
  'id': project.id,
  'tenantId': project.tenantId,
  'name': project.name,
  'status': project.status,
  'ownerId': project.ownerId,
};

DemoUser demoUserFromGraph(Map<String, Object?> row) => DemoUser(
  id: row['id']! as String,
  tenantId: row['tenantId']! as String,
  name: row['name']! as String,
  role: row['role']! as String,
);

Map<String, Object?> demoUserToGraph(DemoUser user) => {
  'id': user.id,
  'tenantId': user.tenantId,
  'name': user.name,
  'role': user.role,
};
