# entity_graph_flutter

Flutter/Dart mirror of the [Prometheus entity-graph ecosystem](https://github.com/Prometheus-AGS/prometheus-entity-management).

Provides a **normalized, reactive entity graph store** for Flutter with:

- **Dart-native entity graph** — single source of truth, mirrors `entity-graph-core`'s `GraphState`
- **Generated Riverpod 3 families** — lists, entities, realtime bridges, per-record CRUD, and collection mutations all select or write through the graph
- **Local / remote / hybrid views** — one `ListQuery` contract for graph evaluation and transport execution
- **Optimistic CRUD with exact rollback** — graph-owned receipts restore patches, sync metadata, entities, and ID-only list positions
- **Bounded failure behavior** — terminal errors never retry; transient provider fetches make at most two retry attempts
- **Transport registry** — register one `EntityTransport<T>` per entity type at app boot; providers look it up automatically
- **Optional native bridge** — `FfiEntityTransportAdapter` accepts a host callback bridge without requiring Rust, `dart:ffi`, or `flutter_rust_bridge`
- **SDL parser** — parse `entity-graph-sdl` JSON schema documents into a validated `EntityGraphIR`; same IR consumed by the Rust CLI and TS generators
- **Typed errors** — `TerminalError` (4xx / permanent) and `TransientError` (5xx / retryable), mirroring `entity-graph-core`'s `errors.ts`
- **Optional development tooling** — a separate `devtools.dart` entry provides a per-graph controller, bounded history, inspection, preview/restore, time travel, and a store-isolated VM-service bridge without entering the ordinary application barrel

## Flutter DevTools companion

Version `3.0.3` includes an official package extension under
`extension/devtools`. In a debug application,
attach an `EntityGraphDevtoolsController` to every graph that should be
inspectable. Dart DevTools then discovers the **Entity Graph** tab, where it can
switch stores and inspect counts, entities, dirty state, views, relationships,
and event history.

The VM-service protocol is absent from product mode. Values remain
metadata-only unless the application configures an explicit include/redaction
policy; the extension cannot weaken that host-owned policy.

## Canonical ownership and imported history

This directory is the sole canonical Dart graph package in the 3.0 release inventory. Reusable KnowMe source history is retained separately under `provenance/imports/knowme-flutter` as a non-buildable, non-workspace, non-public review boundary; it is not another package and must never be compiled or published.

See [`release/flutter-source-provenance.md`](https://github.com/Prometheus-AGS/prometheus-entity-management/blob/main/release/flutter-source-provenance.md) for source revisions, license and attribution, commit mappings, and path dispositions. Runtime and Riverpod evidence is documented separately in [`release/dart-graph-riverpod.md`](https://github.com/Prometheus-AGS/prometheus-entity-management/blob/main/release/dart-graph-riverpod.md). Subsequent release work added Android emulator and iOS simulator smoke evidence plus strict A2UI 1.0-RC input compatibility over the published GenUI 0.10.2 renderer boundary.

The complete application composition is demonstrated in
[`examples/flutter-riverpod`](https://github.com/Prometheus-AGS/prometheus-entity-management/tree/main/examples/flutter-riverpod) and
documented in the
[`Flutter/Riverpod/A2UI release guide`](https://github.com/Prometheus-AGS/prometheus-entity-management/blob/main/release/flutter-riverpod-a2ui-example.md).
Its Flutter 3.44.8 host tests, three deterministic goldens, Android API 35
emulator lane, and iOS 26.5 simulator lane now pass at their recorded boundary.

## Architecture

```
Widget (watches generated provider)
  ↓
entityListProvider<T>          ← selection + orchestration
  ↓
EntityGraph                    ← canonical rows, patches, sync metadata, ID lists
  ↓
EntityTransportRegistry        ← external list/get/create/update/delete/change I/O
  ↓
REST / GraphQL / local / optional FFI host
```

This mirrors the `Component → Hook → Store` layering from entity-graph-core.
Widgets read providers and invoke provider controllers. Providers orchestrate;
the graph owns state; transports own I/O. Widgets do not maintain copied entity
caches or call transport APIs directly.

## Optional DevTools controller

> This entry is published in `3.0.3`; `package:entity_graph_flutter/devtools.dart`
> remains separate from the ordinary application barrel.

Import the optional library only from development tooling or a host-controlled
debug bootstrap. The ordinary `entity_graph_flutter.dart` entry does not export
or initialize DevTools.

```dart
import 'package:entity_graph_flutter/devtools.dart';
import 'package:entity_graph_flutter/entity_graph_flutter.dart';

final devtoolsBinding = EntityGraphDevtoolsBinding.attach(
  graph,
  enabled: !const bool.fromEnvironment('dart.vm.product'),
  storeId: 'application',
);

// Release the reference when this debug host is disposed.
devtoolsBinding.detach();
```

Repeated attachments to the same `EntityGraph` share one reference-counted
controller. Each graph has an explicit store ID, event history, snapshot ring,
view registry, and value policy; no controller owns business state. The
isolate-wide bridge exposes versioned list/command methods and Extension-stream
events only when Dart VM service extensions are available. It supports multiple
graphs without an implicit default store.

Values are metadata-only by default. A host that opts into value inclusion must
provide any required redactor before canonical values, patches, history, or
preview data can cross the debugger boundary. A VM-service command cannot
enable values, replace the redactor, or commit a preview. Encoded requests are
limited to 256 KiB, responses to 8 MiB, and individual events to 256 KiB by
default. History and snapshots are bounded by simultaneous count and byte
limits.

The repository acceptance command launches a real configured Flutter
application, connects from outside the isolate over VM-service WebSocket
JSON-RPC, and drives the production controller through real Riverpod views:

```bash
pnpm run verify:devtools-flutter-controller
```

This certifies the controller and VM-service bridge. The official Flutter
DevTools UI has a separate static analyzer, package-build, and extension
validation gate; connected-host certification and pub.dev publication are
reported separately and are not inferred from the controller receipt.

## Setup

### 1. Add to `pubspec.yaml`

```yaml
dependencies:
  entity_graph_flutter: ^3.0.3
  flutter_riverpod: ^3.3.2
```

Or add it from the command line:

```bash
flutter pub add entity_graph_flutter:^3.0.3
```

### 2. Wrap your app with `ProviderScope`

```dart
void main() {
  runApp(const ProviderScope(child: MyApp()));
}
```

### 3. Register transports at boot

```dart
// lib/bootstrap.dart
import 'package:entity_graph_flutter/entity_graph_flutter.dart';

void registerTransports() {
  EntityTransportRegistry.instance.register(
    'Invoice',
    MyInvoiceTransport(),
  );
}
```

### 4. Implement `EntityTransport<T>`

```dart
class MyInvoiceTransport extends EntityTransport<Invoice> {
  @override
  String identify(Invoice row) => row.id;

  @override
  Map<String, Object?> toGraph(Invoice row) => row.toJson();

  @override
  bool get authoritative => false;

  @override
  Duration? get staleTime => const Duration(seconds: 30);

  @override
  Future<ListResult<Invoice>> list(ListQuery query) async {
    final response = await http.get(Uri.parse('/api/invoices'));
    final List<dynamic> body = jsonDecode(response.body);
    return ListResult(
      rows: body.map(Invoice.fromJson).toList(),
      total: body.length,
    );
  }

  @override
  Future<Invoice?> get(String id) async {
    final response = await http.get(Uri.parse('/api/invoices/$id'));
    if (response.statusCode == 404) return null;
    return Invoice.fromJson(jsonDecode(response.body));
  }

  @override
  Future<Invoice> create(Map<String, Object?> data) async {
    // POST and return the server-confirmed row.
    throw UnimplementedError();
  }

  @override
  Future<Invoice> update(String id, Map<String, Object?> patch) async {
    // PATCH and return the server-confirmed row.
    throw UnimplementedError();
  }

  @override
  Future<void> delete(String id) async {
    // DELETE the row.
  }
}
```

### 5. Watch in widgets

```dart
// Declare provider (typically in a providers file)
final activeInvoicesProvider = entityListProvider<Invoice>(
  type: 'Invoice',
  queryKey: 'invoices:active',
  fromGraph: Invoice.fromGraph,
  query: ListQuery(
    filter: [FilterClause(field: 'status', op: FilterOperator.eq, value: 'active')],
  ),
);

// In a widget
class InvoiceListPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final snap = ref.watch(activeInvoicesProvider);
    return snap.when(
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => Text('Error: $e'),
      data: (snapshot) => ListView.builder(
        itemCount: snapshot.items.length,
        itemBuilder: (_, i) => InvoiceTile(invoice: snapshot.items[i]),
      ),
    );
  }
}
```

## Views and pagination

`ViewCompleteness.local` evaluates filters, search, multi-sort, and limit
against the canonical graph without transport I/O. `remote` stores the returned
rows once and retains only their IDs under `queryKey`. `hybrid` renders the
local result immediately and replaces membership after background revalidation.

```dart
final sortedAdminsProvider = entityListProvider<Invoice>(
  type: 'Invoice',
  queryKey: 'invoices:admins',
  fromGraph: Invoice.fromGraph,
  completeness: ViewCompleteness.hybrid,
  query: const ListQuery(
    filter: [
      FilterClause(field: 'role', op: FilterOperator.eq, value: 'admin'),
    ],
    sort: [
      SortClause(field: 'createdAt', direction: SortDirection.desc),
    ],
    limit: 50,
  ),
);

await ref.read(sortedAdminsProvider.notifier).fetchNextPage();
```

## Optimistic CRUD

The edit buffer belongs to the generated CRUD controller, not to the entity
graph. `applyOptimistic()` publishes only dirty fields through the graph patch
layer so every joined view sees the overlay. `save()` replaces it with the
server-confirmed row. Failure restores the exact prior patch and sync metadata.

```dart
final invoiceCrud = entityCrudProvider<Invoice>(
  type: 'Invoice',
  id: invoiceId,
);

final controller = ref.read(invoiceCrud.notifier);
controller.edit('status', 'paid');
controller.applyOptimistic();

try {
  await controller.save();
} on TerminalError catch (error) {
  // The graph has already restored its previous optimistic state.
  showValidationError(error.message);
}
```

Collection creates use `entityMutationsProvider<T>`. An optional temporary ID
can appear in an ID-only list while the request is pending; success swaps it for
the confirmed ID and failure removes it. Deletes remove optimistically and use a
graph-owned receipt to restore entity data and every former list index.

## Realtime and retry boundary

When `subscribe` is enabled, `entityChangeBridgeProvider<T>` mounts the
registered transport's optional change feed. Inserts and updates normalize into
the graph and invalidate typed lists; deletes remove canonical state and list
membership. This library proves normalization and invalidation, not a batched or
durable mobile sync engine.

Generated fetch providers use `entityProviderRetry`:

- `TerminalError`: zero retries;
- `TransientError`: at most two retries after the first attempt;
- create/update/delete side effects: never automatically retried.

## Optional FFI transport

Implement `FfiEntityBridge<T>` in an application or a separate native package,
then wrap it with `FfiEntityTransportAdapter<T>`. The canonical package imports
no generated FFI library and has no native runtime dependency. FFI is a delivery
mechanism; it never becomes a second entity store.

## SDL Schema Contract

The SDL format is the shared contract between the TypeScript ecosystem and Flutter:

```dart
import 'dart:convert';
import 'package:entity_graph_flutter/entity_graph_flutter.dart';

final ir = parseSdl(jsonDecode(schemaJson));
for (final entity in ir.entities) {
  print('Entity: ${entity.name}, PK: ${entity.primaryKey}');
  for (final field in entity.fields) {
    print('  ${field.name}: ${field.type.name}');
  }
}
```

## Development

```bash
# From the repository root (pnpm remains the monorepo entry point)
pnpm run dart:bootstrap:frozen
pnpm run dart:generate
pnpm run dart:format
pnpm run dart:analyze
pnpm run verify:dart-graph-riverpod # static source contract; not test evidence
pnpm run verify:dart-exports
pnpm run verify:devtools-flutter-controller # full assembled controller acceptance
```

Implementation comes first. The analyzer and static graph/export contracts are
not test evidence. Do not run or cite legacy unit, widget, provider, golden,
Node, Cucumber, or partial suites; behavioral completion requires the complete
assembled production flow for the affected surface.

The package uses Riverpod generation. It does not use or require Freezed or
JSON model generation. `providers.g.dart` is generated source and must never be
edited by hand.

## Cross-view reactivity

The graph emits a `Stream<GraphChange>` on every write. The Riverpod notifiers
subscribe to this stream and automatically rebuild widgets when their
entity type or list query key is affected — **without any additional plumbing**.

When an `Invoice` is updated anywhere (realtime, mutation, optimistic patch),
every widget watching `Invoice` entities rebuilds in the same frame.

## Current publication and evidence boundary

- The live pub.dev version and archive hash are recorded in
  `release/pubdev-registry-status.json`, and a clean consumer import/analyzer
  check is required after every publication.
- Flutter 3.44.8 generation, analysis, package/showcase tests, three goldens,
  Android emulator, and iOS simulator smoke lanes are recorded in
  `examples/coverage.json`.
- The Flutter showcase accepts strict A2UI 1.0-RC surfaces and normalizes them
  to the published GenUI 0.10.2 renderer only after catalog, component,
  function, action, tenant, and entity validation.
- The optional DevTools controller passed its complete
  Flutter/Riverpod/VM-service acceptance flow with two isolated graphs and 28
  versioned events. Version `3.0.3` also includes the official, validated
  Flutter DevTools extension UI.
- Physical devices, store submission, signing, and a cross-ecosystem stable
  release bundle are not claimed.
- realtime coalescing or durable peer convergence.

See the release contract and coverage ledger instead of inferring app-store or
full npm 3.0 readiness from this Dart package version.
