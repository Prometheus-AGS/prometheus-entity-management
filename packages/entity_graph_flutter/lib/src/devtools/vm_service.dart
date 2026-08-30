part of 'controller.dart';

const _vmServiceAvailable = !bool.fromEnvironment('dart.vm.product');
final _vmControllers = <String, EntityGraphDevtoolsController>{};
final _vmControllerSubscriptions =
    <EntityGraphDevtoolsController, void Function()>{};
var _vmServiceRegistered = false;

/// Isolate-wide, versioned VM-service surface used by Flutter DevTools.
abstract final class EntityGraphDevtoolsVmService {
  static const listStoresMethod =
      'ext.entity_graph_flutter.devtoolsV1.listStores';
  static const commandMethod = 'ext.entity_graph_flutter.devtoolsV1.command';
  static const eventKind = 'prometheus.entity-graph.devtools.v1';
  static const requestBytesLimit = 256 * 1024;
  static const responseBytesLimit = 8 * 1024 * 1024;

  /// VM service extensions are absent from product-mode isolates.
  static bool get isAvailable => _vmServiceAvailable;

  /// Whether this isolate has registered the package-owned RPC methods.
  static bool get isRegistered => _vmServiceRegistered;

  /// Active store identities advertised by [listStoresMethod].
  static List<String> get activeStoreIds {
    final storeIds = _vmControllers.keys.toList()..sort();
    return List.unmodifiable(storeIds);
  }
}

EntityGraphDevtoolsStoreRegistry _vmStoreRegistry() {
  final controllers = _vmControllers.values.toList()
    ..sort((left, right) => left.storeId.compareTo(right.storeId));
  return EntityGraphDevtoolsStoreRegistry(
    capturedAt: DateTime.now().toUtc().toIso8601String(),
    stores: controllers.map(
      (controller) => EntityGraphDevtoolsStoreDescriptor(
        storeId: controller.storeId,
        capabilities: controller.capabilities,
      ),
    ),
  );
}

developer.ServiceExtensionResponse _vmResult(Map<String, Object?> result) =>
    developer.ServiceExtensionResponse.result(jsonEncode(result));

developer.ServiceExtensionResponse _vmExtensionError(String message) =>
    developer.ServiceExtensionResponse.error(
      developer.ServiceExtensionResponse.extensionError,
      jsonEncode({'message': message}),
    );

developer.ServiceExtensionResponse _vmProtocolError({
  required String storeId,
  required String requestId,
  required EntityGraphDevtoolsProtocolErrorCode code,
  required String message,
}) => _vmResult(_commandError(storeId, requestId, code, message).toJson());

bool _vmHasOnlyParameters(
  Map<String, String> parameters,
  Set<String> allowed,
) => parameters.keys.every(allowed.contains);

Future<developer.ServiceExtensionResponse> _listVmStores(
  String method,
  Map<String, String> parameters,
) async {
  if (method != EntityGraphDevtoolsVmService.listStoresMethod ||
      !_vmHasOnlyParameters(parameters, const {'isolateId'})) {
    return _vmExtensionError('Invalid list-stores VM-service parameters');
  }
  final encoded = jsonEncode(_vmStoreRegistry().toJson());
  if (utf8.encode(encoded).length >
      EntityGraphDevtoolsVmService.responseBytesLimit) {
    return _vmExtensionError('The store registry exceeds the response limit');
  }
  return developer.ServiceExtensionResponse.result(encoded);
}

