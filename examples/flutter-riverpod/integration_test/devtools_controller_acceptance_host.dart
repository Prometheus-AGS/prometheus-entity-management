import 'dart:convert';
import 'dart:developer' as developer;

import 'package:entity_graph_flutter/devtools.dart';
import 'package:entity_graph_flutter/entity_graph_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _acceptanceStepMethod = 'ext.entity_graph_flutter.acceptanceV1.step';
const _storeA = 'flutter-acceptance-a';
const _storeB = 'flutter-acceptance-b';
const _taskType = 'AcceptanceTask';
const _projectType = 'AcceptanceProject';
const _taskListKey = 'acceptance:tasks';
const _secretSentinel = 'PEM_DEVTOOLS_SECRET_SENTINEL';

late final EntityGraph _graphA;
late final EntityGraph _graphB;
late final EntityGraphDevtoolsBinding _bindingA;
late final EntityGraphDevtoolsBinding _bindingB;
EntityGraphDevtoolsBinding? _replacementBindingA;
EntityGraph? _graphC;
EntityGraphDevtoolsBinding? _bindingC;
var _disposalMutationsRejected = false;
var _directPreviewRewindRejected = false;
var _duplicateStoreRejected = false;
String? _nestedPreviewId;
var _nestedPreviewRestored = false;

Map<String, Object?> _decodeEntity(Map<String, Object?> row) =>
    Map.unmodifiable(row);

final _acceptanceListProvider = entityListProvider<Map<String, Object?>>(
  type: _taskType,
  queryKey: _taskListKey,
  fromGraph: _decodeEntity,
  completeness: ViewCompleteness.local,
  subscribe: false,
);

final _acceptanceDetailProvider = entityProvider<Map<String, Object?>>(
  type: _taskType,
  id: 'task-1',
  fromGraph: _decodeEntity,
  enabled: false,
  subscribe: false,
);

Object? _redactAcceptanceValue(
  Object? value,
  EntityGraphDevtoolsValueContext context,
) {
  if (value is Map) {
    return {
      for (final entry in value.entries)
        if (entry.key != 'secret')
          '${entry.key}': _redactAcceptanceValue(entry.value, context),
    };
  }
  if (value is Iterable) {
    return value
        .map((item) => _redactAcceptanceValue(item, context))
        .toList(growable: false);
  }
  return value == _secretSentinel ? '[redacted]' : value;
}

EntityGraphIR _acceptanceSchema() => parseSdl({
  'version': '1.0',
  'entities': {
    _projectType: {
      'fields': {
        'id': {'type': 'string', 'primary': true},
        'name': {'type': 'string', 'required': true},
      },
    },
    _taskType: {
      'fields': {
        'id': {'type': 'string', 'primary': true},
        'name': {'type': 'string', 'required': true},
        'status': {'type': 'string'},
        'projectId': {'type': 'string'},
        'secret': {'type': 'string'},
      },
      'relations': {
        'project': {
          'type': 'belongsTo',
          'target': _projectType,
          'foreignKey': 'projectId',
        },
      },
    },
  },
});

void _seedGraphs() {
  _graphA.upsertEntity(_projectType, 'project-1', {
    'id': 'project-1',
    'name': 'Acceptance Project',
  });
  _graphA.upsertEntities(_taskType, [
    (
      id: 'task-1',
      data: {
        'id': 'task-1',
        'name': 'Original task',
        'status': 'todo',
        'projectId': 'project-1',
        'secret': _secretSentinel,
      },
    ),
    (
      id: 'task-2',
      data: {
        'id': 'task-2',
        'name': 'Error task',
        'status': 'blocked',
        'projectId': 'missing-project',
        'secret': _secretSentinel,
      },
    ),
  ]);
  _graphA.setListResult(
    _taskListKey,
    const ['task-1', 'task-2'],
    entityType: _taskType,
    total: 2,
  );
  _graphA.patchEntity(_taskType, 'task-1', const {'status': 'in-progress'});
  _graphA.markEntityOptimistic(_taskType, 'task-1');
  _graphA.setEntityError(_taskType, 'task-2', 'acceptance error');

  _graphB.upsertEntity(_taskType, 'isolated-task', {
    'id': 'isolated-task',
    'name': 'Store B only',
    'secret': _secretSentinel,
  });
}

