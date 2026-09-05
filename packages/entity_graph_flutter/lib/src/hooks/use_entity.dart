/// Hook access to a single normalized entity.
///
/// Mirrors the React binding's `useEntity`. [entityProvider] remains the
/// canonical API — this is a thinner call shape for widgets that already use
/// hooks, not a second source of truth.
///
/// ```dart
/// class TaskTile extends HookConsumerWidget {
///   const TaskTile({super.key, required this.id});
///   final String id;
///
///   @override
///   Widget build(BuildContext context, WidgetRef ref) {
///     final task = useEntity<Task>(
///       ref,
///       type: 'Task',
///       id: id,
///       fromGraph: Task.fromGraph,
///     );
///     return task.when(
///       data: (snap) => Text(snap.entity?.title ?? '—'),
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

/// Watches one entity at `type + id`.
///
/// The provider family is keyed by its arguments, so [useMemoized] holds the
/// provider instance stable across rebuilds. Without it, a `fromGraph` closure
/// written inline at the call site would produce a new family key every render
/// — a subscription churn that is easy to write and hard to notice.
///
/// Set [subscribe] false for a one-shot read that ignores later graph changes.
/// Set [enabled] false to hold the read without unmounting the widget.
AsyncValue<EntitySnapshot<T>> useEntity<T extends Object>(
  WidgetRef ref, {
  required String type,
  required String? id,
  required EntityDecoder<T> fromGraph,
  EntityEncoder<T>? toGraph,
  bool enabled = true,
  bool subscribe = true,
}) {
  final provider = useMemoized(
    () => entityProvider<T>(
      type: type,
      id: id,
      fromGraph: fromGraph,
      toGraph: toGraph,
      enabled: enabled,
      subscribe: subscribe,
    ),
    [type, id, enabled, subscribe],
  );

  return ref.watch(provider);
}
