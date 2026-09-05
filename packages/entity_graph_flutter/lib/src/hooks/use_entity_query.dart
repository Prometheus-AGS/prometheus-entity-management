/// Stateful list querying — filter, sort, search and pagination held in hook
/// state and applied to a normalized list.
///
/// Mirrors the React binding's `useEntityQuery`, which layers a live view
/// descriptor and toolbar setters over the plain list read. [useEntityList] is
/// the equivalent of the plain read; this adds the mutable query.
///
/// ```dart
/// class TaskBoard extends HookConsumerWidget {
///   const TaskBoard({super.key});
///
///   @override
///   Widget build(BuildContext context, WidgetRef ref) {
///     final q = useEntityQuery<Task>(
///       ref,
///       type: 'Task',
///       queryKey: 'tasks:board',
///       fromGraph: Task.fromGraph,
///     );
///     return Column(children: [
///       TextField(onChanged: q.setSearch),
///       Expanded(
///         child: q.snapshot.when(
///           data: (s) => TaskListView(items: s.items),
///           loading: () => const CircularProgressIndicator(),
///           error: (e, _) => Text('$e'),
///         ),
///       ),
///     ]);
///   }
/// }
/// ```
library;

import 'package:flutter/foundation.dart';
import 'package:flutter_hooks/flutter_hooks.dart';
import 'package:hooks_riverpod/hooks_riverpod.dart';

import '../providers.dart';
import '../transport.dart';
import '../view.dart';

/// What [useEntityQuery] returns: the current snapshot plus the setters that
/// change the query driving it.
class EntityQueryResult<T extends Object> {
  const EntityQueryResult({
    required this.snapshot,
    required this.query,
    required this.setSearch,
    required this.setSort,
    required this.setFilter,
    required this.setLimit,
    required this.setCursor,
    required this.reset,
  });

  /// The list read under the current [query].
  final AsyncValue<EntityListSnapshot<T>> snapshot;

  /// The query currently applied.
  final ListQuery query;

  /// Replace the free-text search term. Passing null clears it.
  final void Function(String? search) setSearch;

  /// Replace the sort clauses.
  final void Function(List<SortClause>? sort) setSort;

  /// Replace the filter clauses.
  final void Function(List<FilterClause>? filter) setFilter;

  /// Replace the page size.
  final void Function(int? limit) setLimit;

  /// Advance or rewind pagination.
  final void Function(String? cursor) setCursor;

  /// Return to [initialQuery].
  final VoidCallback reset;
}

/// Watches a normalized list under a query this hook owns and mutates.
///
/// Every setter replaces the whole [ListQuery] rather than mutating one, so the
/// value handed to the provider family is a new instance and the family re-keys
/// exactly when the query changes — not on every render, and not never.
///
/// Changing the search term or the filter clears [ListQuery.cursor]: a cursor
/// is a position within one result set, and carrying it across a query change
/// pages into a set that no longer exists. Changing sort clears it for the same
/// reason. [setLimit] does not, since the cursor stays valid under a page-size
/// change.
EntityQueryResult<T> useEntityQuery<T extends Object>(
  WidgetRef ref, {
  required String type,
  required String queryKey,
  required EntityDecoder<T> fromGraph,
  EntityEncoder<T>? toGraph,
  ListQuery initialQuery = const ListQuery(),
  ViewCompleteness completeness = ViewCompleteness.remote,
  bool enabled = true,
  bool subscribe = true,
}) {
  final queryState = useState<ListQuery>(initialQuery);
  final query = queryState.value;

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

  final snapshot = ref.watch(provider);

  return EntityQueryResult<T>(
    snapshot: snapshot,
    query: query,
    setSearch: (search) => queryState.value = ListQuery(
      filter: query.filter,
      sort: query.sort,
      search: search,
      limit: query.limit,
      // cursor deliberately dropped — see doc comment
    ),
    setSort: (sort) => queryState.value = ListQuery(
      filter: query.filter,
      sort: sort,
      search: query.search,
      limit: query.limit,
    ),
    setFilter: (filter) => queryState.value = ListQuery(
      filter: filter,
      sort: query.sort,
      search: query.search,
      limit: query.limit,
    ),
    setLimit: (limit) => queryState.value = query.copyWith(limit: limit),
    setCursor: (cursor) => queryState.value = query.copyWith(cursor: cursor),
    reset: () => queryState.value = initialQuery,
  );
}
