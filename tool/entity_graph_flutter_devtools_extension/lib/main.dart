import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:devtools_extensions/devtools_extensions.dart';
import 'package:flutter/material.dart';

const _listStoresMethod = 'ext.entity_graph_flutter.devtoolsV1.listStores';
const _commandMethod = 'ext.entity_graph_flutter.devtoolsV1.command';
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
  final previewIds = <String, String>{};
  late final String _requestPrefix =
      '${DateTime.now().microsecondsSinceEpoch}-${Random.secure().nextInt(1 << 32)}';
  int _requestSequence = 0;

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

  Future<Map<String, Object?>> _command(
    String command, [
    Object? payload,
  ]) async {
    final selected = storeId;
    if (selected == null) throw StateError('No graph store is selected');
    final requestId = 'flutter-devtools-$_requestPrefix-${_requestSequence++}';
    final envelope = <String, Object?>{
      'protocol': _protocol,
      'version': 1,
      'storeId': selected,
      'requestId': requestId,
      'command': command,
      'payload': ?payload,
    };
    final response = await _call(_commandMethod, {
      'command': jsonEncode(envelope),
    });
    if (response['requestId'] != requestId) {
      throw StateError('The VM service returned a mismatched request ID');
    }
    if (response['ok'] != true) {
      final failure = response['error'];
      throw StateError(
        failure is Map ? '${failure['message']}' : 'DevTools command failed',
      );
    }
    final result = response['result'];
    return result is Map ? result.cast<String, Object?>() : {'items': result};
  }

  Future<void> _refresh() async {
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
        if (mounted) {
          setState(() {
            stores = listed;
            connection = _ConnectionState.disconnected;
          });
        }
        return;
      }
      storeId = listed.any((entry) => entry['storeId'] == storeId)
          ? storeId
          : listed.first['storeId'] as String;
      final capabilities = await _command('get-capabilities');
      if (capabilities['protocolVersion'] != 1) {
        if (mounted) setState(() => connection = _ConnectionState.incompatible);
        return;
      }
      final results = await Future.wait([
        _command('get-snapshot'),
        _command('get-entity-records'),
        _command('get-views'),
        _command('get-relationships'),
        _command('get-history'),
      ]);
      if (!mounted) return;
      setState(() {
        stores = listed;
        snapshot = results[0];
        entities = (results[1]['entityRecords'] as List?) ?? const [];
        views = (results[2]['views'] as List?) ?? const [];
        relationships = (results[3]['relationships'] as List?) ?? const [];
        events = (results[4]['items'] as List?) ?? const [];
        connection = _ConnectionState.ready;
      });
    } catch (caught) {
      if (mounted) {
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
    final patch = await showDialog<Map<String, Object?>>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Preview $type:$id'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: 8,
          decoration: const InputDecoration(
            labelText: 'Local JSON patch',
            helperText: 'Preview only; this does not commit to a server.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              final decoded = jsonDecode(controller.text);
              if (decoded is! Map) {
                throw const FormatException('Patch must be a JSON object');
              }
              Navigator.pop(context, decoded.cast<String, Object?>());
            },
            child: const Text('Apply preview'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (patch == null) return;
    final receipt = await _command('preview-entity-patch', {
      'type': type,
      'id': id,
      'patch': patch,
    });
    final previewId = receipt['previewId'];
    if (previewId is String) previewIds['$type:$id'] = previewId;
    await _refresh();
  }

  Future<void> _restoreEntity(Map<Object?, Object?> entity) async {
    final key = '${entity['type']}:${entity['id']}';
    final previewId = previewIds[key];
    if (previewId == null) return;
    await _command('restore-entity-preview', {'previewId': previewId});
    previewIds.remove(key);
    await _refresh();
  }

  Future<void> _rewind(Object? event) async {
    final payload = event is Map ? event['payload'] : null;
    final snapshot = payload is Map ? payload['snapshot'] : null;
    final cursor = snapshot is Map ? snapshot['cursor'] : null;
    if (cursor is! int) return;
    await _command('rewind', {'cursor': cursor});
    await _refresh();
  }

  Future<void> _returnLive() async {
    await _command('return-to-live');
    await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Entity Graph'),
        actions: [
          if (connection == _ConnectionState.ready)
            TextButton.icon(
              onPressed: _returnLive,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Live'),
            ),
          IconButton(
            onPressed: _refresh,
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
        onStore: (value) {
          setState(() => storeId = value);
          unawaited(_refresh());
        },
      ),
      1 => _RecordList(
        title: 'Entities',
        records: entities,
        actions: (record) {
          if (record is! Map) return const [];
          final key = '${record['type']}:${record['id']}';
          return [
            TextButton.icon(
              onPressed: () => _previewEntity(record),
              icon: const Icon(Icons.edit_outlined),
              label: const Text('Preview'),
            ),
            if (previewIds.containsKey(key))
              TextButton.icon(
                onPressed: () => _restoreEntity(record),
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
        actions: (record) => [
          TextButton.icon(
            onPressed: () => _rewind(record),
            icon: const Icon(Icons.history),
            label: const Text('Rewind'),
          ),
        ],
      ),
    };
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 720) {
          return Column(
            children: [
              Expanded(child: content),
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
            Expanded(child: content),
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
  final ValueChanged<String> onStore;
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
          onChanged: (value) {
            if (value != null) onStore(value);
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
