# v3-devtools-entity-inspection

## Goal

Add transport-independent inspection projections for entity originals, local
patches, merged live values, dirty/error state, rendered views, schema-driven
relationships, and conflict-safe local preview/restore. These contracts feed
the React inspector and Flutter parity implementation without making DevTools a
second source of business truth.

## Production requirements

- Extend the public runtime only through
  `@prometheus-ags/entity-graph-core/devtools`; normal core root imports remain
  free of the optional inspection implementation. A non-root-exported reader of
  the existing CRUD schema registry is the deliberate internal seam used by the
  relationship projector; it adds no root runtime export or second registry.
- Project canonical entity data, local patches, merged live values, fetch/sync
  state, timestamps, typed errors, and explicit dirty reasons per store.
- Register and clean up stable rendered-view identities, list statistics, and
  reverse entity-to-view membership without retaining dead consumers.
- Project schema-defined outgoing and reverse relationships and report missing
  targets explicitly.
- Preview proposed local values through the existing graph patch layer only.
  Restore exactly the prior patch state when the entity has not changed since
  preview; refuse restore with a typed conflict receipt after intervening
  canonical or patch changes.
- Keep all inspection state per `GraphStore`, bounded by the owning controller
  lifecycle, JSON-safe, metadata-first, and transport independent.
- Freeze versioned JSON fixtures usable by both TypeScript/React and
  Dart/Flutter downstream implementations.

## Acceptance boundary

Implement and wire production tasks 1–5 before running tests. Acceptance is one
assembled multi-store core/packed-consumer integration gate covering entity
projection, dirty/original/live values, view membership and cleanup,
relationships and missing targets, preview propagation, exact restore, conflict
refusal, store isolation, and shared fixture parity. Unit, isolated,
mock-backed, snapshot, and partial tests are excluded.

After that gate passes, synchronize public API and skills ledgers,
documentation, fixtures, security/evidence receipts, artifact-refiner output,
and artifact-only isolated adversarial review before verification and archive.

## Prerequisite receipt

`v3-devtools-core-observability` is complete at commit `d6285ef` and archived at
`.kbd-orchestrator/changes/archive/2026-08-29-v3-devtools-core-observability`.
All three active archived tasks are marked complete. Entity inspection extends
that optional per-store controller and does not reopen its accepted protocol,
history, lifecycle, or root-payload isolation work.

The shared v1 conformance corpus is frozen at
`packages/entity-graph-core/fixtures/devtools/entity-inspection-v1.json` with a
byte-identical Dart/Flutter copy under
`packages/entity_graph_flutter/fixtures/devtools/`. Production implementation
must conform to the fixture; fixture changes require an explicit contract
revision rather than silent runtime-specific drift.
