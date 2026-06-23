/// entity_graph_flutter
///
/// Flutter/Dart mirror of the Prometheus entity-graph ecosystem.
///
/// Mirrors the three-layer model of entity-graph-core:
///   Layer 1  →  [EntityGraph]          (the normalized in-memory store)
///   Layer 2  →  Riverpod providers      (entityProvider, entityListProvider)
///   Transport →  [EntityTransport] + [EntityTransportRegistry]
///
/// The SDL shared contract is modelled by [SdlDocument] / [EntityGraphIR].
/// Use [parseSdl] to parse a JSON/Map SDL document into the validated IR.
library entity_graph_flutter;

// Core graph store
export 'src/graph.dart';

// Typed errors
export 'src/errors.dart';

// Transport registry
export 'src/transport.dart';

// SDL parser + IR
export 'src/sdl.dart';

// Riverpod providers
export 'src/providers.dart';
