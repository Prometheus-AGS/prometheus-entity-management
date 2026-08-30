# DevTools mutation event exceeded its configured byte limit

Date: 2026-08-30

## Symptom

The assembled packed-consumer gate configured a 1,024-byte event limit, wrote
200 entities in one graph publication, and observed a serialized mutation event
larger than 1,024 bytes.

## Root cause

The event limiter removed values and binary-searched the `changes` array, but
retained the optional `affectedEntities` and `affectedViewIds` correlation
metadata. A large publication could therefore exceed the limit even when every
semantic change was omitted.

## Fix

When an empty change list still exceeds the configured limit, the limiter now
omits the optional affected-entity/view metadata before retaining the largest
change prefix that fits. The complete packed DevTools integration gate verifies
the serialized event size and all downstream inspection/time-travel/browser
behavior.

## Prevention

Byte-limit acceptance must measure the final JSON-encoded protocol event, not
only individual payload fields. Root CI now runs the packed integration gate
instead of the legacy unit suite.
