# entity_graph_flutter

Flutter/Dart mirror of the [Prometheus entity-graph ecosystem](https://github.com/Prometheus-AGS/prometheus-entity-management).

Provides a **normalized, reactive entity graph store** for Flutter with:

- **Dart-native entity graph** — single source of truth, mirrors `entity-graph-core`'s `GraphState`
- **Riverpod 3 `AsyncNotifier` providers** — `entityListProvider` / `entityProvider` for paginated lists and single-entity watches
- **Transport registry** — register one `EntityTransport<T>` per entity type at app boot; providers look it up automatically
- **SDL parser** — parse `entity-graph-sdl` JSON schema documents into a validated `EntityGraphIR`; same IR consumed by the Rust CLI and TS generators
- **Typed errors** — `TerminalError` (4xx / permanent) and `TransientError` (5xx / retryable), mirroring `entity-graph-core`'s `errors.ts`

## Architecture

```
Widget (watches provider)
  ↓
entityListProvider<T>          ← Riverpod AsyncNotifier
  ↓
EntityListNotifier             ← orchestrates graph reads + transport calls
  ↓
EntityTransportRegistry        ← look up EntityTransport<T> by entity type
  ↓
EntityGraph (singleton)        ← normalized store, fires change stream
```

This mirrors the `Component → Hook → Store` layering from entity-graph-core.
Widgets **never** write to the graph directly.

## Setup

### 1. Add to `pubspec.yaml`

```yaml
dependencies:
  entity_graph_flutter:
    path: ../packages/entity_graph_flutter
  flutter_riverpod: ^2.6.1
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
class MyInvoiceTransport implements EntityTransport<Invoice> {
  @override
  String identify(Invoice row) => row.id;

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
# Run tests
flutter test

# Analyze
dart analyze

# Generate code (Freezed / Riverpod codegen, if used in consuming app)
dart run build_runner build --delete-conflicting-outputs
```

## Cross-view reactivity

The graph emits a `Stream<GraphChange>` on every write. The Riverpod notifiers
subscribe to this stream and automatically rebuild widgets when their
entity type or list query key is affected — **without any additional plumbing**.

When an `Invoice` is updated anywhere (realtime, mutation, optimistic patch),
every widget watching `Invoice` entities rebuilds in the same frame.
