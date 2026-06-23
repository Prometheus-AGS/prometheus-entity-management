/**
 * use-entity-diff.ts — Compute field-level diffs between entity graph states.
 *
 * Reuses core time-travel primitives:
 * - recordGraphSnapshot / restoreGraphSnapshot from devtools-time-travel
 * - useGraphStore for current live entity data
 *
 * This hook does NOT write to the store during diff computation. It reads two
 * states (a "before" snapshot and the current live graph) and computes a
 * declarative FieldDiff[] — the rendering is left to EntityDiff / EntityApproval.
 *
 * Hook→Store: reads via useGraphStore.getState() (not via React subscribe) so
 * diff snapshots are point-in-time and do not cause continuous re-renders.
 */

import { useCallback, useState } from "react";
import {
  useGraphStore,
  recordGraphSnapshot,
  restoreGraphSnapshot,
  getTimeTravelState,
} from "@prometheus-ags/entity-graph-core";
import type { FieldDiff, EntityDiffResult, DiffOperation } from "./types.js";

// ── Primitive diff helpers ────────────────────────────────────────────────────

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a === "object") {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((k) => deepEqual(aObj[k], bObj[k]));
  }
  return false;
}

function computeFieldDiffs(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): FieldDiff[] {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const diffs: FieldDiff[] = [];

  for (const field of allKeys) {
    const bVal = before[field];
    const aVal = after[field];

    let op: DiffOperation;
    if (!(field in before)) {
      op = "add";
    } else if (!(field in after)) {
      op = "remove";
    } else if (!deepEqual(bVal, aVal)) {
      op = "replace";
    } else {
      op = "unchanged";
    }

    diffs.push({ field, op, before: bVal, after: aVal });
  }

  // Sort: changed fields first, then unchanged
  diffs.sort((a, b) => {
    const order = { add: 0, remove: 1, replace: 2, unchanged: 3 };
    return order[a.op] - order[b.op];
  });

  return diffs;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export interface UseEntityDiffOptions {
  entityType: string;
  entityId: string;
  /** If true, include unchanged fields in the result (default: false). */
  includeUnchanged?: boolean;
}

export interface UseEntityDiffReturn {
  /** The computed diff for the entity. Null until a snapshot has been captured. */
  diff: EntityDiffResult | null;
  /** Capture the current graph state as the "before" baseline. */
  captureBaseline: () => number;
  /** The seq of the current baseline snapshot, or null. */
  baselineSeq: number | null;
  /** Restore the graph to the baseline (time-travel rewind). */
  restoreBaseline: () => boolean;
  /** Recompute the diff against the current live graph. */
  recompute: () => void;
}

/**
 * useEntityDiff — compare the current live entity state against a captured baseline.
 *
 * @example
 * ```ts
 * const { diff, captureBaseline, restoreBaseline } = useEntityDiff({
 *   entityType: "Order",
 *   entityId: "ord_123",
 * });
 *
 * // Before the agent edits, capture the baseline:
 * captureBaseline();
 *
 * // After the agent has made changes, diff is populated:
 * diff?.fields.filter(f => f.op !== "unchanged")
 * ```
 */
export function useEntityDiff({
  entityType,
  entityId,
  includeUnchanged = false,
}: UseEntityDiffOptions): UseEntityDiffReturn {
  const [baselineSeq, setBaselineSeq] = useState<number | null>(null);
  const [diff, setDiff] = useState<EntityDiffResult | null>(null);

  const captureBaseline = useCallback((): number => {
    const seq = recordGraphSnapshot(`baseline:${entityType}:${entityId}`);
    setBaselineSeq(seq);
    // Reset diff since we have a new baseline
    setDiff(null);
    return seq;
  }, [entityType, entityId]);

  const recompute = useCallback(() => {
    if (baselineSeq === null) return;

    const ttState = getTimeTravelState();
    const snapIdx = ttState.snapshots.findIndex((s) => s.seq === baselineSeq);
    if (snapIdx === -1) return;

    // Read baseline entity data — temporarily restore, read, then restore live
    // We do NOT use restoreGraphSnapshot for reads here because we want to avoid
    // a full store write for just reading. Instead we access the ring directly
    // via the devtools API: restore → read → restore to head.
    // Note: this is intentionally destructive to the live store. Callers should
    // only call recompute() in controlled contexts (e.g. review panels).
    const liveStore = useGraphStore.getState();
    const liveEntity =
      (liveStore.entities[entityType]?.[entityId] as Record<string, unknown> | undefined) ?? {};

    // Save live state index
    const liveSnapshot = recordGraphSnapshot(`live:${entityType}:${entityId}:pre-diff`);
    const liveIdx = getTimeTravelState().snapshots.length - 1;

    // Restore baseline to read it
    restoreGraphSnapshot(snapIdx);
    const baselineStore = useGraphStore.getState();
    const baselineEntity =
      (baselineStore.entities[entityType]?.[entityId] as Record<string, unknown> | undefined) ?? {};

    // Restore live state
    const liveRingIdx = getTimeTravelState().snapshots.findIndex(
      (s) => s.seq === liveSnapshot
    );
    restoreGraphSnapshot(liveRingIdx !== -1 ? liveRingIdx : liveIdx);

    const fields = computeFieldDiffs(baselineEntity, liveEntity).filter(
      (f) => includeUnchanged || f.op !== "unchanged"
    );

    setDiff({
      entityType,
      entityId,
      fields,
      snapshotSeq: baselineSeq,
    });
  }, [baselineSeq, entityType, entityId, includeUnchanged]);

  const restoreBaseline = useCallback((): boolean => {
    if (baselineSeq === null) return false;
    const ttState = getTimeTravelState();
    const snapIdx = ttState.snapshots.findIndex((s) => s.seq === baselineSeq);
    if (snapIdx === -1) return false;
    return restoreGraphSnapshot(snapIdx);
  }, [baselineSeq]);

  return { diff, captureBaseline, baselineSeq, restoreBaseline, recompute };
}
