# Flutter controller task 4 — write instrumentation and view lifecycles

Date: 2026-08-30

## Shared graph-write boundary

All 29 public `EntityGraph` mutation methods now enter one nested-aware `_write`
boundary. The outermost write owns a deduplicated change map, so compound
operations such as optimistic removal, rollback restoration, type invalidation,
and list cleanup publish once for each affected entity or list rather than once
for every nested helper call.

The completed boundary preserves the existing `GraphChange` stream for
Riverpod consumers and adds an opt-in synchronous `GraphPublication` observer
with:

- a monotonically increasing graph publication sequence;
- deduplicated affected entity, removal, list, or reset identities;
- immutable before/after snapshots of entities, patches, entity state, sync
  metadata, lists, and the Dart graph's list-type registry;
- deep copies of entity rows, patches, and list IDs at the publication edge;
- no snapshot projection or copying while there is no publication listener.

Tooling callback exceptions are isolated at the actual observer boundary and
cannot interrupt the production write. The ordinary asynchronous change stream
has exactly one publication site after the outer write completes.

## Riverpod and view lifecycles

The framework-neutral graph now owns typed logical view registrations with
reference tokens, stable definitions, membership, registration/render times,
render count, and active subscriber count. Registrations merge membership for a
shared logical view ID and emit registered, membership-changed, or unregistered
lifecycle records.

Generated `Entity` and `EntityList` Riverpod families register their logical
detail/list views, refresh ID-only membership from the graph projection, and
dispose registrations with the provider. Graph reset now invalidates all three
existing graph subscribers: entity, entity-list, and CRUD edit providers.

The optional DevTools controller subscribes to the framework-neutral view
lifecycle and emits the matching protocol-v1 view event. Normal providers do
not import the optional DevTools library, preserving the package's dependency
and layering boundary.

## Verification level

`dart format` parsed all four changed Dart surfaces. A static boundary audit
confirmed that all 29 public graph mutation methods call `_write`, only the
outer completion function writes to the legacy change stream, publication
snapshots are listener-gated, entity/list providers register and dispose their
views, reset reaches every existing provider subscriber, the controller owns
the view-event bridge, and normal providers contain no DevTools import.
`git diff --check` passed.

No analyzer, compiler, test, or build ran. Semantic value projection,
policy-aware event history, preview, rewind/live restoration, VM service, and
the full assembled integration gate remain tasks 5–8.
