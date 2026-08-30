# DevTools long-task gate included pre-stream work

Date: 2026-08-30

## Symptom

After the entity-search starvation fix passed its hosted assertion, the same
packed browser scenario reported two long tasks of 55 ms and 53 ms against the
zero-long-task budget.

## Root cause

The integration fixture registered its `PerformanceObserver` with
`buffered: true` and accepted every delivered entry. On the slower hosted
runner, buffered entries from inspector setup and the pre-stream panel
open/close repetitions were counted even though the performance contract scopes
this metric to the sustained event stream.

## Fix

Capture the stream's monotonic start time before registering the observer and
retain only entries whose `startTime` falls within that window. The zero-long-
task threshold is unchanged.

## Verification

The complete packed DevTools integration passed all four boundaries and six
Chromium scenarios. The 5,000-event stream measured 499.03 events/second,
16.1 ms search p95, zero in-window long tasks over 50 ms, and 500 retained
events.

## Prevention

Every performance observer in an acceptance gate must enforce the same explicit
measurement window described by its metric contract. Buffered browser entries
must never be attributed to a later scenario without checking `startTime`.
