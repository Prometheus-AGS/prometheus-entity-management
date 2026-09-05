/// Hook access to a normalized entity list.
///
/// Mirrors the React binding's `useEntityList`. [entityListProvider] remains
/// the canonical API.
///
/// The list holds **ordered identifiers only**; every entry re-joins the
/// canonical record from the graph at read time. That is why one write updates
/// a list row and a detail panel together — they were never separate copies.
///
/// ```dart
/// class TaskList extends HookConsumerWidget {
///   const TaskList({super.key});
///
///   @override
///   Widget build(BuildContext context, WidgetRef ref) {
///     final tasks = useEntityList<Task>(
///       ref,
///       type: 'Task',
///       queryKey: 'tasks:open',
///       fromGraph: Task.fromGraph,
///     );
///     return tasks.when(
///       data: (snap) => ListView(children: [
///         for (final t in snap.items) TaskTile(id: t.id),
///       ]),
///       loading: () => const CircularProgressIndicator(),
///       error: (e, _) => Text('$e'),
///     );
///   }
/// }
/// ```
library;

import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../providers.dart';
import '../transport.dart';
import '../view.dart';

/// Watches a normalized list identified by `type + queryKey`.
///
/// [completeness] selects the view lane — local, remote, or hybrid. It defaults
/// to [ViewCompleteness.remote], matching [EntityListConfig].
///
/// [query] participates in the memo key by identity, not by value: pass a
/// `const ListQuery(...)` or hold it in state. A `ListQuery` rebuilt inline on
/// every render would re-key the family on every render.
AsyncValue<EntityListSnapshot<T>> useEntityList<T extends Object>(
  WidgetRef ref, {
  required String type,
  required String queryKey,
  required EntityDecoder<T> fromGraph,
  EntityEncoder<T>? toGraph,
  ListQuery query = const ListQuery(),
  ViewCompleteness completeness = ViewCompleteness.remote,
  bool enabled = true,
  bool subscribe = true,
}) {
  final provider = useMemoized(
    () => entityListProvider<T>(
      type: type,
      queryKey: queryKey,
      fromGraph: fromGraph,
      toGraph: toGraph,
      query: query,
      completeness: completeness,
      enabled: enabled,
      subscribe: subscribe,
    ),
    [type, queryKey, query, completeness, enabled, subscribe],
  );

  return ref.watch(provider);
}
