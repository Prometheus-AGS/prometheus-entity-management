## ADDED Requirements

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
