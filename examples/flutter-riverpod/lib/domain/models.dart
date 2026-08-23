/// Demo domain models mirroring `examples/shared/scenario-contract.json` and
/// `examples/agentic-a2ui/src/lib/demo-data.ts`, so scenario expectations stay
/// verifiable across every showcase.
library;

/// Project entity mirrored from the shared scenario seed.
final class DemoProject {
  const DemoProject({
    required this.id,
    required this.tenantId,
    required this.name,
    required this.status,
  });

  final String id;
  final String tenantId;
  final String name;
  final String status;

  static DemoProject fromGraph(Map<String, Object?> row) => DemoProject(
    id: row['id']! as String,
    tenantId: row['tenantId']! as String,
    name: row['name']! as String,
    status: row['status']! as String,
  );

  Map<String, Object?> toGraph() => {
    'id': id,
    'tenantId': tenantId,
    'name': name,
    'status': status,
  };

  /// Canonical static tear-off for provider family keys. A lambda literal
  /// would create a new closure per build and fork the provider family.
  static Map<String, Object?> encode(DemoProject row) => row.toGraph();
}

/// Task entity mirrored from the shared scenario seed.
final class DemoTask {
  const DemoTask({
    required this.id,
    required this.tenantId,
    required this.projectId,
    required this.title,
    required this.status,
    required this.version,
  });

  final String id;
  final String tenantId;
  final String projectId;
  final String title;
  final String status;
  final int version;

  static DemoTask fromGraph(Map<String, Object?> row) => DemoTask(
    id: row['id']! as String,
    tenantId: row['tenantId']! as String,
    projectId: row['projectId']! as String,
    title: row['title']! as String,
    status: row['status']! as String,
    version: row['version']! as int,
  );

  Map<String, Object?> toGraph() => {
    'id': id,
    'tenantId': tenantId,
    'projectId': projectId,
    'title': title,
    'status': status,
    'version': version,
  };

  /// Canonical static tear-off for provider family keys. A lambda literal
  /// would create a new closure per build and fork the provider family.
  static Map<String, Object?> encode(DemoTask row) => row.toGraph();
}

/// Comment entity mirrored from the shared scenario seed.
final class DemoComment {
  const DemoComment({
    required this.id,
    required this.tenantId,
    required this.taskId,
    required this.body,
  });

  final String id;
  final String tenantId;
  final String taskId;
  final String body;

  static DemoComment fromGraph(Map<String, Object?> row) => DemoComment(
    id: row['id']! as String,
    tenantId: row['tenantId']! as String,
    taskId: row['taskId']! as String,
    body: row['body']! as String,
  );

  Map<String, Object?> toGraph() => {
    'id': id,
    'tenantId': tenantId,
    'taskId': taskId,
    'body': body,
  };

  /// Canonical static tear-off for provider family keys. A lambda literal
  /// would create a new closure per build and fork the provider family.
  static Map<String, Object?> encode(DemoComment row) => row.toGraph();
}
