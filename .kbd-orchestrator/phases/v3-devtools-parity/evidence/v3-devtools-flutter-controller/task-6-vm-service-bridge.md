# Flutter controller task 6 — bounded VM-service bridge

Date: 2026-08-30

## Production implementation

- Registered one isolate-wide versioned discovery method,
  `ext.entity_graph_flutter.devtoolsV1.listStores`, and one versioned command
  method, `ext.entity_graph_flutter.devtoolsV1.command`.
- Added the versioned `prometheus.entity-graph.devtools.v1` Extension-stream
  event kind and listener-gated event delivery for each active graph.
- Added explicit multi-store discovery and routing. Store IDs are sorted for
  stable discovery, duplicate active IDs are rejected, and the last binding
  detach removes the controller and its event subscription.
- Added exact command-envelope and payload shapes for every v1 command,
  including explicit store/protocol/version/request validation, JSON-compatible
  preview patches, and `confirm: true` for history import restore.
- Added 256 KiB request and 8 MiB response ceilings. Events retain the existing
  controller-owned 256 KiB per-event ceiling and typed value truncation.
- Kept VM registration absent from product-mode isolates and configurable per
  graph through the optional DevTools attachment. The ordinary Flutter package
  root still does not import or export DevTools.

## Security boundary

The encoded VM-service command is untrusted input at an actual tool-execution
boundary. The bridge accepts only the two package-owned methods, exact string
parameters, a bounded JSON command, an active explicit store ID, protocol v1,
known commands, and exact command payloads. Remote commands cannot supply or
replace `valuePolicy` or a redactor; metadata-only remains the default and only
the attaching host can enable value inclusion. Event delivery and debugger
transport failures are isolated from the production graph.

## Documentation authority

The installed Dart SDK `dart:developer` source confirmed that service methods
must use `ext.<package>.<command>`, handlers receive string parameters, results
and error details must be encoded JSON objects, and custom events should be
gated by `extensionStreamHasListener` before `postEvent`.

## Verification at this task boundary

- `dart format --output=none --set-exit-if-changed` passed for the controller,
  command dispatcher, VM-service bridge, and protocol. This is a
  formatter/parser check, not test evidence.
- Static source-contract assertions passed for both registered methods, the
  versioned event kind, exactly two extension registrations, listener-gated
  event delivery, product-mode exclusion, exact VM parameters, request/response
  ceilings, strict envelope/store/confirmation checks, JSON-compatible preview
  values, host-only value policy, and ordinary-root exclusion.
- Core and Flutter entity-inspection fixtures remain byte-identical at SHA-256
  `5b2654e1ee326b2309b6ceb786db95dcfc3912a015adba2379cafebbea849890`.
- Core and Flutter time-travel fixtures remain byte-identical at SHA-256
  `937478739c4fcf9d730050da375ff48a00d905cdef8c66c86cd7c24d2eda0ad5`.
- Both fixtures passed `jq` JSON validation and the scoped diff passed
  `git diff --check`.

No analyzer, compiler, test, or build ran. The complete assembled Dart/Flutter
integration/acceptance gate remains task 8 after task 7 wires its scenarios.
Sovereign sync was not touched.
