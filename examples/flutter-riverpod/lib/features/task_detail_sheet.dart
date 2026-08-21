/// Task detail sheet with isolated edit buffer and optimistic CRUD.
///
/// Edits stay in the `entityCrudProvider` edit buffer until saved; other
/// views keep showing canonical data. `save()` applies the optimistic patch
/// and the transport either confirms it or the graph rolls back exactly.
library;

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/models.dart';

/// Modal editor for one task.
class TaskDetailSheet extends ConsumerStatefulWidget {
  const TaskDetailSheet({required this.taskId, super.key});

  final String taskId;

  @override
  ConsumerState<TaskDetailSheet> createState() => _TaskDetailSheetState();
}

class _TaskDetailSheetState extends ConsumerState<TaskDetailSheet> {
  EntityCrud<DemoTask> get _crud => ref.read(
    entityCrudProvider<DemoTask>(
      type: 'Task',
      id: widget.taskId,
      toGraph: DemoTask.encode,
    ).notifier,
  );

  @override
  Widget build(BuildContext context) {
    final buffer = ref.watch(
      entityCrudProvider<DemoTask>(
        type: 'Task',
        id: widget.taskId,
        toGraph: DemoTask.encode,
      ),
    );
    final title = buffer.value('title') as String? ?? '';
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Edit task', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 12),
          TextFormField(
            key: const Key('task-title-field'),
            initialValue: title,
            decoration: const InputDecoration(labelText: 'Title'),
            onChanged: (value) => _crud.edit('title', value),
          ),
          if (buffer.hasError) ...[
            const SizedBox(height: 8),
            Text(
              'Save failed and rolled back: ${buffer.error?.message}',
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              FilledButton(
                key: const Key('task-save-button'),
                onPressed: buffer.isDirty && !buffer.isSaving
                    ? () async {
                        try {
                          await _crud.save();
                        } on Object {
                          // Rollback is graph-owned; the error is rendered
                          // from the edit buffer above.
                        }
                      }
                    : null,
                child: Text(buffer.isSaving ? 'Saving…' : 'Save'),
              ),
              const SizedBox(width: 8),
              TextButton(
                onPressed: buffer.isDirty ? _crud.revert : null,
                child: const Text('Revert'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
