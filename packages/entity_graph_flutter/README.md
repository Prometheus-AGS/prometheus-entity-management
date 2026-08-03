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

## Canonical ownership and imported history

This directory is the sole canonical Dart graph package in the 3.0 release inventory. Reusable KnowMe source history is retained separately under `provenance/imports/knowme-flutter` as a non-buildable, non-workspace, non-public review boundary; it is not another package and must never be compiled or published.

See [`release/flutter-source-provenance.md`](../../release/flutter-source-provenance.md) for source revisions, license and attribution, commit mappings, and path dispositions. Runtime and Riverpod evidence is documented separately in [`release/dart-graph-riverpod.md`](../../release/dart-graph-riverpod.md). Neither gate authorizes pub.dev publication or certifies the complete Flutter/A2UI application on Android or iOS.

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

## Setup

### 1. Add to `pubspec.yaml`

```yaml
dependencies:
  entity_graph_flutter:
    path: ../packages/entity_graph_flutter
  flutter_riverpod: ^3.3.2
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
pnpm run dart:test
pnpm run verify:dart-graph-riverpod
pnpm run verify:dart-exports
```

The package uses Riverpod generation. It does not use or require Freezed or
JSON model generation. `providers.g.dart` is generated source and must never be
edited by hand.

## Cross-view reactivity

The graph emits a `Stream<GraphChange>` on every write. The Riverpod notifiers
subscribe to this stream and automatically rebuild widgets when their
entity type or list query key is affected — **without any additional plumbing**.

When an `Invoice` is updated anywhere (realtime, mutation, optimistic patch),
every widget watching `Invoice` entities rebuilds in the same frame.

## What the current gate does not prove

- pub.dev ownership or authorization to publish;
- the immutable full-release SHA or cross-ecosystem certification bundle (the
  clean Flutter 3.44.8 stable library candidate is certified separately);
- Flutter/A2UI application navigation, Android/iOS device behavior, offline
  persistence, accessibility, or complete phone/tablet visuals;
- realtime coalescing or durable peer convergence.

Those claims remain owned by the later Flutter showcase, registry,
release-certification, and stable-publication changes. See the release contract
instead of inferring full-release readiness from this package version.
