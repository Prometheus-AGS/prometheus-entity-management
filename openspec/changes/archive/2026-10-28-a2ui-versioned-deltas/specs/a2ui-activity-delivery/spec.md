## ADDED Requirements

### Requirement: Versioned ACTIVITY_DELTA

The runtime SHALL accept AG-UI `ACTIVITY_DELTA` events for the `a2ui-surface` activity using only `add` to `/a2ui_operations/-` and `test` on `/surfaceVersions/<surfaceId>/version` (optionally `/epoch`). It SHALL reject any other operation, and any delta touching a surface it names no version for, with `invalid-message`. A delta naming version N SHALL apply on top of held version N and produce N + 1.

#### Scenario: In-order delta applies

- **WHEN** a delta names the held version
- **THEN** it is applied and the surface advances to the next version

#### Scenario: Unsupported patch is rejected

- **WHEN** a delta uses `remove` or names no version for a surface it touches
- **THEN** it is rejected with `invalid-message` and nothing is applied

#### Scenario: Behind delta is ignored

- **WHEN** a delta names a version below the held version
- **THEN** it is ignored

### Requirement: Missing versions are buffered, then resynced

A delta ahead of the held version, or for a surface with no versioned state, SHALL be held in a bounded buffer (`maxBufferedDeltas`, `bufferTimeoutMs`) and applied in order when the missing version arrives. A delta touching several surfaces SHALL wait as a whole until every surface is in order. When the version does not arrive in time, or the buffer overflows, the runtime SHALL call `onResyncNeeded` with its held versions.

#### Scenario: Gap closes

- **WHEN** the missing version arrives before the timeout
- **THEN** the held deltas apply in order

#### Scenario: Gap does not close

- **WHEN** the timeout elapses or the buffer overflows
- **THEN** `onResyncNeeded` is called with reason `gap` or `buffer-overflow` and the held `(epoch, version)` per surface

#### Scenario: Dispose clears pending work

- **WHEN** the runtime is disposed
- **THEN** the buffer and every pending timer are cleared

### Requirement: Refused batches request a resync

When the runtime refuses a batch the producer had accepted, it SHALL report a `batch-refused` producer fault and call `onResyncNeeded` with reason `refused`.

#### Scenario: Disallowed component

- **WHEN** an accepted activity names a component outside the allowlist
- **THEN** the surface keeps its last version, the fault is reported and a resync is requested

### Requirement: Held versions are reportable upstream

The runtime SHALL expose `getHeldVersions()` and `getResyncForwardedProps()`, and `buildA2uiForwardedProps` SHALL shape held versions as `forwardedProps.a2uiResync`.

#### Scenario: Reconnect reports what is held

- **WHEN** a client reconnects
- **THEN** it can send its held `(epoch, version)` per surface in `forwardedProps`