Future<developer.ServiceExtensionResponse> _dispatchVmCommand(
  String method,
  Map<String, String> parameters,
) async {
  if (method != EntityGraphDevtoolsVmService.commandMethod ||
      !_vmHasOnlyParameters(parameters, const {'command', 'isolateId'}) ||
      parameters['command'] == null) {
    return _vmProtocolError(
      storeId: 'unknown',
      requestId: 'invalid',
      code: EntityGraphDevtoolsProtocolErrorCode.invalidEnvelope,
      message: 'Exactly one encoded command parameter is required',
    );
  }
  final encodedCommand = parameters['command']!;
  if (utf8.encode(encodedCommand).length >
      EntityGraphDevtoolsVmService.requestBytesLimit) {
    return _vmProtocolError(
      storeId: 'unknown',
      requestId: 'invalid',
      code: EntityGraphDevtoolsProtocolErrorCode.transportLimitExceeded,
      message: 'The encoded command exceeds the VM-service request limit',
    );
  }

  Object? decoded;
  try {
    decoded = jsonDecode(encodedCommand);
  } on FormatException {
    return _vmProtocolError(
      storeId: 'unknown',
      requestId: 'invalid',
      code: EntityGraphDevtoolsProtocolErrorCode.invalidEnvelope,
      message: 'The command parameter is not valid JSON',
    );
  }
  final envelope = _stringMap(decoded);
  final requestedStoreId = envelope?['storeId'];
  final requestId = envelope?['requestId'] is String
      ? envelope!['requestId']! as String
      : 'invalid';
  if (requestedStoreId is! String || requestedStoreId.isEmpty) {
    return _vmProtocolError(
      storeId: 'unknown',
      requestId: requestId,
      code: EntityGraphDevtoolsProtocolErrorCode.invalidEnvelope,
      message: 'The command must identify an active store',
    );
  }
  final controller = _vmControllers[requestedStoreId];
  if (controller == null || controller.isDisposed) {
    return _vmProtocolError(
      storeId: requestedStoreId,
      requestId: requestId,
      code: EntityGraphDevtoolsProtocolErrorCode.wrongStore,
      message: 'No active graph is registered as $requestedStoreId',
    );
  }
  final result = controller.handleCommand(decoded);
  var encodedResult = jsonEncode(result.toJson());
  if (utf8.encode(encodedResult).length >
      EntityGraphDevtoolsVmService.responseBytesLimit) {
    encodedResult = jsonEncode(
      _commandError(
        controller.storeId,
        requestId,
        EntityGraphDevtoolsProtocolErrorCode.transportLimitExceeded,
        'The command result exceeds the VM-service response limit',
      ).toJson(),
    );
  }
  return developer.ServiceExtensionResponse.result(encodedResult);
}

void _ensureVmServiceRegistered() {
  if (!_vmServiceAvailable || _vmServiceRegistered) return;
  developer.registerExtension(
    EntityGraphDevtoolsVmService.listStoresMethod,
    _listVmStores,
  );
  developer.registerExtension(
    EntityGraphDevtoolsVmService.commandMethod,
    _dispatchVmCommand,
  );
  _vmServiceRegistered = true;
}

void _postVmEvent(EntityGraphDevtoolsEvent event) {
  if (!developer.extensionStreamHasListener) return;
  try {
    developer.postEvent(EntityGraphDevtoolsVmService.eventKind, event.toJson());
  } on Object {
    // A debugger transport cannot interrupt the production graph.
  }
}

void Function() _attachVmController(EntityGraphDevtoolsController controller) {
  if (!_vmServiceAvailable) return EntityGraphDevtoolsController._noop;
  _ensureVmServiceRegistered();
  final existing = _vmControllers[controller.storeId];
  if (existing != null && !identical(existing, controller)) {
    throw StateError(
      'VM-service storeId ${controller.storeId} is already attached',
    );
  }
  _vmControllers[controller.storeId] = controller;
  final stopEvents = controller.subscribe(_postVmEvent);
  _vmControllerSubscriptions[controller] = stopEvents;
  var attached = true;
  return () {
    if (!attached) return;
    attached = false;
    _vmControllerSubscriptions.remove(controller)?.call();
    if (identical(_vmControllers[controller.storeId], controller)) {
      _vmControllers.remove(controller.storeId);
    }
  };
}
