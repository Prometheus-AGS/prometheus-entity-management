# Decisions

## 2026-08-03 — React graph bindings support explicit store scope

The React package retains its established default graph singleton, but all
React hooks now resolve an optional nearest `GraphStoreProvider`. Next.js uses
an application-owned store created from a request-owned dehydrated snapshot.

Rationale: mutating a module singleton during Server Component rendering leaks
entity state across concurrent requests. A provider preserves compatibility for
existing browser consumers while making the server/client ownership boundary
explicit and testable. Store-specific engine registries prevent equal query
keys in different requests from sharing in-flight work or subscriber state.

## 2026-08-03 — Archive Next.js with queued-flush warning retained

The bounded Next.js change may archive after a cross-model PASS even though a
replaced scoped realtime manager can flush an already-queued batch into its
abandoned old graph before the timer expires.

Rationale: adapter cleanup stops new events, the queued batch cannot cross into
the replacement graph, and KBD classifies warnings as non-blocking. An explicit
`RealtimeManager.dispose()` contract would change the public lifecycle surface
and belongs in the later coordinated prerelease, not as unreviewed expansion of
the completed Next change. The warning remains in the review and verification
artifacts until that follow-up is implemented and tested.

## 2026-08-03 — Isolate official GenUI behind the Flutter example

The Flutter showcase exact-pins `genui 0.10.1` and isolates its API behind an
app-local safe surface adapter. It does not promote GenUI types into
`entity_graph_flutter` or copy KnowMe's product/media widget package.

Rationale: official GenUI owns the maintained A2UI parser and renderer, while
its upstream repository explicitly labels the API highly experimental. The
isolation preserves official protocol ownership without turning that unstable
surface into a Prometheus 3.0 library compatibility promise.

## 2026-08-03 — Adapt shared A2UI semantics at one Flutter wire boundary

The Flutter fixture reuses the shared tenant, entity IDs, surface ID, actions,
and policy outcomes but sends the `v0.9` wire identifier required by official
GenUI 0.10.1. The existing TypeScript fixture remains 0.9.1.

Rationale: relabeling the Flutter stream 0.9.1 would be rejected by the current
official parser; claiming the two byte formats are identical would be false.
The explicit adapter keeps semantic coverage shared and makes the remaining
cross-runtime protocol-version difference inspectable.

## 2026-08-03 — Represent Flutter host evidence as partial

The example coverage contract now supports `partial` showcase status. The
Flutter showcase uses it for host analyzer, test, and golden evidence until the
release-floor SDK and both native integration lanes pass.

Rationale: leaving the showcase planned would discard observed evidence, while
marking it implemented would falsely certify Android/iOS and stable-SDK gates.
A constrained intermediate state keeps evidence inspectable and prevents both
forms of misreporting. The validator rejects partial entries that still have
planned evidence and requires fully complete evidence to use implemented.

## 2026-08-06 — Separate registry snapshots from release-scope decisions

The immutable 3.0 release contract continues to describe which registries are
required or deferred for coordinated stable release. Current external state is
recorded separately in npm and pub.dev registry-status manifests consumed by
README and documentation parity checks.

Rationale: publishing Flutter after its original deferred gate does not rewrite
what that gate authorized. Separate live snapshots preserve history while
preventing source, staged, published, and stable states from being conflated.

## 2026-08-29 — Observe DevTools at the store publication boundary

The v1 core DevTools controller subscribes once to each attached `GraphStore`
and projects semantic entity, patch, fetch-state, sync, and list changes from
the completed Zustand publication. Action call sites are not a second event
source.

Rationale: hydration, rollback, restore, adapter writes, and public direct
`store.setState` calls can bypass individual graph action methods. The store
publication boundary observes all of them without changing graph ownership or
duplicating events. Each store owns its reference-counted controller and
bounded history; values remain metadata-only unless the host explicitly opts
into a redaction policy.

## 2026-08-29 — Keep one controller-owned time-travel snapshot policy

Each attached DevTools controller owns one snapshot ring for its `GraphStore`,
separate from event history but governed by one simultaneous count-and-byte
policy. The defaults retain at most 50 whole snapshots and at most 10 MiB,
evicting the oldest complete snapshots until both ceilings hold. Stable cursor
IDs are never reused, and evicted cursors remain visibly expired.

