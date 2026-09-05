/// entity_graph_flutter
///
/// Flutter/Dart mirror of the Prometheus entity-graph ecosystem.
///
/// Mirrors the three-layer model of entity-graph-core:
///   Layer 1  →  [EntityGraph]          (the normalized in-memory store)
///   Layer 2  →  Riverpod providers      (entityProvider, entityListProvider)
///   Transport →  [EntityTransport] + [EntityTransportRegistry]
///
/// The SDL shared contract is modelled by [EntityGraphIR].
/// Use [parseSdl] to parse a JSON/Map SDL document into the validated IR.
library;

// Core graph store
export 'src/graph.dart';

// Typed errors
export 'src/errors.dart';

// Transport registry
export 'src/transport.dart';

// Optional callback-backed Rust/FFI transport (no native dependency required)
export 'src/ffi-transport.dart';

// Local/remote/hybrid view evaluation
export 'src/view.dart';

// SDL parser + IR
export 'src/sdl.dart';

// Riverpod providers
export 'src/providers.dart';

// Hook helpers (flutter_hooks + hooks_riverpod), mirroring the React binding
export 'src/hooks/use_entity.dart';
export 'src/hooks/use_entity_list.dart';
export 'src/hooks/use_entity_query.dart';
