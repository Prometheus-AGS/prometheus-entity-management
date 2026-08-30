part of 'controller.dart';

EntityGraphDevtoolsErrorResult _commandError(
  String storeId,
  String requestId,
  EntityGraphDevtoolsProtocolErrorCode code,
  String message,
) => EntityGraphDevtoolsErrorResult(
  storeId: storeId,
  requestId: requestId,
  error: EntityGraphDevtoolsProtocolError(code: code, message: message),
);

bool _hasOnlyKeys(Map<String, Object?> value, Set<String> allowed) =>
    value.keys.every(allowed.contains);

bool _isJsonCompatible(Object? value, [Set<Object>? ancestors]) {
  if (value == null || value is String || value is bool || value is int) {
    return true;
  }
  if (value is double) return value.isFinite;
  if (value is! Map && value is! List) return false;
  final seen = ancestors ?? <Object>{};
  if (!seen.add(value)) return false;
  final valid = switch (value) {
    Map() =>
      value.keys.every((key) => key is String) &&
          value.values.every((item) => _isJsonCompatible(item, seen)),
    List() => value.every((item) => _isJsonCompatible(item, seen)),
    _ => false,
  };
  seen.remove(value);
  return valid;
}

Object? _commandResultJson(Object? value) => switch (value) {
  null || String() || bool() || num() => value,
  EntityGraphDevtoolsEnvelope() => value.toJson(),
  EntityGraphDevtoolsCapabilities() => value.toJson(),
  EntityGraphDevtoolsHistoryStatus() => value.toJson(),
  EntityGraphDevtoolsSnapshotHistoryStatus() => value.toJson(),
  EntityGraphDevtoolsPreviewAppliedReceipt() => value.toJson(),
  EntityGraphDevtoolsPreviewRestoreReceipt() => value.toJson(),
  EntityGraphDevtoolsRewindResult() => value.toJson(),
  EntityGraphDevtoolsReturnToLiveReceipt() => value.toJson(),
  EntityGraphDevtoolsHistoryImportInspectionResult() => value.toJson(),
  EntityGraphDevtoolsHistoryImportCancellationResult() => value.toJson(),
  EntityGraphDevtoolsHistoryImportRestoreResult() => value.toJson(),
  List() => value.map(_commandResultJson).toList(growable: false),
  Map() => {
    for (final entry in value.entries)
      '${entry.key}': _commandResultJson(entry.value),
  },
  _ => throw StateError(
    'Unsupported DevTools command result ${value.runtimeType}',
  ),
};

EntityGraphDevtoolsSuccessResult _commandSuccess(
  EntityGraphDevtoolsController controller,
  String requestId,
  Object? result,
) => EntityGraphDevtoolsSuccessResult(
  storeId: controller.storeId,
  requestId: requestId,
  result: _commandResultJson(result),
);

Map<String, Object?>? _exactPayload(Object? payload, Set<String> keys) {
  final value = _stringMap(payload);
  return value != null && _hasOnlyKeys(value, keys) ? value : null;
}

