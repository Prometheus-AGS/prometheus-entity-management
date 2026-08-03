# Flutter, Riverpod, and A2UI application reference

Load this reference when generating, reviewing, or documenting a Flutter
application that combines `entity_graph_flutter`, generated Riverpod 3
providers, policy-controlled A2UI, offline-aware CRUD, realtime changes, and
an optional native transport.

The runnable example is
[`examples/flutter-riverpod`](../../../examples/flutter-riverpod/README.md),
and its release boundary is
[`release/flutter-riverpod-a2ui-example.md`](../../../release/flutter-riverpod-a2ui-example.md).
Also load `dart-graph-riverpod.md` for the canonical package contract and
`flutter-source-provenance.md` before making source-lineage claims.

## Required composition

```text
Widget -> generated provider/controller -> application controller
  -> EntityGraph -> EntityTransport

A2UI JSONL -> atomic validation -> official GenUI renderer
  -> exact action policy -> human approval -> CRUD controller -> EntityGraph
```

- Create one application-owned `EntityGraph` and override
  `entityGraphProvider`; never create per-screen graphs.
- Keep widgets free of transport calls and copied entity state.
- Keep lists ID-only and join rows from the graph at read time.
- Route create/update/delete through generated Riverpod controllers.
- Keep offline queue state and realtime normalization below the widget layer.
- Treat `FfiEntityTransportAdapter` as an optional transport seam, not graph
  ownership and not proof of a bundled Rust runtime.

## A2UI safety contract

- Pin `genui` exactly while it remains experimental.
- Validate the complete untrusted JSONL batch before official runtime mutation.
- Allowlist component types, catalog and surface IDs, and event action names.
- Reject client functions, malformed envelopes, duplicates, missing roots,
  unknown components, and undeclared actions.
- Apply tenant/task authorization after protocol validation.
- Require trusted human approval for archival/destructive intent.
- Route allowed actions through generated CRUD controllers; the renderer never
  receives direct graph authority.
- Do not claim byte-identical React/Flutter A2UI output: this example adapts
  the shared 0.9.1 baseline to GenUI's official `v0.9` wire identifier.

## Current evidence

```bash
cd examples/flutter-riverpod
dart analyze --fatal-infos --fatal-warnings
flutter test test
```

The host boundary currently proves 25 tests plus phone/tablet golden baselines.
Consult `examples/coverage.json` for the exact paths. The showcase status is
`partial` until the same candidate is resolved and tested under Flutter 3.44.8
stable and its Android/iOS integration lanes pass.

The example changes no package declaration. Do not refresh
`dart-library-exports.json` unless `packages/entity_graph_flutter/lib` actually
changes its public declarations. Do not describe host tests, authored workflow
lanes, or goldens as Android/iOS execution or publication authority.
