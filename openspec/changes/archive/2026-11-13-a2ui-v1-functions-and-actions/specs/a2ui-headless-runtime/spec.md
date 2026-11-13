## REMOVED Requirements

### Requirement: Surfaces export losslessly

**Reason**: It requires v1.0 exports to restore `wantResponse` and `responsePath`, which A2UI 1.0 final forbids.
**Migration**: See "Surfaces export losslessly by protocol version".

## ADDED Requirements

### Requirement: Surfaces export losslessly by protocol version

`exportSurfaceMessages(surfaceId, { pruneOrphans? })` SHALL return messages that rebuild the surface in a fresh runtime, and exporting the rebuilt surface again SHALL yield the same messages. A v0.9.1 surface SHALL export as `createSurface`, `updateComponents` and `updateDataModel` at `/`, including its `theme`. A 1.0 surface SHALL export as 1.0 messages without `theme`. An unknown surface SHALL throw `surface-not-found`.

#### Scenario: Export is a fixed point

- **WHEN** a surface is exported, rebuilt and exported again
- **THEN** the two exports are identical

#### Scenario: 1.0 export carries no theme

- **WHEN** a 1.0 surface is exported
- **THEN** no exported message carries `theme`
