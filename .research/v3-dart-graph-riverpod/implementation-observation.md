# Task 2 implementation observation

Date: 2026-08-02

The task-1 research conclusion survived implementation. Removing unused
Freezed/JSON generators produced a coherent current Riverpod-only resolution:

- Flutter SDK contract: `>=3.44.0 <4`
- Dart SDK contract: `>=3.12.0 <4`
- `flutter_riverpod` 3.4.2
- `riverpod_annotation` 4.0.6
- `riverpod_generator` 4.0.8
- `build_runner` 2.16.0
- `flutter_lints` 6.0.0
- Melos 8.2.2
- resolved analyzer 13.3.0

`flutter pub outdated --json` reported no outdated direct dependency and no
discontinued or advisory-affected resolved package. Newer analyzer/test
transitives are visible but are not resolvable under the current stable
generator/Flutter SDK constraints; they were not hidden or force-pinned.

Two implementation probes corrected assumptions that static analysis missed:

1. Graph `isFetching` notifications could complete a generated async provider
   with an empty snapshot before its first transport result. Providers now gate
   graph notifications until the initial value is ready. The same generated
   provider/optimistic CRUD probe then passed.
2. Riverpod generator 4.0.8 produced invalid generic inference for a functional
   family whose arguments carried no value of `T`. The change bridge now uses
   the supported generic class-family form and regenerates cleanly; generated
   code was never edited by hand.

The Feynman model remains valid: the graph is the catalog, generated Riverpod
families are librarians, and transports—including optional FFI—are delivery
mechanisms. Runtime rows, optimistic patches, list IDs, and realtime changes all
flow through the one graph.