Rationale: event values may be metadata-only, redacted, or independently
evicted, so event retention cannot safely double as rewind storage. A single
controller-owned snapshot policy removes the legacy second owner, preserves
store isolation and deterministic teardown, and gives React and Flutter one
portable meaning for retention, expiry, rewind, and exact return-to-live.

## 2026-08-29 — React DevTools uses explicit optional entries and Shadow DOM isolation

The React package preserves its ordinary root as a side-effect-free production
surface. The new `./devtools` entry is also side-effect-free and owns the
provider, hooks/view models, explicit host component, and lazy inspector
control. `./devtools/auto` is the only import-time mounting surface and is
declared side-effectful so consumer bundlers do not erase the explicit debug
opt-in. It checks development/host mode before loading the heavy inspector or
touching the DOM and emits no server markup.

The embedded inspector mounts into one open Shadow Root. Its CSS is scoped
inside that root, performs no host reset or remote font request, and consumes
inherited `--pem-devtools-*` overrides with self-contained fallbacks. This
keeps the debug UI visually reliable without contaminating the application and
preserves intentional host theming. The existing lightweight
`useGraphDevTools` root export remains compatible but does not import the new
inspector.

## 2026-08-30 — Route Flutter DevTools through one isolate-wide VM-service registry

The Dart package registers one versioned discovery method and one versioned
command method per isolate, then routes every command through an explicit
active `storeId`. Controllers attach and detach from that registry with their
graph bindings; the VM-service methods remain registered with an empty registry
after the final detach because Dart service-extension registration is
isolate-global and cannot be unregistered.

Rationale: registering methods per graph would collide at the Dart VM-service
boundary, while an implicit default graph would break multi-store isolation.
One inspectable registry supports multiple graphs and deterministic controller
teardown without creating a second owner of business state. Commands cannot
alter the host-owned value/redaction policy.

## 2026-08-30 — Certify Flutter DevTools from outside the VM-service boundary

The Flutter controller acceptance gate launches a real debug application and
uses an external Node client to discover its VM-service URI, subscribe to the
Extension stream, and invoke the production service-extension methods. A
test-only exact-parameter control method drives public graph operations inside
the app; all observations and DevTools commands cross the real serialized
boundary.

Rationale: an in-isolate unit or widget test could call the controller directly
and still leave registration, JSON-RPC routing, Extension events, isolate/store
discovery, payload ceilings, redaction, and teardown unproved. One external
assembled flow covers those boundaries while also mounting the real Riverpod
entity/list providers and avoids multiplying partial suites.

## 2026-08-30 — Separate Dart source version from registry inclusion

The optional DevTools ledger keeps the repository pubspec version for source
API drift but derives publication status from
`release/pubdev-registry-status.json` and its explicit included-public-library
list. The published `3.0.1` archive excludes `devtools.dart`, so the ledger is
machine-marked `repository-source-only` until a later registry snapshot proves
otherwise.

Rationale: source can advance after a registry publication without changing the
manifest version immediately. Encoding both facts prevents a source ledger
from becoming a false pub.dev availability claim and makes later publication
status a checked data transition rather than a remembered code edit.

Before the next pub.dev release, the release-certification phase must add and
pass one ordinary-library assembled Flutter/Riverpod acceptance flow. The
controller acceptance proves the optional debugger path and does not substitute
for the normal graph/provider/transport/rendering release boundary.

## 2026-08-30 — Immutable registry mutation is the final release action

For a pub.dev release, freeze and commit the candidate, run its complete
assembled acceptance, finish artifact-only distinct-model review, build and
validate official extension assets, refresh public ledgers, and pass the
zero-warning dry run before publication. After publication, only registry,
archive, clean hosted-consumer, and documentation verification may remain.

Rationale: publishing Flutter 3.0.2, 3.0.3, and 3.0.4 before the final review
exhausted lifecycle/evidence findings created immutable intermediate versions
and forced 3.0.5. Pub registries cannot replace those archives. Treating
publication as the last mutation makes the reviewed frozen SHA and uploaded
archive the same artifact.

History-import cancellation is candidate-ID-bound and non-destructive. A
mismatched client cannot cancel the pending candidate; repeating a completed
cancellation is a safe no-op; cancellation does not clear retained history.
This preserves multi-client availability without letting one debugger destroy
another client's retained evidence.
