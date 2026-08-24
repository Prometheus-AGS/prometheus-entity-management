# Dart graph and Riverpod 3 boundary

Load this reference before generating, editing, or claiming support for
`entity_graph_flutter`.

## Ownership and layering

`packages/entity_graph_flutter` is the only buildable and public Dart graph
package. Never import runtime code from `provenance/imports/knowme-flutter` or
`hybrid-mobile-architecture-src`; follow `flutter-source-provenance.md` for
adapt/reference/reject decisions.

The Dart layering is:

```text
Widgets → generated Riverpod providers/controllers → EntityGraph → transports
```

- widgets watch providers and invoke controller methods;
- providers select the graph and orchestrate loading/mutations;
- `EntityGraph` alone owns canonical rows, patches, sync metadata, and ID lists;
- transports own list/get/create/update/delete/change I/O and row normalization;
- optional FFI is a transport bridge, never state ownership.

Do not store fetched entity copies inside a provider family or list. An edit
buffer may remain controller-local until optimistic publication or save.

## Provider surface

| Provider | Purpose |
| --- | --- |
| `entityGraphProvider` | Injectable canonical graph owner |
| `entityTransportRegistryProvider` | Injectable per-type transport registry |
| `entityChangeBridgeProvider<T>` | Optional transport change feed into graph/invalidation |
| `entityListProvider<T>` | Local, remote, or hybrid ID-list selection and pagination |
| `entityProvider<T>` | One graph-backed entity with optional transport fetch |
| `entityCrudProvider<T>` | Isolated edit buffer, optimistic update, save, delete, rollback |
| `entityMutationsProvider<T>` | Collection create with optional optimistic placeholder |

Use `ViewCompleteness.local` for graph-authoritative filtering, `remote` for
transport-owned membership, and `hybrid` for local-first rendering followed by
remote revalidation. All modes return models joined from the graph.

## Failure and mutation rules

- `TerminalError` is never retried.
- `TransientError` fetches receive at most two retries after the first attempt.
- create/update/delete side effects are not automatically retried.
- optimistic update rollback restores the prior patch and sync metadata;
- optimistic delete rollback restores graph data and exact list indexes;
- optimistic create failure removes its placeholder.

## Generation and dependencies

The stable matrix is Flutter `>=3.44`, Dart `>=3.12 <4`, Riverpod
`>=3.3.2 <3.4.0`, annotations `>=4.0.3 <4.0.5`, generator 4.0.4,
build_runner 2.15.1, and Flutter lints 6. The bounded runtime ranges and exact
generation pins preserve resolution on Flutter 3.44.8 stable;
Riverpod 3.4.2/generator 4.0.8 require a newer SDK test/analyzer matrix.
The package uses Riverpod generation but not Freezed or JSON generation.
Never edit `providers.g.dart` by hand.

The mechanical public declaration ledger is `dart-library-exports.json`. Run:

```bash
pnpm run dart:generate
pnpm run dart:format
pnpm run dart:analyze
pnpm run dart:test
pnpm run verify:dart-graph-riverpod
pnpm run verify:dart-exports
```

After intentional public API changes, run `pnpm run refresh:dart-exports` and
update this reference, the package README, `release/dart-graph-riverpod.md`,
and `examples/coverage.json` in the same change.

## Evidence limits

The widget goldens certify a small cross-view harness only. They do not certify
the full Flutter/A2UI showcase, Android/iOS, accessibility, device smoke,
offline persistence, or realtime batching. A green package gate also does not
authorize pub.dev publication or npm stable promotion. The clean Flutter
3.44.8 stable library candidate is complete; consult the release contract and
still require the showcase, registry, immutable release-certification, and
publication receipts for broader claims.
