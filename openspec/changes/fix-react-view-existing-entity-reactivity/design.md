## Context

See `proposal.md` for motivation. Both React view paths currently subscribe to
an ordered ID projection, then derive item objects through a memo keyed only by
that ID array. The core snapshot reader already caches each merged snapshot by
its base, patch, and sync-metadata references.

## Goals / Non-Goals

**Goals:**

- Make existing-row content changes reactive without changing list membership.
- Preserve stable results when projected snapshots are unchanged.
- Keep the established and replacement React view paths behaviorally aligned.

**Non-Goals:**

- Changing graph storage, transport, list ordering, filtering, or public APIs.
- Adding a consumer-specific refresh or invalidation workaround.
- Publishing or overwriting an immutable npm candidate from this change.

## Decisions

### Subscribe the item projection to cached snapshots

Each view will select its item snapshots from the chosen graph store and use a
shallow result comparator. A changed normalized row produces a new cached
snapshot identity and re-renders the consumer; unrelated state preserves every
snapshot identity and therefore preserves the previous projected array.

Alternative considered: add the entity map to a memo dependency. Rejected
because it exposes store internals outside the selector and would recompute for
every entity type rather than the projected snapshots.

Alternative considered: force a list-ID mutation on every entity update.
Rejected because lists represent membership and order, not row revisions.

### Apply the same correction to both view APIs

The replacement query hook contains the same ID-only projection pattern as the
established view hook. Fixing only the observed consumer path would preserve the
same contract defect in the recommended migration target.

## Risks / Trade-offs

- **[Risk] A selector that creates a new array on every store read can loop.** →
  Compare projected snapshot elements shallowly and rely on the core reader's
  stable identity cache; focused tests cover unchanged IDs plus changed fields,
  and package tests run without render-loop warnings.
- **[Risk] Selecting snapshots could re-render on unrelated graph writes.** →
  Shallow comparison returns the prior result when projected snapshot identities
  are unchanged.

## Migration Plan

1. Release the React-package patch through the existing fixed npm version group.
2. Consumers receive the behavior without API or configuration changes.
3. Roll back by reverting the selector change; no persisted data migration is
   required.
