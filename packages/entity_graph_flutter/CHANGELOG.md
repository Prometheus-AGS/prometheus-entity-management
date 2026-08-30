# Changelog

## 3.0.4

- Recover active preview receipts after DevTools reconnects and bind every
  command response to its protocol, store, and request identity.
- Serialize refresh state, disable invalid rewind/live actions, and surface
  preview conflicts or expired history directly in the inspector.
- Make preview ownership collision-safe across stores and clients, restore
  preview layers and live heads during final detach, and keep blocked cleanup
  recoverable until it can safely finalize.
- Reject time travel while local previews are active and preserve safe preview
  restoration across canonical server or realtime entity updates.

## 3.0.3

- Scope preview receipts by graph store and prevent a second preview from
  hiding the receipt required to restore the first preview.
- Validate preview JSON in the dialog, surface debugger action failures, and
  show rewind only when an activity record has a retained snapshot cursor.
- Correlate every concurrent VM-service response with a collision-resistant,
  monotonically sequenced request ID.

## 3.0.2

- Add the optional store-scoped DevTools controller, bounded semantic history,
  entity/view/relationship inspection, preview/restore, and stable-cursor time
  travel without importing DevTools from the ordinary package entry.
- Add the versioned, store-isolated VM-service bridge with metadata-only values
  by default and host-owned redaction when values are explicitly included.
- Ship the official Flutter DevTools package companion with responsive overview,
  entity, view/relationship, and activity workspaces plus explicit connection
  states.
- Retain A2UI 1.0-RC input compatibility through the validated GenUI 0.10.2
  renderer boundary.

## 3.0.1

- Refresh the public package guide with the verified pub.dev installation path,
  Android and iOS smoke evidence, and current release boundaries.
- Document the Flutter A2UI 1.0-RC compatibility example over GenUI 0.10.2 and
  its application-owned action policy.
- Retain the 3.0.0 Dart runtime API without behavioral or compatibility changes.

## 3.0.0

- Preserve one Dart-native normalized entity graph with ID-only lists.
- Upgrade the Flutter binding to generated Riverpod 3 provider families.
- Add local, remote, and hybrid entity views.
- Add isolated edit buffers and optimistic create, update, and delete flows.
- Add bounded transient retry and terminal no-retry behavior.
- Add realtime change invalidation and an optional dependency-free FFI adapter.
- Add Dart workspace orchestration with Melos 8.
- Add permanent Riverpod/view/CRUD/retry/realtime/FFI/widget verification and a mechanically checked public declaration ledger.
- Certify frozen resolution, generation, analysis, 70 tests, scoped goldens,
  and a zero-warning Pub dry run on Flutter 3.44.8 stable.
