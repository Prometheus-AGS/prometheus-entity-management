# a2ui-activity-delivery Specification

## Purpose
TBD - created by archiving change a2ui-activity-idempotency. Update Purpose after archive.

## Requirements

### Requirement: AG-UI activity delivery is idempotent

The A2UI runtime SHALL reconcile AG-UI `ACTIVITY_SNAPSHOT` and `MESSAGES_SNAPSHOT` deliveries against the state it holds instead of replaying them. A surface SHALL be deleted only by an explicit `deleteSurface` operation. A redelivered or restated activity, `replace: true` included, SHALL NOT delete or recreate a held surface.

#### Scenario: Duplicate create activity is a no-op

- **WHEN** the producer delivers the same create activity a second time
- **THEN** the held surface and any typed input are unchanged
- **AND** a same-key delivery with different content is reported as a `version-conflict` producer fault and the first is kept

#### Scenario: Restatement never deletes

- **WHEN** an activity with `replace: true` restates a surface and omits components or other surfaces
- **THEN** the restatement is applied to the held surface as updates
- **AND** omitted components and surfaces remain

#### Scenario: MESSAGES_SNAPSHOT replay changes nothing already applied

- **WHEN** a `MESSAGES_SNAPSHOT` replays a thread whose activities are already applied
- **THEN** surfaces and typed input are unchanged
- **AND** a tracked message the snapshot omits is forgotten as a message only and its surfaces stay

#### Scenario: Two streams carry the same activity

- **WHEN** two AG-UI streams deliver the same activity to one runtime
- **THEN** it takes effect once

### Requirement: Per-surface ordering by epoch and version

The runtime SHALL order a surface's activities by `content.surfaceVersions[surfaceId]` carrying an integer `version` and an optional integer `epoch` (default 0). A lower `(epoch, version)` SHALL be ignored, an identical one SHALL be ignored, and a higher one SHALL be applied. An activity touching several surfaces SHALL be decided per surface. A producer that sends no versions SHALL be protected only against identical redelivery of the same message.

#### Scenario: Older and duplicate versions are ignored

- **WHEN** an activity arrives with a version at or below the held version for its surface
- **THEN** it is ignored and the surface is unchanged

#### Scenario: A restarted producer is not mistaken for an old one

- **WHEN** a producer restarts, raises its epoch and numbers versions from 1 again
- **THEN** the higher epoch is applied

### Requirement: Producer wins and typed input survives

The runtime SHALL write only data leaves whose producer value changed since the last producer write, so an unchanged value cannot overwrite what the user typed. When the producer changes a leaf the user also changed, the producer value SHALL win and `onConflict` SHALL report the surface, JSON Pointer path, producer value and prior local value.

#### Scenario: Unchanged producer value keeps typed input

- **WHEN** a redelivery carries the same producer value for a leaf the user edited
- **THEN** the user's value is kept

#### Scenario: Producer change wins and is reported

- **WHEN** the producer changes a leaf the user also changed
- **THEN** the producer value is written
- **AND** `onConflict` receives the conflict

### Requirement: Deleted surfaces stay deleted

The runtime SHALL NOT revive a surface through a redelivered create or update at or below the version that deleted it. Versioned deletions SHALL be remembered up to `maxTombstones`.

#### Scenario: Stale create after delete

- **WHEN** a create at or below the deleting version is redelivered
- **THEN** the surface stays deleted

### Requirement: Surface configuration changes are refused

Restating `createSurface` for a held surface SHALL apply its inline components and data as updates. If it changes the catalog, theme or `sendDataModel`, the runtime SHALL ignore that surface's operations in the activity and report a `surface-config-mismatch` producer fault.

#### Scenario: Catalog change on restatement

- **WHEN** a restated `createSurface` names a different catalog
- **THEN** the surface is unchanged and `surface-config-mismatch` is reported

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
