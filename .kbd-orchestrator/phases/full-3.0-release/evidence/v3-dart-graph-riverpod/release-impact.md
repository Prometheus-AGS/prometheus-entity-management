# Release impact — `v3-dart-graph-riverpod`

Date: 2026-08-02

## What this change makes release-ready

- `entity_graph_flutter@3.0.0` has one canonical Dart-native normalized graph,
  ID-only lists, local patches, sync metadata, and a transport-neutral boundary.
- Generated Riverpod 3 families expose graph injection, registry injection,
  entity/list selection, realtime bridging, record CRUD, and collection create.
- Local, remote, and hybrid views plus optimistic create/update/delete have
  permanent behavioral and exact rollback proof.
- Terminal errors stop immediately; transient fetch errors are bounded to two
  retries; mutation side effects are never automatically retried.
- Native/FFI integration remains optional and cannot become a second state owner.
- The package has a source-derived 81-declaration public ledger, synchronized
  package/release/coverage/skill guidance, and scoped stable-rendered goldens.
- A clean Flutter 3.44.8 stable candidate passes the complete applicable
  library/package gate, including a zero-warning Pub dry run.

## Compatibility and migration effect

This is a breaking Dart/Flutter consumer transition from Riverpod 2 notifier
APIs to generated Riverpod 3 families/controllers. Consumers must meet Dart
3.12 and Flutter 3.44, regenerate provider source, replace direct legacy
notifier ownership with graph-backed families, and register transports at the
application boundary. Unused Freezed/JSON generators are removed rather than
forcing incompatible analyzer constraints. There is no npm runtime-export
change from this Dart-only gate.

## Downstream impact

The archive satisfies the canonical Dart-library dependency for the full
Flutter/Riverpod/A2UI showcase and supplies inputs for generated API docs,
concept/package guidance, integration tutorials, migration documentation, and
final release certification. It does not satisfy those downstream changes by
itself.

## What remains incomplete for full 3.0

The complete Flutter application and devices, Tauri mobile platform work, five
showcases, Flint portability, remaining skills, Prometheus-branded Docusaurus
site, GitHub Pages deployment, RC/recovery automation, immutable-SHA
certification, registry authority, publication, GitHub Release, and npm
`latest` promotion remain open. The project release therefore remains in
progress and uncertified.

## Publication authority

The release contract keeps the Dart registry decision `deferred`.
Publication remains unauthorized. No registry, dist-tag, GitHub Release,
Pages deployment, or platform-store mutation occurred.