Map<String, Object?> _runAcceptanceStep(String step) {
  switch (step) {
    case 'seed':
      _seedGraphs();
      break;
    case 'update':
      _graphA.upsertEntity(_taskType, 'task-1', {
        'name': 'Updated through graph publication',
      });
      break;
    case 'preview-conflict':
      _graphA.patchEntity(_taskType, 'task-1', const {'status': 'conflict'});
      break;
    case 'preview-aba':
      _graphA.patchEntity(_taskType, 'task-1', const {'status': 'aba-away'});
      _graphA.patchEntity(_taskType, 'task-1', const {'status': 'preview'});
      break;
    case 'direct-rewind-while-preview':
      _directPreviewRewindRejected = _bindingA.controller!.rewind(1) == null;
      break;
    case 'direct-nested-preview':
      final nested = <String, Object?>{'value': 'original'};
      final input = <String, Object?>{
        'nested': nested,
        'labels': <String>{'alpha', 'beta'},
      };
      _nestedPreviewId = _bindingA.controller!
          .previewEntityPatch(_taskType, 'task-1', input)
          ?.previewId;
      nested['value'] = 'mutated-outside-graph';
      break;
    case 'restore-direct-nested-preview':
      final previewId = _nestedPreviewId;
      if (previewId != null) {
        _nestedPreviewRestored =
            _bindingA.controller!.restoreEntityPreview(previewId)
                is EntityGraphDevtoolsPreviewRestoredReceipt;
      }
      break;
    case 'duplicate-store-id':
      final duplicateGraph = EntityGraph();
      try {
        EntityGraphDevtoolsBinding.attach(duplicateGraph, storeId: _storeA);
      } on StateError {
        _duplicateStoreRejected =
            EntityGraphDevtoolsBinding.controllerFor(duplicateGraph) == null;
      }
      break;
    case 'oversized-event':
      _graphA.upsertEntity(_taskType, 'oversized-task', {
        'id': 'oversized-task',
        'name': 'Oversized event task',
        'payload': List.filled(300 * 1024, 'z').join(),
      });
      break;
    case 'mutate-after-rewind':
      _graphA.upsertEntity(_taskType, 'task-1', {
        'name': 'Mutation after rewind',
      });
      break;
    case 'dispose-store-b':
      _bindingB.detach();
      break;
    case 'dispose-store-a':
      _bindingA.detach();
      break;
    case 'mutate-after-reattach':
      _graphA.upsertEntity(_taskType, 'task-1', {
        'name': 'Observed only by replacement controller',
      });
      break;
    case 'dispose-store-a-replacement':
      _replacementBindingA?.detach();
      _replacementBindingA = null;
      break;
    case 'mutate-after-final-detach':
      _graphA.upsertEntity(_taskType, 'task-1', {
        'name': 'No controller observes this mutation',
      });
      break;
    case 'attach-new-graph-store-a':
      final graph = EntityGraph()
        ..upsertEntity(_taskType, 'task-1', {
          'id': 'task-1',
          'name': 'Different graph generation',
          'status': 'fresh',
        });
      _graphC = graph;
      _bindingC = EntityGraphDevtoolsBinding.attach(
        graph,
        storeId: _storeA,
        valuePolicy: const EntityGraphDevtoolsValuePolicy.include(),
      );
      break;
    case 'dispose-new-graph-store-a':
      _bindingC?.detach();
      _bindingC = null;
      break;
    default:
      throw ArgumentError.value(step, 'step', 'Unknown acceptance step');
  }
  return {
    'step': step,
    'storeAActive': EntityGraphDevtoolsBinding.controllerFor(_graphA) != null,
    'storeBActive': EntityGraphDevtoolsBinding.controllerFor(_graphB) != null,
    'disposalMutationsRejected': _disposalMutationsRejected,
    'directPreviewRewindRejected': _directPreviewRewindRejected,
    'duplicateStoreRejected': _duplicateStoreRejected,
    'nestedPreviewId': _nestedPreviewId,
    'nestedPreviewRestored': _nestedPreviewRestored,
    'nestedGraphValue':
        (_graphA.readEntityPatch(_taskType, 'task-1')?['nested']
            as Map?)?['value'],
    'storeCActive':
        _graphC != null &&
        EntityGraphDevtoolsBinding.controllerFor(_graphC!) != null,
  };
}

