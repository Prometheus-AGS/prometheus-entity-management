# Entity inspection verification receipt

Date: 2026-08-29

## Implemented boundary

- Optional `@prometheus-ags/entity-graph-core/devtools` entity records with
  distinct canonical, patch, and merged values; dirty reasons; fetch/sync
  metadata; typed errors; revisions; and rendered-view membership.
- Controller-owned stable view registration, token-scoped cleanup, list
  statistics, lifecycle events, and bidirectional membership.
- Deterministic `belongsTo`, reverse `hasMany`, and `manyToMany` relationship
  projections from the existing CRUD schema registry, including missing-target
  edges and merged local foreign-key values.
- Local patch preview with exact prior-patch receipts, live graph propagation,
  atomic restore, and canonical/patch conflict refusal.
- Versioned, published inspection fixture with a byte-identical Flutter source
  copy.
- Public package guide, changelog, skills reference, API table, and runtime
  export ledger synchronized to the implemented surface.

## Full integration evidence

Command: `pnpm run verify:devtools-entity-inspection`

Result: pass on the first run after the complete production path was wired.
After adversarial review exposed a composite identity collision, the assembled
gate was expanded to cover that case. Its first corrective rerun caught a
missed view-membership lookup in the initial fix; that lookup was corrected and
the complete packed gate then passed with the expanded scenario.

Authoritative machine receipt:
`task-9-packed-acceptance.json`.

The gate assembled and packed the real core package, installed it into a
temporary consumer, and passed:

- ESM, CommonJS, and strict NodeNext TypeScript consumers.
- Package payload/manifest and published fixture import.
- Entity projection and dirty original/live-value semantics.
- View membership/cleanup and list statistics.
- Relationships and explicit missing targets.
- Preview propagation, exact restore, and metadata-only restore.
- Patch and canonical conflict refusal.
- Multi-store isolation and value-policy enforcement.
- Collision-free controller identities for distinct `(type, id)` pairs whose
  colon-joined display keys would otherwise match.
- Fetch/sync-only publications increment the same collision-free entity
  revisions without creating phantom records for colon-bearing entity types.
- Fail-closed preview conflict refusal after an intentionally unprojectable
  store publication.

All 16 scenario statuses equal `pass`. No unit, component, isolated,
mock-backed, snapshot, or partial test was created or run.

## Shared fixture

Both source copies are byte-identical:

`d07ecda2402b801889b4bf7b6bac5f92eb8434d3db3883b16bfa2d15eb1176ab`

- `packages/entity-graph-core/fixtures/devtools/entity-inspection-v1.json`
- `packages/entity_graph_flutter/fixtures/devtools/entity-inspection-v1.json`

## Scope limit

This receipt proves only the framework-neutral entity-inspection change. It
does not prove controller-owned time travel, the React inspector/FAB, Flutter
controller parity, either extension, documentation-site scenarios, performance
budgets, release certification, registry publication, or store submission.
