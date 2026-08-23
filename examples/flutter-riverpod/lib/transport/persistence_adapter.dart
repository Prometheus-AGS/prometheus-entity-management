/// Adapter-boundary persistence demo.
///
/// The host (browser/desktop/mobile) may only persist and restore the graph
/// through the declared `loadGraph`/`saveGraph` commands. Every other command
/// — including the intentionally tempting `deleteAll` — is denied fail-closed,
/// and the application-owned [EntityGraph] remains the single canonical owner.
library;

import 'package:entity_graph_flutter/entity_graph_flutter.dart';

/// Raised when a host invokes a command outside the declared allowlist.
final class AdapterDeniedError implements Exception {
  const AdapterDeniedError(this.command);

  final String command;

  @override
  String toString() =>
      'AdapterDeniedError: command "$command" is not in the adapter allowlist';
}

/// In-memory host adapter demonstrating the platform boundary scenario.
class DemoPersistenceAdapter {
  DemoPersistenceAdapter({Map<String, Object?>? storage})
    : _storage = storage ?? <String, Object?>{};

  /// The only commands a host may ever invoke.
  static const allowedCommands = <String>{'loadGraph', 'saveGraph'};

  static const _snapshotKey = 'graph-snapshot';

  final Map<String, Object?> _storage;

  bool isAllowed(String command) => allowedCommands.contains(command);

  /// Serializes canonical entity rows and list membership for [types].
  ///
  /// Patches are UI-local and intentionally excluded; only canonical,
  /// server-confirmed data crosses the boundary.
  Map<String, Object?> saveGraph(
    EntityGraph graph, {
    required List<String> types,
    Map<String, String> listTypes = const {},
  }) {
    final entities = <String, Object?>{};
    for (final type in types) {
      final rows = <String, Object?>{};
      for (final id in graph.entityIds(type)) {
        final row = graph.readCanonicalEntity(type, id);
        if (row != null) rows[id] = row;
      }
      entities[type] = rows;
    }
    final lists = <String, Object?>{};
    for (final entry in listTypes.entries) {
      lists[entry.key] = {
        'entityType': entry.value,
        'ids': graph.listState(entry.key).ids,
      };
    }
    final snapshot = <String, Object?>{'entities': entities, 'lists': lists};
    _storage[_snapshotKey] = snapshot;
    return snapshot;
  }

  /// Restores a snapshot into [graph]. Returns the number of entities loaded.
  int loadGraph(EntityGraph graph) {
    final snapshot = _storage[_snapshotKey];
    if (snapshot is! Map<String, Object?>) return 0;
    var loaded = 0;
    final entities = snapshot['entities'];
    if (entities is Map<String, Object?>) {
      for (final typeEntry in entities.entries) {
        final rows = typeEntry.value;
        if (rows is! Map<String, Object?>) continue;
        for (final rowEntry in rows.entries) {
          final row = rowEntry.value;
          if (row is! Map<String, Object?>) continue;
          graph.upsertEntity(typeEntry.key, rowEntry.key, row);
          loaded += 1;
        }
      }
    }
    final lists = snapshot['lists'];
    if (lists is Map<String, Object?>) {
      for (final listEntry in lists.entries) {
        final spec = listEntry.value;
        if (spec is! Map<String, Object?>) continue;
        final ids = spec['ids'];
        final entityType = spec['entityType'];
        if (ids is List && entityType is String) {
          graph.setListResult(
            listEntry.key,
            ids.cast<String>(),
            entityType: entityType,
            total: ids.length,
          );
        }
      }
    }
    return loaded;
  }

  /// Fail-closed command gate. Unknown or destructive commands throw
  /// [AdapterDeniedError] before touching storage or the graph.
  void execute(String command) {
    if (!isAllowed(command)) throw AdapterDeniedError(command);
  }
}
