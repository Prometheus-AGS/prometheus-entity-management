/// Platform boundary page: persistence adapter, offline convergence, and the
/// optional Rust FFI transport seam. Native/platform concerns stay behind
/// declared adapter commands; the application-owned graph remains canonical.
library;

import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/demo_data.dart';
import '../transport/offline_convergence.dart';
import '../transport/persistence_adapter.dart';

/// Demonstrates the adapter boundary scenario: `loadGraph`/`saveGraph` are
/// the only host commands; `deleteAll` is denied fail-closed.
class PlatformPage extends ConsumerStatefulWidget {
  const PlatformPage({super.key});

  @override
  ConsumerState<PlatformPage> createState() => _PlatformPageState();
}

class _PlatformPageState extends ConsumerState<PlatformPage> {
  final _adapter = DemoPersistenceAdapter();
  String _adapterStatus = 'adapter idle';
  OfflineConvergenceResult? _convergence;

  @override
  Widget build(BuildContext context) {
    final graph = ref.watch(entityGraphProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Platform boundary')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Persistence adapter',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            children: [
              FilledButton.tonal(
                key: const Key('adapter-save'),
                onPressed: () {
                  final snapshot = _adapter.saveGraph(
                    graph,
                    types: const ['Project', 'Task', 'Comment'],
                    listTypes: const {
                      DemoListKeys.projectTasks: 'Task',
                      DemoListKeys.activeProjects: 'Project',
                    },
                  );
                  setState(
                    () => _adapterStatus =
                        'saveGraph persisted ${(snapshot['entities'] as Map).length} types',
                  );
                },
                child: const Text('saveGraph'),
              ),
              FilledButton.tonal(
                key: const Key('adapter-load'),
                onPressed: () {
                  final loaded = _adapter.loadGraph(graph);
                  setState(
                    () =>
                        _adapterStatus = 'loadGraph restored $loaded entities',
                  );
                },
                child: const Text('loadGraph'),
              ),
              FilledButton.tonal(
                key: const Key('adapter-delete-all'),
                onPressed: () {
                  try {
                    _adapter.execute('deleteAll');
                  } on AdapterDeniedError catch (error) {
                    setState(() => _adapterStatus = error.toString());
                  }
                },
                child: const Text('deleteAll (denied)'),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(_adapterStatus, key: const Key('adapter-status')),
          const Divider(height: 32),
          Text(
            'Offline convergence',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          FilledButton.tonal(
            key: const Key('run-convergence'),
            onPressed: () =>
                setState(() => _convergence = runOfflineConvergenceDemo()),
            child: const Text('Run two-client convergence'),
          ),
          if (_convergence != null)
            Text(
              'clients=${_convergence!.convergedClients} '
              'conflicts=${_convergence!.conflicts} '
              'reloadMatches=${_convergence!.reloadMatches} '
              'title=${_convergence!.mergedRow['title']}',
              key: const Key('convergence-result'),
            ),
          const Divider(height: 32),
          Text(
            'Rust transport seam (optional)',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          const Text(
            'The optional FfiEntityTransportAdapter wraps a native bridge as '
            'one more transport. No native bridge is linked in this example, '
            'so the demo transport serves Task/Project/Comment and the '
            'application-owned graph stays canonical either way.',
            key: Key('ffi-seam-note'),
          ),
        ],
      ),
    );
  }
}
