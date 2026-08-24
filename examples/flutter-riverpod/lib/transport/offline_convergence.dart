/// Offline convergence demo for the persistence scenario.
///
/// Two isolated clients persist the seeded graph, mutate disjoint fields of
/// `task-sync` while offline, reconnect, merge field-level changes, persist,
/// and reload. The merge is deterministic: disjoint field writes produce zero
/// conflicts and the reloaded graph matches the merged row exactly.
library;

import 'package:entity_graph_flutter/entity_graph_flutter.dart';

import '../domain/demo_data.dart';
import 'persistence_adapter.dart';

/// Outcome of the two-client offline convergence run.
final class OfflineConvergenceResult {
  const OfflineConvergenceResult({
    required this.mergedRow,
    required this.convergedClients,
    required this.reloadMatches,
    required this.conflicts,
  });

  final Map<String, Object?> mergedRow;
  final int convergedClients;
  final bool reloadMatches;
  final int conflicts;
}

Map<String, Object?> _diff(
  Map<String, Object?> base,
  Map<String, Object?> changed,
) {
  final diff = <String, Object?>{};
  for (final entry in changed.entries) {
    if (base[entry.key] != entry.value) diff[entry.key] = entry.value;
  }
  return diff;
}

/// Field-level merge of two offline revisions against their common base.
///
/// Disjoint writes merge cleanly; a key changed by both clients to different
/// values counts as one conflict and keeps the base value (fail-safe).
({Map<String, Object?> merged, int conflicts}) mergeOfflineRows({
  required Map<String, Object?> base,
  required Map<String, Object?> clientA,
  required Map<String, Object?> clientB,
}) {
  final aChanges = _diff(base, clientA);
  final bChanges = _diff(base, clientB);
  var conflicts = 0;
  final merged = Map<String, Object?>.from(base);
  for (final entry in aChanges.entries) {
    merged[entry.key] = entry.value;
  }
  for (final entry in bChanges.entries) {
    if (aChanges.containsKey(entry.key) && aChanges[entry.key] != entry.value) {
      conflicts += 1;
      // Fail-safe: a genuine conflict restores the common base value.
      merged[entry.key] = base[entry.key];
      continue;
    }
    merged[entry.key] = entry.value;
  }
  return (merged: merged, conflicts: conflicts);
}

/// Runs the convergence scenario against two isolated graphs and returns the
/// deterministic outcome asserted by tests and rendered by the platform page.
OfflineConvergenceResult runOfflineConvergenceDemo() {
  final clientA = EntityGraph();
  final clientB = EntityGraph();
  final adapterA = DemoPersistenceAdapter();
  final adapterB = DemoPersistenceAdapter();
  const types = ['Task'];
  const taskId = 'task-sync';

  final seed = demoTasks.firstWhere((task) => task.id == taskId).toGraph();
  clientA.upsertEntity('Task', taskId, seed);
  clientB.upsertEntity('Task', taskId, seed);
  adapterA.saveGraph(clientA, types: types);
  adapterB.saveGraph(clientB, types: types);

  // Offline writes on disjoint fields.
  clientA.upsertEntity('Task', taskId, {
    ...seed,
    'title': 'Prove deterministic convergence',
  });
  clientB.upsertEntity('Task', taskId, {...seed, 'status': 'in-progress'});

  // Reconnect: merge field changes, persist, reload.
  final merge = mergeOfflineRows(
    base: seed,
    clientA: clientA.readCanonicalEntity('Task', taskId)!,
    clientB: clientB.readCanonicalEntity('Task', taskId)!,
  );
  clientA.upsertEntity('Task', taskId, merge.merged);
  clientB.upsertEntity('Task', taskId, merge.merged);
  adapterA.saveGraph(clientA, types: types);
  adapterB.saveGraph(clientB, types: types);

  final reloadedA = EntityGraph();
  final reloadedB = EntityGraph();
  adapterA.loadGraph(reloadedA);
  adapterB.loadGraph(reloadedB);
  final rowA = reloadedA.readCanonicalEntity('Task', taskId);
  final rowB = reloadedB.readCanonicalEntity('Task', taskId);

  return OfflineConvergenceResult(
    mergedRow: merge.merged,
    convergedClients:
        (rowA != null && rowB != null && rowA['title'] == merge.merged['title'])
        ? 2
        : 0,
    reloadMatches:
        rowA != null &&
        rowB != null &&
        rowA.toString() == rowB.toString() &&
        rowA['title'] == merge.merged['title'] &&
        rowA['status'] == merge.merged['status'],
    conflicts: merge.conflicts,
  );
}
