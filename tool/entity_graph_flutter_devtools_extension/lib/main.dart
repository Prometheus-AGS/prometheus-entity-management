import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:devtools_extensions/devtools_extensions.dart';
import 'package:flutter/material.dart';

const _listStoresMethod = 'ext.entity_graph_flutter.devtoolsV1.listStores';
const _commandMethod = 'ext.entity_graph_flutter.devtoolsV1.command';

final class _DevtoolsCommandException implements Exception {
  const _DevtoolsCommandException(this.code, this.message);

  final String code;
  final String message;

  @override
  String toString() => message;
}

const _protocol = 'prometheus.entity-graph.devtools';

void main() => runApp(const EntityGraphDevToolsExtension());

class EntityGraphDevToolsExtension extends StatelessWidget {
  const EntityGraphDevToolsExtension({super.key});

  @override
  Widget build(BuildContext context) {
    return DevToolsExtension(
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          colorScheme: ColorScheme.fromSeed(
            seedColor: const Color(0xff408cff),
            brightness: Brightness.dark,
          ),
          scaffoldBackgroundColor: const Color(0xff07111f),
          useMaterial3: true,
        ),
        home: const InspectorPage(),
      ),
    );
  }
}

enum _ConnectionState { loading, ready, disconnected, incompatible, error }

class InspectorPage extends StatefulWidget {
  const InspectorPage({super.key});

  @override
  State<InspectorPage> createState() => _InspectorPageState();
}

class _InspectorPageState extends State<InspectorPage> {
  _ConnectionState connection = _ConnectionState.loading;
  String? error;
  List<Map<String, Object?>> stores = const [];
  String? storeId;
  int section = 0;
  Map<String, Object?> snapshot = const {};
  List<Object?> entities = const [];
  List<Object?> views = const [];
  List<Object?> relationships = const [];
  List<Object?> events = const [];
  final previewIds = <({String storeId, String type, String id}), String>{};
  final controllerIds = <String, String>{};
  final expiredSnapshotCursors = <String>{};
  String? actionError;
  bool actionBusy = false;
  late final String _requestPrefix =
      '${DateTime.now().microsecondsSinceEpoch}-${Random.secure().nextInt(1 << 32)}';
  int _requestSequence = 0;
  int _refreshGeneration = 0;

  @override
  void initState() {
    super.initState();
    unawaited(_refresh());
  }

  Future<Map<String, Object?>> _call(
    String method, [
    Map<String, String>? args,
  ]) async {
    await serviceManager.onServiceAvailable;
    final response = await serviceManager.callServiceExtensionOnMainIsolate(
      method,
      args: args,
    );
    final value = response.json;
    if (value == null) {
      throw StateError('The VM service returned no JSON payload');
    }
    return value.cast<String, Object?>();
  }

  Future<Map<String, Object?>> _commandFor(
    String selected,
    String command, [
    Object? payload,
    String? controllerIdOverride,
  ]) async {
    final controllerId = controllerIdOverride ?? controllerIds[selected];
    if (controllerId == null) {
      throw StateError('The selected store generation is no longer active.');
    }
    final requestId = 'flutter-devtools-$_requestPrefix-${_requestSequence++}';
    final envelope = <String, Object?>{
      'protocol': _protocol,
      'version': 1,
      'storeId': selected,
      'controllerId': controllerId,
      'requestId': requestId,
      'command': command,
      'payload': ?payload,
    };
    final response = await _call(_commandMethod, {
      'command': jsonEncode(envelope),
    });
    if (response['protocol'] != _protocol ||
        response['version'] != 1 ||
        response['storeId'] != selected) {
      throw StateError(
        'The VM service returned a mismatched response envelope',
      );
    }
    if (response['requestId'] != requestId) {
      throw StateError('The VM service returned a mismatched request ID');
    }
    if (response['ok'] != true) {
      final failure = response['error'];
      throw _DevtoolsCommandException(
        failure is Map ? '${failure['code']}' : 'unknown',
        failure is Map ? '${failure['message']}' : 'DevTools command failed',
      );
    }
    final result = response['result'];
    return result is Map ? result.cast<String, Object?>() : {'items': result};
  }

