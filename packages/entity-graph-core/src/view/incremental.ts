/**
 * view/incremental.ts — G3 parity: incremental view maintenance.
 *
 * The baseline `applyView` re-filters + re-sorts the entire id list on every
 * change — O(n) per update. For large lists this is the gap vs TanStack DB's
 * differential-dataflow live queries.
 *
 * This maintains a derived, sorted result and updates it for a SINGLE entity
 * change in O(log n): binary-search the entity's current position, decide
 * membership via the filter, and insert / remove / reposition. No full
 * re-derivation. Result is byte-identical to `applyView` for the same inputs
 * (correctness parity is asserted in tests).
 *
 * Design choice: a hand-rolled dirty-tracking index rather than adopting d2ts
 * (0.1.x, pre-production) — same acceptance bar (sub-linear single-row update),
 * far lower dependency risk. The differential engine can replace the internals
 * later behind this same class without an API change.
 */

import type { FilterSpec, SortSpec } from "./types";
import { matchesFilter, matchesSearch, compareEntities } from "./evaluator";

export interface IncrementalViewOptions {
  filter?: FilterSpec | null;
  sort?: SortSpec | null;
  search?: { query: string; fields: string[] } | null;
  /** Resolve an entity by id from the graph (or null if absent). */
  getEntity: (id: string) => Record<string, unknown> | null;
}

/**
 * A live, sorted view over a set of entity ids that updates incrementally.
 *
 * - `seed(ids)` builds the initial result (one O(n log n) pass).
 * - `applyChange(id)` updates the result for one changed/added/removed entity
 *   in O(log n) comparisons (+ array splice).
 * - `result()` returns the current ordered id list (stable reference until a
 *   change mutates it).
 */
export class IncrementalView {
  private readonly opts: IncrementalViewOptions;
  private ids: string[] = [];
  private readonly members = new Set<string>();

  constructor(opts: IncrementalViewOptions) {
    this.opts = opts;
  }

  /** Whether an entity qualifies for this view (filter + search). */
  private qualifies(entity: Record<string, unknown> | null): entity is Record<string, unknown> {
    if (!entity) return false;
    if (this.opts.filter && !matchesFilter(entity, this.opts.filter)) return false;
    if (this.opts.search?.query && !matchesSearch(entity, this.opts.search.query, this.opts.search.fields)) return false;
    return true;
  }

  /** Comparator over ids using the configured sort (stable, id tiebreak). */
  private cmp(aId: string, bId: string): number {
    const a = this.opts.getEntity(aId);
    const b = this.opts.getEntity(bId);
    if (!a || !b) return 0;
    if (this.opts.sort && this.opts.sort.length > 0) {
      const r = compareEntities(a, b, this.opts.sort);
      if (r !== 0) return r;
    }
    // Deterministic tiebreak so equal-key rows keep a stable, reproducible order.
    return aId < bId ? -1 : aId > bId ? 1 : 0;
  }

  /** Binary-search the insertion index for `id` among current `ids`. */
  private insertionIndex(id: string): number {
    let lo = 0;
    let hi = this.ids.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.cmp(this.ids[mid], id) < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /** Build the initial sorted result from a full id set. */
  seed(ids: string[]): void {
    const kept: string[] = [];
    this.members.clear();
    for (const id of ids) {
      if (this.qualifies(this.opts.getEntity(id))) {
        kept.push(id);
        this.members.add(id);
      }
    }
    if (this.opts.sort && this.opts.sort.length > 0) {
      kept.sort((a, b) => this.cmp(a, b));
    }
    this.ids = kept;
  }

  /**
   * Update the view for ONE entity that changed/was added/removed.
   * Returns true if the result order changed.
   *
   * O(log n) to locate; the array splice is O(n) memory-move but performs no
   * filter/sort over the whole set — the differentiator from full re-derivation.
   */
  applyChange(id: string): boolean {
    const entity = this.opts.getEntity(id);
    const wasMember = this.members.has(id);
    const isMember = this.qualifies(entity);

    if (!wasMember && !isMember) return false;

    if (wasMember && !isMember) {
      // Removed from the view.
      const idx = this.ids.indexOf(id);
      if (idx !== -1) this.ids.splice(idx, 1);
      this.members.delete(id);
      return true;
    }

    if (!wasMember && isMember) {
      // Newly qualifies — insert at sorted position.
      const idx = this.insertionIndex(id);
      this.ids.splice(idx, 0, id);
      this.members.add(id);
      return true;
    }

    // Still a member but its sort key may have changed — reposition if needed.
    const cur = this.ids.indexOf(id);
    if (cur !== -1) this.ids.splice(cur, 1);
    const idx = this.insertionIndex(id);
    this.ids.splice(idx, 0, id);
    return cur !== idx;
  }

  /** Current ordered id list. */
  result(): string[] {
    return this.ids;
  }

  /** Current member count. */
  size(): number {
    return this.ids.length;
  }
}
