# Flutter controller task 7 — assembled acceptance harness

Date: 2026-08-30

## Implemented acceptance path

Task 7 adds one full assembled integration/acceptance path instead of adding to
the package's legacy isolated test suites:

```text
Node verifier
  -> Flutter tool machine protocol
  -> real supported-device debug application
  -> Dart VM-service WebSocket JSON-RPC
  -> versioned production DevTools methods and Extension stream
  -> two production EntityGraph controllers
  -> real Riverpod entity/list providers and graph publications
```

- Added a real Flutter acceptance host that attaches two graph controllers,
  renders one graph through generated Riverpod entity/list providers, registers
  a validated relationship schema, and retains a second isolated graph.
- Added a test-only, exact-parameter VM-service step method that drives only
  public graph and binding APIs. The application surface never becomes a
  second business-state owner.
- Added an external Node 22 verifier that discovers a connected device whose
  platform is configured by the example, obtains the app's VM-service URI from
  `flutter run --machine`, locates the isolate that owns the registered
  extension methods, subscribes to the real Extension stream, and invokes the
  production versioned RPCs.
- The single flow asserts cross-runtime fixture identity, multi-store discovery
  and isolation, graph instrumentation, Riverpod view registration, entity,
  dirty/error, view and relationship projections, host redaction, strict
  command/payload policy, request and event bounds, preview conflict refusal,
  retained rewind/return-live, mutation-driven live mode, history clearing,
  disposal events, and empty discovery after final detach.
- Added the root `verify:devtools-flutter-controller` command. Its eventual
  task-8 run writes one structured acceptance receipt.

## Security boundary

The external VM-service connection is the actual debugger/tool boundary. The
host includes a sentinel secret in both graphs, enables values only for store A
under a host-owned recursive redactor, and keeps store B metadata-only. The
verifier rejects any sentinel that crosses event, history, or inspection
serialization; attempts to inject value policy through the command envelope or
payload must fail. Encoded requests and emitted events are exercised above
their ceilings. Child builds remove inherited Cargo/npm registry tokens, and
failure reporting withholds raw non-protocol diagnostics rather than risking
credential capture.

## Documentation authority

- Context7's current Node 22 documentation confirms that the global WHATWG
  `WebSocket` is stable and that `child_process.spawn` supports explicit
  arguments, `cwd`, environment, piped stdio, and signal-based teardown without
  a shell.
- The installed Dart SDK and `vm_service` sources confirm isolate-scoped custom
  RPCs, `streamListen('Extension')`, `streamNotify`, `extensionKind`, and
  `extensionData`.

## Verification at this task boundary

- `dart format --output=none --set-exit-if-changed` passed for the Flutter
  acceptance host. This is a formatter/parser check, not test evidence.
- `node --check` passed for the external acceptance verifier.
- Static source-contract assertions passed for the Flutter/Riverpod app,
  machine-protocol launch, WebSocket VM client, registered methods and event
  kind, two-store routing, projections, redaction/policy refusal, request/event
  bounds, preview conflict, rewind/live, disposal, secret-safe diagnostics, and
  the absence of unit/widget/golden/mock test APIs.
- Core and Flutter entity-inspection fixtures remain byte-identical at SHA-256
  `5b2654e1ee326b2309b6ceb786db95dcfc3912a015adba2379cafebbea849890`.
- Core and Flutter time-travel fixtures remain byte-identical at SHA-256
  `937478739c4fcf9d730050da375ff48a00d905cdef8c66c86cd7c24d2eda0ad5`.
- Both fixtures passed JSON parsing and the scoped diff passed
  `git diff --check`.

The acceptance harness was not executed. No analyzer, compiler, Flutter build,
test, or device launch ran. Task 8 owns the one assembled execution gate.
Sovereign sync was not touched.
