# DevTools search starvation under sustained graph events

Date: 2026-08-30

## Symptom

The packed Node 24 browser integration failed twice on GitHub Actions while
processing 5,000 semantic events over ten seconds. Five browser scenarios and
all packed core, inspection, and time-travel boundaries passed, but entity
search p95 measured 438.7 ms and 431.5 ms against the 100 ms budget.

## Root cause

The inspector filtered entities with a `useDeferredValue` search query. The
continuous graph-model updates repeatedly interrupted the deferred render on
the hosted runner, delaying the visible filtered result. The entity filter was
already recomputed for every model update, so deferring the search value did
not remove work from the hot path.

## Fix

Normalize and apply the current search value synchronously when filtering the
entity projection. This preserves the same filtering behavior while ensuring
explicit operator input wins over background graph activity.

## Verification

The complete packed DevTools integration passed all four boundaries and all six
Chromium scenarios. Under the same stream, search p95 measured 11.2 ms,
throughput measured 499.14 events/second, no inspector long task exceeded 50 ms,
and retained history remained capped at 500 events.

## Prevention

Do not defer small inspector control-state projections that must preempt a
continuous telemetry stream. Keep the end-to-end search latency assertion in
the packed browser gate; do not replace it with isolated render timing.
