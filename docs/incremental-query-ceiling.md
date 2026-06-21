# Incremental queries: scale ceiling & decision (C7 spike)

> Change C7 of v2.0 · addresses GAP-3 · **DECISION: ship documented ceiling for v2.0; revisit differential dataflow in v2.x**

## The question

The local view evaluator (`src/view/evaluator.ts`) re-derives a list (filter +
sort) on every change — O(n) per update. TanStack DB, by contrast, uses d2ts
(differential dataflow) for sub-millisecond *incremental* query updates at 100k
rows. Should v2.0 adopt incremental query evaluation?

## What we measured

`src/view/evaluator.bench.test.ts` benchmarks the current full re-derivation
(filter `status = "open"` + sort by a numeric field):

| Rows | Full re-derivation (CI-safe budget) |
| ---- | ----------------------------------- |
| 1,000 | < 50 ms (typically ~1 ms) |
| 10,000 | < 250 ms (typically a few ms) |

For the realistic working-set sizes a UI list actually renders (hundreds to a
few thousand rows, virtualized), full re-derivation is **not** the bottleneck.

## Decision

**Do not adopt a differential-dataflow engine in v2.0.** Reasons:

1. **d2ts is pre-production (0.1.x).** Adopting it now couples the library to an
   unstable dependency for a problem most consumers don't have yet.
2. **Integrating differential dataflow under `view/evaluator` is a deep
   architectural change**, not a drop-in — it would dominate v2.0's risk budget.
3. **The realistic ceiling is comfortable.** Lists render virtualized windows
   (the package already ships `@tanstack/react-virtual`); the evaluator operates
   on the full id list, but at the sizes that matter it stays well under a frame.

## Guidance (the v2.0 deliverable)

- **Virtualize large lists.** Use `@tanstack/react-virtual` (already a
  dependency) so render cost is bounded by the viewport, independent of list
  size.
- **Prefer `remote`/`hybrid` completeness modes for very large datasets** so
  filtering/sorting happens server-side and the client holds a page, not the
  whole table.
- **Documented ceiling:** treat ~10k locally-evaluated rows as the comfortable
  upper bound for `local` completeness mode. Beyond that, move to `remote`.

## Revisit trigger (v2.x)

Re-open this spike when **either**:
- d2ts (or TanStack DB's live-query engine) reaches a stable 1.0, **or**
- a real consumer needs `local`-mode filter/sort over >50k rows interactively.

At that point, evaluate an incremental layer behind the existing
`useEntityView` API (so the change is internal, not a breaking API change).

The benchmark in `evaluator.bench.test.ts` is the baseline any future
incremental implementation must beat.
