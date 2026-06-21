# Proposal: createFlintAdapter() — Flint Realtime Fabric integration

> Part of umbrella `v2-0-realtime-fabric-parity` · Change C3 · addresses GAP-1 (CRITICAL) · `library: cand-001` · depends on C1

## Summary

Add `createFlintAdapter()` — a `RealtimeAdapter` that streams Flint Realtime Fabric entity events into the graph and publishes mutations back, via the existing `RealtimeManager`. The named strategic integration.

## Motivation

Flint is the cross-platform (Tauri + web) realtime spine for Prometheus agentic applications. **GAP-1 is a bridge, not a build**: the Flint repo already ships `@prometheusags/frf-entity-management` whose `RealtimeAdapter.watchEntities()` exposes a plain `EntityEvent` (JSON-decoded from the envelope — no proto leak). The unfrozen `proto-v1` risk is contained below this seam, so we build now.

## Library reuse (cand-001)

- **@prometheusags/frf-entity-management** (workspace; ADAPT). Evidence: `sdks/entity-management/src/adapter.ts` — `watchEntities(query): AsyncIterable<EntityEvent>` + `mutateEntity(record)`. `EntityEvent = {entityType, entityId, tenantId, channelId, data, offset: bigint, correlationId?}` maps near-1:1 to our `EntityChange`/`ChangeSet`.
- **@prometheusags/frf-sdk** is NOT on npm → optional peer; published build degrades gracefully.

## Non-goals

- Re-implementing Flint transport, auth, or CRDT sync (lives in the fabric).
- Depending on generated proto/tonic types (consume the EntityEvent facade only).

## Design

- New `src/adapters/flint.ts`: consume `watchEntities()` AsyncIterable → emit our `ChangeSet` to `RealtimeManager` (16ms coalescing reused). Map `mutateEntity()` to optimistic graph writes; conflicts → C1 MergeStrategy.
- `offset` (bigint) ↔ our checkpoint-store resume — mirror the `surreal-live` per-channel checkpoint pattern.
- frf-sdk optional peer; `createFlintAdapter` throws a clear error if absent.

## Success criteria

- [ ] Entity events from Flint land in the graph; all subscribed views update.
- [ ] `mutateEntity` publishes; optimistic write rolls into canonical on confirm.
- [ ] Reconnect resumes from last checkpoint (offset).
- [ ] Published build has no hard frf-sdk dependency.
- [ ] New exports in skills ledger (`verify:skills` green).