EntityGraphDevtoolsResult _handleCommand(
  EntityGraphDevtoolsController controller,
  Object? command,
) {
  final raw = command is EntityGraphDevtoolsCommand
      ? command.toJson()
      : command;
  final envelope = _stringMap(raw);
  final requestId = envelope?['requestId'] is String
      ? envelope!['requestId']! as String
      : 'invalid';
  if (controller.isDisposed) {
    return _commandError(
      controller.storeId,
      requestId,
      EntityGraphDevtoolsProtocolErrorCode.disposed,
      'DevTools controller is disposed',
    );
  }
  const envelopeKeys = {
    'protocol',
    'version',
    'storeId',
    'controllerId',
    'requestId',
    'command',
    'payload',
  };
  if (envelope == null ||
      !_hasOnlyKeys(envelope, envelopeKeys) ||
      envelope['protocol'] is! String ||
      envelope['version'] is! int ||
      envelope['storeId'] is! String ||
      envelope['controllerId'] is! String ||
      envelope['requestId'] is! String ||
      envelope['command'] is! String ||
      (envelope['storeId']! as String).isEmpty ||
      (envelope['controllerId']! as String).isEmpty ||
      (envelope['requestId']! as String).isEmpty ||
      (envelope['command']! as String).isEmpty) {
    return _commandError(
      controller.storeId,
      requestId,
      EntityGraphDevtoolsProtocolErrorCode.invalidEnvelope,
      'Invalid DevTools command envelope',
    );
  }
  if (envelope['protocol'] != entityGraphDevtoolsProtocol) {
    return _commandError(
      controller.storeId,
      requestId,
      EntityGraphDevtoolsProtocolErrorCode.invalidEnvelope,
      'Unsupported DevTools protocol ${envelope['protocol']}',
    );
  }
  if (envelope['version'] != entityGraphDevtoolsProtocolVersion) {
    return _commandError(
      controller.storeId,
      requestId,
      EntityGraphDevtoolsProtocolErrorCode.unsupportedVersion,
      'Unsupported DevTools protocol version ${envelope['version']}',
    );
  }
  final requestedStoreId = envelope['storeId']! as String;
  if (requestedStoreId != controller.storeId) {
    return _commandError(
      controller.storeId,
      requestId,
      EntityGraphDevtoolsProtocolErrorCode.wrongStore,
      'Command targets $requestedStoreId, not ${controller.storeId}',
    );
  }
  final requestedControllerId = envelope['controllerId']! as String;
  if (requestedControllerId != controller.controllerId) {
    return _commandError(
      controller.storeId,
      requestId,
      EntityGraphDevtoolsProtocolErrorCode.staleController,
      'Command targets an inactive controller generation',
    );
  }
  final commandName = EntityGraphDevtoolsCommandName.values
      .where((candidate) => candidate.wireName == envelope['command'])
      .firstOrNull;
  if (commandName == null) {
    return _commandError(
      controller.storeId,
      requestId,
      EntityGraphDevtoolsProtocolErrorCode.unsupportedCommand,
      'Unsupported DevTools command ${envelope['command']}',
    );
  }
  final hasPayload = envelope.containsKey('payload');
  final payload = envelope['payload'];
  bool noPayload() => !hasPayload || payload == null;

  switch (commandName) {
    case EntityGraphDevtoolsCommandName.getCapabilities:
      if (!noPayload()) break;
      return _commandSuccess(controller, requestId, controller.capabilities);
    case EntityGraphDevtoolsCommandName.getSnapshot:
      if (!noPayload()) break;
      return _commandSuccess(controller, requestId, controller.getSnapshot());
    case EntityGraphDevtoolsCommandName.getHistory:
      if (!noPayload()) break;
      return _commandSuccess(controller, requestId, controller.getHistory());
    case EntityGraphDevtoolsCommandName.getHistoryStatus:
      if (!noPayload()) break;
      return _commandSuccess(
        controller,
        requestId,
        controller.getHistoryStatus(),
      );
    case EntityGraphDevtoolsCommandName.getEntityRecords:
      if (!noPayload()) break;
      return _commandSuccess(
        controller,
        requestId,
        controller.getEntityRecords(),
      );
    case EntityGraphDevtoolsCommandName.getViews:
      if (!noPayload()) break;
      return _commandSuccess(controller, requestId, controller.getViews());
    case EntityGraphDevtoolsCommandName.getRelationships:
      if (!noPayload()) break;
      return _commandSuccess(
        controller,
        requestId,
        controller.getRelationships(),
      );
    case EntityGraphDevtoolsCommandName.previewEntityPatch:
      final value = _exactPayload(payload, const {'type', 'id', 'patch'});
      final type = value?['type'];
      final id = value?['id'];
      final patch = _stringMap(value?['patch']);
      if (value == null ||
          type is! String ||
          type.isEmpty ||
          id is! String ||
          id.isEmpty ||
          patch == null ||
          patch.isEmpty ||
          !_isJsonCompatible(patch)) {
        break;
      }
      if (controller._historyMode == EntityGraphDevtoolsHistoryMode.rewound) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.timeTravelActive,
          'Return to live before applying an entity preview',
        );
      }
      if (controller._activePreviewByEntity.containsKey(
        _entityIdentityKey(type, id),
      )) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.previewAlreadyActive,
          'Entity $type:$id already has an active preview',
        );
      }
      final receipt = controller.previewEntityPatch(type, id, patch);
      if (receipt == null) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.entityNotFound,
          'Entity $type:$id was not found',
        );
      }
      return _commandSuccess(controller, requestId, receipt);
    case EntityGraphDevtoolsCommandName.restoreEntityPreview:
      final value = _exactPayload(payload, const {'previewId'});
      final previewId = value?['previewId'];
      if (value == null || previewId is! String || previewId.isEmpty) break;
      if (controller._historyMode == EntityGraphDevtoolsHistoryMode.rewound) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.timeTravelActive,
          'Return to live before restoring an entity preview',
        );
      }
      final receipt = controller.restoreEntityPreview(previewId);
      if (receipt == null) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.previewNotFound,
          'Preview $previewId was not found',
        );
      }
      return _commandSuccess(controller, requestId, receipt);
    case EntityGraphDevtoolsCommandName.getTimeTravelStatus:
      if (!noPayload()) break;
      if (!controller.timeTravelEnabled) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.timeTravelUnavailable,
          'Time travel is disabled for this controller',
        );
      }
      return _commandSuccess(
        controller,
        requestId,
        controller.getSnapshotHistoryStatus(),
      );
    case EntityGraphDevtoolsCommandName.rewind:
      final value = _exactPayload(payload, const {'cursor'});
      final cursor = value?['cursor'];
      if (value == null || cursor is! int || cursor <= 0) break;
      if (!controller.timeTravelEnabled) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.timeTravelUnavailable,
          'Time travel is disabled for this controller',
        );
      }
      if (controller._previewReceipts.isNotEmpty) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.previewAlreadyActive,
          'Restore active entity previews before entering time travel',
        );
      }
      final receipt = controller.rewind(cursor);
      if (receipt == null) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.restoreFailed,
          'Snapshot cursor $cursor could not be restored',
        );
      }
      return _commandSuccess(controller, requestId, receipt);
    case EntityGraphDevtoolsCommandName.returnToLive:
      if (!noPayload()) break;
      if (!controller.timeTravelEnabled) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.timeTravelUnavailable,
          'Time travel is disabled for this controller',
        );
      }
      if (controller._historyMode != EntityGraphDevtoolsHistoryMode.rewound) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.notRewound,
          'The graph is already live',
        );
      }
      final receipt = controller.returnToLive();
      if (receipt == null) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.restoreFailed,
          'Return to live failed; the graph remains rewound',
        );
      }
      return _commandSuccess(controller, requestId, receipt);
    case EntityGraphDevtoolsCommandName.inspectHistoryImport:
      final value = _exactPayload(payload, const {'candidate'});
      if (value == null || !value.containsKey('candidate')) break;
      if (!controller.timeTravelEnabled) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.timeTravelUnavailable,
          'Time travel is disabled for this controller',
        );
      }
      return _commandSuccess(
        controller,
        requestId,
        controller.inspectHistoryImport(value['candidate']),
      );
    case EntityGraphDevtoolsCommandName.cancelHistoryImport:
      final value = _exactPayload(payload, const {'candidateId'});
      final candidateId = value?['candidateId'];
      if (value == null || candidateId is! String || candidateId.isEmpty) {
        break;
      }
      return _commandSuccess(
        controller,
        requestId,
        controller.cancelHistoryImport(candidateId),
      );
    case EntityGraphDevtoolsCommandName.confirmHistoryImport:
      final value = _exactPayload(payload, const {
        'candidateId',
        'cursor',
        'confirm',
      });
      final candidateId = value?['candidateId'];
      final cursor = value?['cursor'];
      final confirm = value?['confirm'];
      if (value == null ||
          candidateId is! String ||
          candidateId.isEmpty ||
          cursor is! int ||
          cursor <= 0 ||
          confirm is! bool) {
        break;
      }
      if (!confirm) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.confirmationRequired,
          'History import restore requires confirm: true',
        );
      }
      if (!controller.timeTravelEnabled) {
        return _commandError(
          controller.storeId,
          requestId,
          EntityGraphDevtoolsProtocolErrorCode.timeTravelUnavailable,
          'Time travel is disabled for this controller',
        );
      }
      return _commandSuccess(
        controller,
        requestId,
        controller.confirmHistoryImport(candidateId, cursor),
      );
    case EntityGraphDevtoolsCommandName.clearHistory:
      if (!noPayload()) break;
      controller.clearHistory();
      return _commandSuccess(controller, requestId, const {'cleared': true});
  }
  return _commandError(
    controller.storeId,
    requestId,
    EntityGraphDevtoolsProtocolErrorCode.invalidPayload,
    'Invalid ${commandName.wireName} payload',
  );
}
