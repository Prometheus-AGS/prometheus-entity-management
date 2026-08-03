# Task 2 — Dart graph and Riverpod 3 implementation

Date: 2026-08-02  
Change: `v3-dart-graph-riverpod`  
Task: Implement the full plan scope without weakening explicit exclusions.

## Verdict

**Implementation complete; behavioral certification remains task 3 and clean
state certification remains task 5.** This task changes runtime/package source
and workspace orchestration only. It does not claim Flutter widget/platform,
BDD, visual, clean-room, pub.dev, or full 3.0 release certification.

## Scope implementation

| Plan requirement | Implementation | Status |
| --- | --- | --- |
| Preserve tested Dart-native graph as canonical | `lib/src/graph.dart` remains the only entity/patch/ID-list state owner; graphs and registries are now injectable for scoped tests | Implemented |
| Riverpod 3 families/controllers | Generated `entityListProvider`, `entityProvider`, `entityCrudProvider`, `entityMutationsProvider`, and `entityChangeBridgeProvider`; generated source is committed | Implemented |
| Cross-view normalization | Providers join graph IDs to current entities and subscribe to graph changes; provider state does not own entity copies independently | Implemented |
| Local/remote/hybrid views | `ViewCompleteness` and local transport-neutral filtering/search/sorting evaluate to IDs; hybrid renders local and revalidates remotely | Implemented |
| Optimistic CRUD | Isolated `EditBuffer`, optimistic create/update/delete, graph-owned removal receipts, exact patch/sync rollback, and server confirmation paths | Implemented |
| Change invalidation | Optional transport subscriptions upsert/remove through the graph, type lists are tracked explicitly, and stale lists/entities revalidate in the background | Implemented |
| Terminal retry safety | Terminal errors return no retry; transient fetches have two bounded exponential retries; mutation methods never auto-retry side effects | Implemented |
| Pluggable transport | REST/GraphQL/local implementations use `EntityTransport`; `FfiEntityTransportAdapter` imports no FFI runtime and delegates through a host bridge | Implemented |
| Stable dependency matrix | Dart 3.12, Flutter 3.44, Riverpod 3.4.2/codegen 4.0.x, build_runner 2.16, analyzer 13.3, lints 6; unused Freezed/JSON dependencies removed | Implemented |
| Melos orchestration | Root Dart workspace and pnpm-fronted bootstrap/frozen-bootstrap/generate/format/analyze/test/package/example/CI scripts | Implemented |
| No mandatory KnowMe FFI | No canonical manifest or runtime source depends on KnowMe, flutter_rust_bridge, generated FFI, or a Rust package | Pass |

## Red-to-green implementation probes

1. **Expected task-1 RED:** stable dependencies resolved but Riverpod 2
   `AutoDisposeAsyncNotifier` APIs failed compilation. Generated Riverpod 3
   families replaced them.
2. **Initial-runtime RED:** the first graph fetching notification prematurely
   completed a list provider with an empty value. An initialization gate now
   suppresses graph-driven state writes until the provider's first value is
   ready. The same ProviderContainer probe then passed list, entity, shared
   graph, optimistic patch, save, canonical confirmation, and sync metadata.
3. **Generator RED:** a generic functional change-bridge family generated an
   invalid unconstrained `T` override path. It was replaced with Riverpod's
   supported generic class family; codegen, analyzer, and all existing tests
   returned green without editing generated code.

The disposable runtime probe was removed after execution because task 3 owns
the permanent comprehensive unit/integration/BDD suite.

## Commands observed

| Command | Result |
| --- | --- |
| `pnpm run dart:bootstrap` | Pass; root Dart workspace resolved |
| `pnpm run dart:bootstrap:frozen` | Pass with enforced lockfile |
| `pnpm run dart:generate` | Pass; Riverpod generated source written deterministically |
| `pnpm run dart:format` | Pass; zero files require formatting |
| `pnpm run dart:analyze` | Pass; zero issues with fatal infos/warnings |
| `pnpm run dart:test` | Pass; existing 54 tests |
| disposable generated-provider runtime probe | Pass after initialization correction |
| `pnpm run dart:examples` | Pass; zero package-local examples currently exist |
| `flutter pub publish --dry-run --ignore-warnings` | Payload validation pass; 27 KB candidate with expected dirty-worktree/deleted-lock index warnings |
| `pnpm run validate:release-contract` | Pass; 16 artifacts and updated Dart/Flutter compatibility |
| strict OpenSpec validation | Pass |

## Honest limitations and next ownership

- Existing 54 tests do not cover the new provider/view/CRUD/retry/FFI behavior;
  task 3 must add permanent unit, integration, consumer, and BDD proof.
- The local SDK is Flutter 3.47 beta. Task 5 must repeat frozen resolution,
  codegen, format, analysis, tests, and package validation on the declared
  stable Flutter 3.44+ matrix from a clean source state.
- Pub dry-run still reports the active worktree as modified and the deleted
  package lock as tracked in Git's index. Those warnings disappear only from a
  committed/clean candidate; `--ignore-warnings` was used only to inspect the
  complete payload, never as release certification.
- No rendered UI changed. Runtime logic cannot be truthfully certified by a
  screenshot. Flutter widget/golden/accessibility and Android/iOS visual proof
  remains mandatory under `v3-flutter-riverpod-a2ui-example`.
- The package source version is aligned to 3.0.0, but registry publication and
  installability remain explicitly deferred and unauthorized.

Publication authorized: **no**.