Future<developer.ServiceExtensionResponse> _handleAcceptanceStep(
  String method,
  Map<String, String> parameters,
) async {
  final step = parameters['step'];
  if (method == _acceptanceStepMethod &&
      !parameters.keys.any((key) => key != 'step' && key != 'isolateId') &&
      step != null &&
      step.isNotEmpty) {
    try {
      return developer.ServiceExtensionResponse.result(
        jsonEncode(_runAcceptanceStep(step)),
      );
    } on Object catch (error) {
      return developer.ServiceExtensionResponse.error(
        developer.ServiceExtensionResponse.invalidParams,
        jsonEncode({'message': '$error'}),
      );
    }
  }
  return developer.ServiceExtensionResponse.error(
    developer.ServiceExtensionResponse.invalidParams,
    jsonEncode({'message': 'Exactly one acceptance step is required'}),
  );
}

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  _graphA = EntityGraph();
  _graphB = EntityGraph();
  _bindingA = EntityGraphDevtoolsBinding.attach(
    _graphA,
    storeId: _storeA,
    schema: _acceptanceSchema(),
    valuePolicy: EntityGraphDevtoolsValuePolicy.include(
      redact: _redactAcceptanceValue,
    ),
    historyLimit: 64,
    snapshotLimit: 32,
    snapshotBytesLimit: 64 * 1024,
  );
  _bindingB = EntityGraphDevtoolsBinding.attach(_graphB, storeId: _storeB);
  _bindingA.controller!.subscribeLifecycle((event) {
    if (event.state != EntityGraphDevtoolsLifecycleState.disposed) return;
    final disposingController = _bindingA.controller!;
    final importResult = disposingController.inspectHistoryImport(const {});
    final confirmResult = disposingController.confirmHistoryImport(
      'candidate-during-disposal',
      1,
    );
    final cancelResult = disposingController.cancelHistoryImport(
      'candidate-during-disposal',
    );
    _disposalMutationsRejected =
        disposingController.previewEntityPatch(_taskType, 'task-1', const {
              'status': 'during-disposal',
            }) ==
            null &&
        disposingController.rewind(1) == null &&
        disposingController.returnToLive() == null &&
        disposingController.restoreEntityPreview('missing-preview') == null &&
        importResult is EntityGraphDevtoolsHistoryImportRejectedReceipt &&
        importResult.reason ==
            EntityGraphDevtoolsHistoryImportInspectionRejectionReason
                .disposed &&
        confirmResult
            is EntityGraphDevtoolsHistoryImportRestoreRejectedReceipt &&
        confirmResult.reason ==
            EntityGraphDevtoolsHistoryImportRestoreRejectionReason.disposed &&
        cancelResult
            is EntityGraphDevtoolsHistoryImportCancellationRejectedReceipt &&
        cancelResult.reason ==
            EntityGraphDevtoolsHistoryImportCancellationRejectionReason
                .disposed;
    _replacementBindingA = EntityGraphDevtoolsBinding.attach(
      _graphA,
      storeId: _storeA,
      schema: _acceptanceSchema(),
      valuePolicy: EntityGraphDevtoolsValuePolicy.include(
        redact: _redactAcceptanceValue,
      ),
      historyLimit: 64,
      snapshotLimit: 32,
      snapshotBytesLimit: 64 * 1024,
    );
    throw StateError('acceptance lifecycle callback failure');
  });
  _bindingA.controller!.subscribe((event) {
    if (event is EntityGraphDevtoolsLifecycleEvent &&
        event.state == EntityGraphDevtoolsLifecycleState.disposed) {
      throw StateError('acceptance event callback failure');
    }
  });
  developer.registerExtension(_acceptanceStepMethod, _handleAcceptanceStep);

  runApp(
    ProviderScope(
      overrides: [entityGraphProvider.overrideWithValue(_graphA)],
      child: const _AcceptanceApp(),
    ),
  );
}

final class _AcceptanceApp extends ConsumerWidget {
  const _AcceptanceApp();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list = ref.watch(_acceptanceListProvider);
    final detail = ref.watch(_acceptanceDetailProvider);
    return MaterialApp(
      title: 'Prometheus Flutter DevTools acceptance',
      home: Scaffold(
        body: SafeArea(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Prometheus Flutter DevTools acceptance host'),
              Text(
                'List: ${list.value?.items.map((row) => row['name']).join(', ') ?? 'loading'}',
              ),
              Text('Detail: ${detail.value?.entity?['name'] ?? 'loading'}'),
            ],
          ),
        ),
      ),
    );
  }
}
