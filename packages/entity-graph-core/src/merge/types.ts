/**
 * merge/types.ts — Pluggable conflict-resolution seam for the entity graph.
 *
 * Why a port (not a hard-wired engine):
 * - The graph receives concurrent writes from multiple sources — realtime
 *   adapters (Flint, Supabase, Surreal), AG-UI agents, and optimistic local
 *   mutations. The default resolution is last-write-wins (LWW), matching the
 *   historical shallow-merge in `upsertEntity`.
 * - Collaborative / agentic multi-writer scenarios need stronger guarantees
 *   (CRDT). But the *engine* (Loro vs Automerge vs Yjs) is a downstream
 *   decision — and the Flint fabric's own CRDT choice is still open. Encoding
 *   the decision as a swappable `MergeStrategy` keeps that open decision from
 *   blocking this layer.
 *
 * One strategy is registered per entity type (or a global default). The graph
 * consults it at write time; absent a registration it falls back to LWW, so
 * existing behavior is byte-for-byte preserved.
 */

import type { EntityType, EntityId, SyncOrigin } from "../graph";

/** Context handed to a {@link MergeStrategy} for one write. */
export interface MergeContext {
  /** Entity kind being written. */
  type: EntityType;
  /** Entity id being written. */
  id: EntityId;
  /** Provenance of the incoming write (server / client / optimistic). */
  origin: SyncOrigin;
  /** Wall-clock ms of the incoming write, when the caller knows it. */
  updatedAt: number | null;
}

/**
 * Resolves the next canonical entity value from the previous value and an
 * incoming partial/full write.
 *
 * Contract:
 * - MUST be pure (no side effects, no graph access) — the graph applies the
 *   returned value inside its Immer producer.
 * - MUST return a NEW object; never mutate `prev` or `next` (immutability rule).
 * - `prev` is `undefined` on first write for an id.
 *
 * @param prev - Current canonical value, or undefined if none exists yet.
 * @param next - Incoming write (partial for upsert, full for replace).
 * @param ctx  - Type/id/origin/timestamp metadata for this write.
 * @returns The merged canonical value to store.
 */
export type MergeStrategy = (
  prev: Record<string, unknown> | undefined,
  next: Record<string, unknown>,
  ctx: MergeContext,
) => Record<string, unknown>;
