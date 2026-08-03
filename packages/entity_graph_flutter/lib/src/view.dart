/// Transport-neutral local view evaluation for entity lists.
///
/// Remote mode forwards [ListQuery] to a transport. Local mode evaluates the
/// same query against the canonical graph. Hybrid mode renders the local
/// result first and revalidates through the transport in the background.
library;

import 'graph.dart';
import 'transport.dart';

/// Declares whether a view is complete locally, remotely, or through both.
enum ViewCompleteness { local, remote, hybrid }

/// Evaluate [query] against canonical entities and return ordered IDs only.
///
/// Keeping IDs as the result preserves normalization: callers join them back
/// against [EntityGraph] at read time instead of caching entity copies.
List<String> evaluateLocalEntityIds(
  EntityGraph graph,
  String type,
  ListQuery query,
) {
  final entries = graph
      .entityIds(type)
      .map((id) => (id: id, row: graph.readEntity(type, id)))
      .where((entry) => entry.row != null)
      .map((entry) => (id: entry.id, row: entry.row!))
      .where((entry) => _matchesQuery(entry.row, query))
      .toList();

  final sorts = query.sort;
  if (sorts != null && sorts.isNotEmpty) {
    entries.sort((left, right) {
      for (final sort in sorts) {
        final compared = _compareValues(
          left.row[sort.field],
          right.row[sort.field],
        );
        if (compared != 0) {
          return sort.direction == SortDirection.asc ? compared : -compared;
        }
      }
      return left.id.compareTo(right.id);
    });
  }

  final limit = query.limit;
  final ids = entries.map((entry) => entry.id);
  return List.unmodifiable(limit == null ? ids : ids.take(limit));
}

bool _matchesQuery(Map<String, Object?> row, ListQuery query) {
  final filters = query.filter;
  if (filters != null && !filters.every((filter) => _matches(row, filter))) {
    return false;
  }

  final search = query.search?.trim().toLowerCase();
  if (search == null || search.isEmpty) return true;
  return row.values
      .whereType<Object>()
      .map((value) => value.toString().toLowerCase())
      .any((value) => value.contains(search));
}

bool _matches(Map<String, Object?> row, FilterClause filter) {
  final actual = row[filter.field];
  final expected = filter.value;
  return switch (filter.op) {
    FilterOperator.eq => actual == expected,
    FilterOperator.neq => actual != expected,
    FilterOperator.gt => _compareValues(actual, expected) > 0,
    FilterOperator.gte => _compareValues(actual, expected) >= 0,
    FilterOperator.lt => _compareValues(actual, expected) < 0,
    FilterOperator.lte => _compareValues(actual, expected) <= 0,
    FilterOperator.contains =>
      actual?.toString().toLowerCase().contains(
            expected?.toString().toLowerCase() ?? '',
          ) ??
          false,
    FilterOperator.startsWith =>
      actual?.toString().toLowerCase().startsWith(
            expected?.toString().toLowerCase() ?? '',
          ) ??
          false,
    FilterOperator.endsWith =>
      actual?.toString().toLowerCase().endsWith(
            expected?.toString().toLowerCase() ?? '',
          ) ??
          false,
    FilterOperator.isNull => actual == null,
    FilterOperator.isNotNull => actual != null,
    FilterOperator.inList =>
      expected is Iterable<Object?> && expected.contains(actual),
    FilterOperator.nin =>
      expected is! Iterable<Object?> || !expected.contains(actual),
  };
}

int _compareValues(Object? left, Object? right) {
  if (identical(left, right)) return 0;
  if (left == null) return -1;
  if (right == null) return 1;
  if (left is num && right is num) return left.compareTo(right);
  if (left is DateTime && right is DateTime) return left.compareTo(right);
  if (left is Comparable<Object> && left.runtimeType == right.runtimeType) {
    return left.compareTo(right);
  }
  return left.toString().compareTo(right.toString());
}