  Future<void> _refresh() async {
    final generation = ++_refreshGeneration;
    if (mounted) {
      setState(() {
        connection = _ConnectionState.loading;
        error = null;
      });
    }
    try {
      final registry = await _call(_listStoresMethod);
      final listed = (registry['stores'] as List? ?? const [])
          .whereType<Map>()
          .map((entry) => entry.cast<String, Object?>())
          .toList(growable: false);
      if (listed.isEmpty) {
        if (mounted && generation == _refreshGeneration) {
          setState(() {
            stores = listed;
            storeId = null;
            previewIds.clear();
            controllerIds.clear();
            connection = _ConnectionState.disconnected;
          });
        }
        return;
      }
      final currentStoreId = storeId;
      final selected =
          currentStoreId != null &&
              listed.any((entry) => entry['storeId'] == currentStoreId)
          ? currentStoreId
          : listed.first['storeId'];
      if (selected is! String) {
        throw StateError('The VM service returned an invalid store registry');
      }
      final nextControllerIds = <String, String>{};
      for (final entry in listed) {
        final listedStoreId = entry['storeId'];
        final listedControllerId = entry['controllerId'];
        if (listedStoreId is! String || listedControllerId is! String) {
          throw StateError('The VM service returned an invalid store registry');
        }
        nextControllerIds[listedStoreId] = listedControllerId;
      }
      final controllerChanged =
          controllerIds[selected] != null &&
          controllerIds[selected] != nextControllerIds[selected];
      final selectedControllerId = nextControllerIds[selected]!;
      final capabilities = await _commandFor(
        selected,
        'get-capabilities',
        null,
        selectedControllerId,
      );
      if (capabilities['protocolVersion'] != 1) {
        if (mounted && generation == _refreshGeneration) {
          setState(() {
            controllerIds
              ..clear()
              ..addAll(nextControllerIds);
            if (controllerChanged) {
              previewIds.removeWhere((key, _) => key.storeId == selected);
              expiredSnapshotCursors.clear();
            }
            stores = listed;
            storeId = selected;
            connection = _ConnectionState.incompatible;
          });
        }
        return;
      }
      final results = await Future.wait([
        _commandFor(selected, 'get-snapshot', null, selectedControllerId),
        _commandFor(selected, 'get-entity-records', null, selectedControllerId),
        _commandFor(selected, 'get-views', null, selectedControllerId),
        _commandFor(selected, 'get-relationships', null, selectedControllerId),
        _commandFor(selected, 'get-history', null, selectedControllerId),
      ]);
      if (!mounted || generation != _refreshGeneration) return;
      setState(() {
        controllerIds
          ..clear()
          ..addAll(nextControllerIds);
        if (controllerChanged) {
          previewIds.removeWhere((key, _) => key.storeId == selected);
          expiredSnapshotCursors.clear();
        }
        stores = listed;
        storeId = selected;
        snapshot = results[0];
        previewIds.removeWhere((key, _) => key.storeId == selected);
        for (final preview
            in results[0]['activePreviews'] as List? ?? const []) {
          if (preview is! Map) continue;
          final previewId = preview['previewId'];
          final entity = preview['entity'];
          final type = entity is Map ? entity['type'] : null;
          final id = entity is Map ? entity['id'] : null;
          if (previewId is String && type is String && id is String) {
            previewIds[_previewKey(selected, type, id)] = previewId;
          }
        }
        entities = (results[1]['entityRecords'] as List?) ?? const [];
        views = (results[2]['views'] as List?) ?? const [];
        relationships = (results[3]['relationships'] as List?) ?? const [];
        events = (results[4]['items'] as List?) ?? const [];
        connection = _ConnectionState.ready;
      });
    } catch (caught) {
      if (mounted && generation == _refreshGeneration) {
        setState(() {
          connection = _ConnectionState.error;
          error = '$caught';
        });
      }
    }
  }

