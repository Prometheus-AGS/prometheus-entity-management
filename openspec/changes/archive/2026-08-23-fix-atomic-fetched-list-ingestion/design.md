## Context

See `proposal.md`. In 3.0.2 and current `origin/main`, list success paths call
`upsertEntities`, call `setEntityFetched` once per row, then write list metadata.
Each graph action is its own Zustand `set`; `createGraphTransaction` supplies
rollback semantics but does not batch store publications. The pattern exists in
the core engine, current React list/query hooks, legacy view, GraphQL
normalization/list hooks, and list adapters. View projection subscribers can
also recreate the same row-dependent publication pattern after an otherwise
atomic ingestion.

## Goals / Non-Goals

**Goals:**

- Provide one framework-neutral, atomic success operation for a normalized list page.
- Preserve every existing entity, lifecycle, sync, merge, list, and error semantic.
- Migrate every fetched-list path that currently repeats the N+2 pattern.

**Non-Goals:**

- Batching unrelated realtime events or single-entity CRUD operations.
- Hiding notifications with React memoization.
- Changing transport, query, retry, cancellation, or public result shapes.

## Decisions

### Add one graph-store fetched-list ingestion action

Add a typed `ingestFetchedList` graph action taking entity type, normalized
entries, optional list/projection targets, list metadata, and replace/append mode. Capture one
timestamp before the Zustand `set`, then within that single Immer mutation:

1. merge each entity through its registered merge strategy;
2. update each entity lifecycle record to fetched/non-stale/no-error;
3. update each sync record to server/synced with the same timestamp;
4. replace or append/deduplicate list IDs and update matching view projections;
5. clear list fetch flags/errors/stale state and apply pagination metadata with
   the same timestamp.

Snapshot each repeated ID's pre-ingestion sync origin before any lifecycle
mutation. All merge-strategy invocations for that ID receive the same origin as
the 3.0.2 split sequence, while the completed sync record still becomes the
server-confirmed fetched state.

Keep existing granular actions for single-entity and imperative callers. A
transaction wrapper was rejected because it currently executes those actions
immediately and therefore does not reduce publications.

### Make the core engine the normal ingestion owner

Replace the split writes in core `fetchList` with `ingestFetchedList`. Replace
the equivalent success sequences in `useEntities`, `useEntityQuery`, legacy
`useEntityView`, GraphQL normalization/list hooks, and list-oriented adapters
with the same action. View-backed pagination supplies a projection target so
filter/search/sort and append placement complete inside that action. Bindings that
already delegate to core `fetchList` need only contract verification, not a
second implementation. Single-row realtime events stay on granular actions.

If a framework package must call the primitive directly, export it as part of
the shared graph state/API and include packed ESM, CommonJS, and declaration
consumer evidence. Otherwise keep it on the typed store state without a new
top-level convenience API.

### Count store publications at the vanilla store boundary

Subscribe directly to a fresh graph store, reset the counter after the expected
fetch-start publication, ingest 7,248 rows, and require exactly one success
notification. Assert the complete resulting entity/lifecycle/sync/list state for
replace and append. Run the equivalent fixture against the signed 3.0.2 code and
retain its observed N+2 output as the negative control.

### Release as the next patch in the fixed group

After source and packed-consumer verification, add the repository-standard
changeset for the affected core and React packages. The fixed version group
determines the complete package bump; do not hand-edit only one manifest or move
`latest` during implementation. The expected next release is 3.0.3, subject to
the repository's immutable registry inventory at execution time.

## Risks / Trade-offs

- **Atomic mutation accidentally changes merge timestamps** → Capture one timestamp deliberately and compare complete before/after semantics in focused tests.
- **Append ordering or deduplication drifts** → Reuse the existing append algorithm inside the action and lock repeated-ID cases.
- **One legacy path retains the loop** → Search all production packages for `upsertEntities` followed by `setEntityFetched` and classify every match before closeout.
- **The broad fixed group versions unaffected packages** → Follow the existing release contract and changeset configuration; report the resulting inventory before publishing.
- **Dirty primary checkout loses work** → Perform every upstream edit, test, commit, push, and PR in this isolated `origin/main` worktree.

## Migration Plan

1. Add the core action and focused semantic/publication tests.
2. Migrate the core engine, React hooks/views, and affected adapters one path at a time.
3. Run package-local checks, notification negative/positive controls, and packed consumers when export surface changes.
4. Add the patch changeset only after the fix passes.
5. Commit, push the isolated branch, and open the upstream PR. If safe implementation is blocked, file a GitHub issue with the exact reproduction instead of changing UAR to compensate.
