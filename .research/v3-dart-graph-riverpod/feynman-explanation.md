# Feynman explanation — one graph, Riverpod 3 bindings

## Explain it simply

Imagine the entity graph as a library catalog. Every book has one catalog card, and reading lists contain only card numbers. If a title changes on the one card, every reading list immediately shows the new title.

Riverpod is the librarian and notification desk. A provider family answers “show me card 42,” watches that card, and tells the interested screen when it changes. It may ask a transport to fetch or save the book record. It must not photocopy card 42 into its own filing cabinet, because two catalogs would eventually disagree. Rust/FFI, HTTP, GraphQL, and local fixtures are delivery trucks; no truck becomes the catalog.

That is why the existing Dart graph stays canonical. The KnowMe code teaches useful librarian routines—families, CRUD controllers, views, and no-retry rules—but its FFI cabinet cannot be copied as the new owner.

## Why the dependency answer is deletion, not another pin

The package menu says it serves Freezed and JSON-generated models, but the kitchen never uses those ingredients. The newest Riverpod generator needs analyzer 13; stable Freezed needs analyzer below 11. Forcing both means choosing a prerelease ingredient or freezing Riverpod on an older toolchain. Removing unused ingredients is smaller, more stable, and more truthful.

The original disposable experiment proved the migration boundary on Flutter beta: once unused generators were removed, dependency resolution completed and compilation stopped at `AutoDisposeAsyncNotifier`, the old Riverpod 2 API. Task 5 later tested the promised stable floor and narrowed the versions to the exact compatible set described below.

## Retry in plain language

Riverpod 3 automatically asks again after a provider fails. That is helpful when Wi-Fi blips. It is harmful when the server says “you do not have permission,” “this entity does not exist,” or “the data is invalid.” Repeating a terminal error wastes battery, floods logs, and can loop forever. The provider layer therefore needs two lanes:

- transient errors: retry a bounded number of times with delay;
- terminal errors: return `null` from the retry policy and stop.

## Teach the skeptic

**“Why not let every provider own the entity it fetched?”** Because cross-view reactivity is the product's central guarantee. If a table provider, detail provider, and edit provider each own copies, one successful save cannot update all three without manual synchronization. Selecting one graph record preserves the guarantee automatically.

**“Why remove Freezed if it is modern and popular?”** Popularity is not evidence of use. There are no Freezed annotations or generated model parts in the canonical package. Keeping an unused generator forces an impossible stable analyzer intersection and expands the release surface without a feature.

**“The beta SDK resolved it. Why require stable again?”** Resolution on a beta is a diagnostic. A stable release promise must be reproducible on the declared production channel; otherwise consumers inherit an undocumented preview dependency.

**“Why not make KnowMe FFI mandatory since it already works?”** That would exclude web, pure Dart, test, and non-Rust consumers and violate the planned transport-neutral core. FFI can be a delivery option without owning the catalog.

## Transfer checks

1. If a GraphQL provider fetches entity 42 and an FFI subscription later updates it, both must write through the same graph upsert path; the provider reads the merged graph value.
2. If a list contains `[42, 84]`, it keeps those IDs. An optimistic edit patches entity 42 once, so the list and detail family both render it immediately.
3. If an HTTP timeout occurs, bounded retry is reasonable. If the transport reports validation failure, retry stops immediately.
4. If a future Freezed version becomes analyzer-compatible, that alone is not a reason to add it back. A concrete model/codegen requirement must exist first.

## Self-grade

- Correctly separates graph, provider, and transport ownership: pass.
- Explains analyzer conflict and why deletion is the stable choice: pass.
- Covers terminal and transient retry behavior: pass.
- Handles skeptical objections and transfer cases: pass.
- Grade: 0.95.

## Declared-surface transfer — the occupancy map

After the building is constructed, an occupancy map must name every public door
and must not draw rooms that do not exist. The Dart barrel plus its generated
Riverpod part are the building. `dart-library-exports.json` is the mechanically
checked map: 81 public declarations, each tied to its source. Package and agent
guides explain which doors ordinary consumers should use.

The same honesty applies to evidence. Two goldens show that one optimistic name
appears in both list and detail cards. They do not show navigation, Android,
iOS, accessibility, offline persistence, or event batching. Keeping those
coverage entries open is not underselling the work; it prevents a library test
from being mistaken for a complete product certification.

## Stable-floor correction — test the key in the promised lock

A dependency set that resolves on Flutter beta is like a key tested in the
locksmith's newest prototype, not in the lock installed at the customer's door.
Task 5 tested the official Flutter 3.44.8 stable archive and found that the
Riverpod 3.4.2 generator line expects newer analyzer and test pins. The newest
key that actually turns the promised lock is Riverpod 3.3.2 with annotations
4.0.3, generator 4.0.4, and build_runner 2.15.1. Runtime dependencies use
narrow ranges below the incompatible minor, while generators stay exact so a
routine resolution cannot silently return to the beta-only combination.

The rule transfers cleanly: either certify dependencies on the declared oldest
supported stable SDK, or raise the declared floor. Never use a newer beta's
successful resolution as proof that the current stable floor is supported.

## Archive transfer — one inspected room is not the whole city

The library is now an inspected building: its catalog, librarians, delivery
interfaces, rollback behavior, stable toolchain, package payload, and two
small rendered rooms have direct receipts. Archiving that building permit is
correct. Declaring the whole city open would not be: the complete Flutter app,
Android/iOS devices, accessibility, docs site, registry authority, immutable
cross-ecosystem release SHA, and stable promotion each have separate owners.

That distinction is the final transfer test. “Pass to archive” means this
bounded library promise is proved and can unblock downstream construction. It
does not mean “publish 3.0 everywhere.”