  Future<void> _previewEntity(Map<Object?, Object?> entity) async {
    final type = entity['type'];
    final id = entity['id'];
    if (type is! String || id is! String) return;
    final controller = TextEditingController(text: '{}');
    String? dialogError;
    final patch = await showDialog<Map<String, Object?>>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: Text('Preview $type:$id'),
          content: TextField(
            controller: controller,
            autofocus: true,
            maxLines: 8,
            decoration: InputDecoration(
              labelText: 'Local JSON patch',
              helperText: 'Preview only; this does not commit to a server.',
              errorText: dialogError,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                try {
                  final decoded = jsonDecode(controller.text);
                  if (decoded is! Map) {
                    throw const FormatException('Patch must be a JSON object');
                  }
                  if (decoded.isEmpty) {
                    throw const FormatException('Patch must not be empty');
                  }
                  Navigator.pop(context, decoded.cast<String, Object?>());
                } on FormatException catch (caught) {
                  setDialogState(() => dialogError = caught.message);
                }
              },
              child: const Text('Apply preview'),
            ),
          ],
        ),
      ),
    );
    controller.dispose();
    if (patch == null) return;
    final selected = storeId;
    if (selected == null) return;
    await _runAction(() async {
      late final Map<String, Object?> receipt;
      try {
        receipt = await _commandFor(selected, 'preview-entity-patch', {
          'type': type,
          'id': id,
          'patch': patch,
        });
      } on _DevtoolsCommandException catch (error) {
        await _reconcileControllerError(error);
        if (error.code == 'preview-already-active') {
          await _refresh();
          throw StateError('This entity already has an active preview.');
        }
        if (error.code == 'time-travel-active') {
          throw StateError('Return to live before applying a preview.');
        }
        rethrow;
      }
      final previewId = receipt['previewId'];
      if (previewId is String) {
        previewIds[_previewKey(selected, type, id)] = previewId;
      }
      await _refresh();
    });
  }

  ({String storeId, String type, String id}) _previewKey(
    String selectedStoreId,
    String type,
    String id,
  ) => (storeId: selectedStoreId, type: type, id: id);

  int? _snapshotCursor(Object? event) {
    final payload = event is Map ? event['payload'] : null;
    final snapshot = payload is Map ? payload['snapshot'] : null;
    if (snapshot is! Map || snapshot['status'] != 'retained') return null;
    final cursor = snapshot['cursor'];
    if (cursor is! int) return null;
    final selected = storeId;
    final controllerId = selected == null ? null : controllerIds[selected];
    if (controllerId == null ||
        expiredSnapshotCursors.contains('$controllerId:$cursor')) {
      return null;
    }
    return cursor;
  }

  Future<void> _runAction(Future<void> Function() action) async {
    if (actionBusy) return;
    setState(() {
      actionBusy = true;
      actionError = null;
    });
    try {
      await action();
    } catch (caught) {
      if (mounted) setState(() => actionError = '$caught');
    } finally {
      if (mounted) setState(() => actionBusy = false);
    }
  }

  Future<void> _reconcileControllerError(
    _DevtoolsCommandException error,
  ) async {
    if (error.code == 'stale-controller' || error.code == 'wrong-store') {
      await _refresh();
    }
  }

  Future<void> _restoreEntity(Map<Object?, Object?> entity) async {
    final selected = storeId;
    final type = entity['type'];
    final id = entity['id'];
    if (selected == null || type is! String || id is! String) return;
    final key = _previewKey(selected, type, id);
    final previewId = previewIds[key];
    if (previewId == null) return;
    await _runAction(() async {
      late final Map<String, Object?> result;
      try {
        result = await _commandFor(selected, 'restore-entity-preview', {
          'previewId': previewId,
        });
      } on _DevtoolsCommandException catch (error) {
        await _reconcileControllerError(error);
        if (error.code == 'preview-not-found') {
          previewIds.remove(key);
          await _refresh();
        }
        throw StateError(
          error.code == 'preview-not-found'
              ? 'That preview is no longer active.'
              : error.message,
        );
      }
      if (result['status'] == 'restored') {
        previewIds.remove(key);
        await _refresh();
      } else {
        if (result['status'] == 'conflict') {
          previewIds.remove(key);
          await _refresh();
        }
        throw StateError(
          result['status'] == 'conflict'
              ? 'Preview was not restored because the entity changed after the preview.'
              : 'Preview restore did not complete.',
        );
      }
    });
  }

  Future<void> _rewind(Object? event) async {
    final selected = storeId;
    final cursor = _snapshotCursor(event);
    if (selected == null || cursor == null) return;
    await _runAction(() async {
      late final Map<String, Object?> result;
      try {
        result = await _commandFor(selected, 'rewind', {'cursor': cursor});
      } on _DevtoolsCommandException catch (error) {
        await _reconcileControllerError(error);
        if (error.code == 'snapshot-not-found') {
          final controllerId = controllerIds[selected];
          if (controllerId != null) {
            expiredSnapshotCursors.add('$controllerId:$cursor');
          }
          await _refresh();
        }
        throw StateError(switch (error.code) {
          'snapshot-not-found' =>
            'That snapshot is no longer retained and cannot be rewound.',
          'preview-already-active' =>
            'Restore active previews before rewinding.',
          _ => error.message,
        });
      }
      if (result['status'] != 'rewound') {
        if (result['status'] == 'expired-history') {
          final controllerId = controllerIds[selected];
          if (controllerId != null) {
            expiredSnapshotCursors.add('$controllerId:$cursor');
          }
          await _refresh();
        }
        throw StateError(
          result['status'] == 'expired-history'
              ? 'That snapshot is no longer retained and cannot be rewound.'
              : 'Rewind did not complete.',
        );
      }
      await _refresh();
    });
  }

  bool get _isRewound {
    final snapshots = snapshot['snapshots'];
    return snapshots is Map && snapshots['mode'] == 'rewound';
  }

  bool get _selectedStoreHasPreviews {
    final selected = storeId;
    return selected != null &&
        previewIds.keys.any((key) => key.storeId == selected);
  }

  Future<void> _returnLive() {
    final selected = storeId;
    if (selected == null) return Future.value();
    return _runAction(() async {
      late final Map<String, Object?> result;
      try {
        result = await _commandFor(selected, 'return-to-live');
      } on _DevtoolsCommandException catch (error) {
        await _reconcileControllerError(error);
        throw StateError(
          error.code == 'not-rewound'
              ? 'The graph is already live.'
              : error.code == 'restore-failed'
              ? 'Return to live failed; the graph is still rewound.'
              : error.message,
        );
      }
      if (result['status'] != 'live') {
        throw StateError('Return to live did not complete.');
      }
      await _refresh();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Entity Graph'),
        actions: [
          if (connection == _ConnectionState.ready)
            TextButton.icon(
              onPressed: actionBusy || !_isRewound ? null : _returnLive,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Live'),
            ),
          if (actionBusy)
            const Padding(
              padding: EdgeInsets.all(14),
              child: SizedBox.square(
                dimension: 18,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          IconButton(
            onPressed: actionBusy || connection == _ConnectionState.loading
                ? null
                : _refresh,
            tooltip: 'Refresh graph',
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: switch (connection) {
        _ConnectionState.loading => const _Status(
          icon: Icons.sync,
          title: 'Connecting',
          message: 'Reading the active isolate…',
        ),
        _ConnectionState.disconnected => const _Status(
          icon: Icons.link_off,
          title: 'No active graph',
          message:
              'Run a debug app that attaches EntityGraphDevtoolsController.',
        ),
        _ConnectionState.incompatible => const _Status(
          icon: Icons.warning_amber,
          title: 'Incompatible protocol',
          message:
              'The app and extension must use entity-graph DevTools protocol v1.',
        ),
        _ConnectionState.error => _Status(
          icon: Icons.error_outline,
          title: 'Connection failed',
          message: error ?? 'Unknown VM-service error',
        ),
        _ConnectionState.ready => _readyBody(),
      },
    );
  }

  Widget _readyBody() {
    final destinations = const [
      NavigationDestination(
        icon: Icon(Icons.dashboard_outlined),
        label: 'Overview',
      ),
      NavigationDestination(
        icon: Icon(Icons.account_tree_outlined),
        label: 'Entities',
      ),
      NavigationDestination(
        icon: Icon(Icons.view_quilt_outlined),
        label: 'Views',
      ),
      NavigationDestination(
        icon: Icon(Icons.timeline_outlined),
        label: 'Activity',
      ),
    ];
    final content = switch (section) {
      0 => _Overview(
        snapshot: snapshot,
        stores: stores,
        storeId: storeId!,
        onStore: actionBusy
            ? null
            : (value) {
                setState(() => storeId = value);
                unawaited(_refresh());
              },
      ),
      1 => _RecordList(
        title: 'Entities',
        records: entities,
        actions: (record) {
          if (record is! Map) return const [];
          final type = record['type'];
          final id = record['id'];
          if (type is! String || id is! String) return const [];
          final key = _previewKey(storeId!, type, id);
          final hasPreview = previewIds.containsKey(key);
          return [
            TextButton.icon(
              onPressed: actionBusy || hasPreview
                  ? null
                  : () => _previewEntity(record),
              icon: const Icon(Icons.edit_outlined),
              label: const Text('Preview'),
            ),
            if (hasPreview)
              TextButton.icon(
                onPressed: actionBusy ? null : () => _restoreEntity(record),
                icon: const Icon(Icons.restore),
                label: const Text('Restore'),
              ),
          ];
        },
      ),
      2 => _RecordList(
        title: 'Views and relationships',
        records: [...views, ...relationships],
      ),
      _ => _RecordList(
        title: 'Entity activity',
        records: events.reversed.toList(),
        actions: (record) => _snapshotCursor(record) == null
            ? const []
            : [
                Tooltip(
                  message: _selectedStoreHasPreviews
                      ? 'Restore active previews before rewinding.'
                      : 'Rewind to this retained snapshot.',
                  child: TextButton.icon(
                    onPressed: actionBusy || _selectedStoreHasPreviews
                        ? null
                        : () => _rewind(record),
                    icon: const Icon(Icons.history),
                    label: const Text('Rewind'),
                  ),
                ),
              ],
      ),
    };
    final resolvedContent = Column(
      children: [
        if (actionError != null)
          MaterialBanner(
            content: Text(actionError!),
            actions: [
              TextButton(
                onPressed: () => setState(() => actionError = null),
                child: const Text('Dismiss'),
              ),
            ],
          ),
        Expanded(child: content),
      ],
    );
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 720) {
          return Column(
            children: [
              Expanded(child: resolvedContent),
              NavigationBar(
                selectedIndex: section,
                onDestinationSelected: (value) =>
                    setState(() => section = value),
                destinations: destinations,
              ),
            ],
          );
        }
        return Row(
          children: [
            NavigationRail(
              selectedIndex: section,
              onDestinationSelected: (value) => setState(() => section = value),
              labelType: NavigationRailLabelType.all,
              destinations: destinations
                  .map(
                    (item) => NavigationRailDestination(
                      icon: item.icon,
                      label: Text(item.label),
                    ),
                  )
                  .toList(),
            ),
            const VerticalDivider(width: 1),
            Expanded(child: resolvedContent),
          ],
        );
      },
    );
  }
}

class _Status extends StatelessWidget {
  const _Status({
    required this.icon,
    required this.title,
    required this.message,
  });
  final IconData icon;
  final String title;
  final String message;
  @override
  Widget build(BuildContext context) => Center(
    child: Semantics(
      liveRegion: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 44),
              const SizedBox(height: 16),
              Text(title, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(message, textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    ),
  );
}

class _Overview extends StatelessWidget {
  const _Overview({
    required this.snapshot,
    required this.stores,
    required this.storeId,
    required this.onStore,
  });
  final Map<String, Object?> snapshot;
  final List<Map<String, Object?>> stores;
  final String storeId;
  final ValueChanged<String>? onStore;
  @override
  Widget build(BuildContext context) {
    final counts =
        (snapshot['counts'] as Map?)?.cast<String, Object?>() ?? const {};
    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        DropdownButtonFormField<String>(
          initialValue: storeId,
          decoration: const InputDecoration(labelText: 'Graph store'),
          items: stores
              .map(
                (store) => DropdownMenuItem(
                  value: store['storeId'] as String,
                  child: Text(store['storeId'] as String),
                ),
              )
              .toList(),
          onChanged: onStore == null
              ? null
              : (value) {
                  if (value != null) onStore!(value);
                },
        ),
        const SizedBox(height: 24),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: counts.entries
              .map(
                (entry) => Card(
                  child: SizedBox(
                    width: 150,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${entry.value}',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          Text(entry.key),
                        ],
                      ),
                    ),
                  ),
                ),
              )
              .toList(),
        ),
      ],
    );
  }
}

class _RecordList extends StatelessWidget {
  const _RecordList({required this.title, required this.records, this.actions});
  final String title;
  final List<Object?> records;
  final List<Widget> Function(Object? record)? actions;
  @override
  Widget build(BuildContext context) => ListView.builder(
    padding: const EdgeInsets.all(20),
    itemCount: records.length + 1,
    itemBuilder: (context, index) {
      if (index == 0) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Text(
            '$title · ${records.length}',
            style: Theme.of(context).textTheme.titleLarge,
          ),
        );
      }
      final record = records[index - 1];
      final map = record is Map ? record : {'value': record};
      final label =
          map['key'] ??
          map['viewId'] ??
          map['eventId'] ??
          map['type'] ??
          'Record $index';
      return Card(
        child: ExpansionTile(
          title: Text('$label'),
          subtitle: map['dirty'] == true
              ? const Text(
                  'Dirty · uncommitted',
                  style: TextStyle(color: Colors.amber),
                )
              : null,
          children: [
            if (actions != null)
              Align(
                alignment: Alignment.centerRight,
                child: Wrap(children: actions!(record)),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: SelectableText(
                const JsonEncoder.withIndent('  ').convert(record),
              ),
            ),
          ],
        ),
      );
    },
  );
}
