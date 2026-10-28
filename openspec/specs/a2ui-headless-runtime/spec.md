# a2ui-headless-runtime Specification

## Purpose
TBD - created by archiving change a2ui-headless-export. Update Purpose after archive.

## Requirements

### Requirement: A React-free headless entry applies the same validation

`@prometheus-ags/a2ui-react/headless` SHALL provide a runtime that shares one core with the React runtime and builds its catalog with the same function from the same default allowlists, so the allowlist, limits, schema checks, ordering rules and all-or-nothing batches are the same code. Nothing it imports SHALL reach `@a2ui/react` or React at run time.

#### Scenario: Headless and React runtimes agree

- **WHEN** the same messages are processed by both runtimes
- **THEN** both accept or both reject them with the same error code

#### Scenario: No React in the headless graph

- **WHEN** the headless entry is loaded in Node
- **THEN** it loads without React or DOM globals

### Requirement: Surfaces export losslessly

`exportSurfaceMessages(surfaceId, { pruneOrphans? })` SHALL return messages that rebuild the surface in a fresh runtime, and exporting the rebuilt surface again SHALL yield the same messages. A v0.9.1 surface SHALL export as `createSurface`, `updateComponents` and `updateDataModel` at `/`. A v1.0 surface SHALL export as one inline `createSurface` with `wantResponse` and `responsePath` restored. An unknown surface SHALL throw `surface-not-found`.

#### Scenario: Export is a fixed point

- **WHEN** a surface is exported, rebuilt and exported again
- **THEN** the two exports are identical

#### Scenario: v1 action metadata survives

- **WHEN** a v1.0 surface with `wantResponse` and `responsePath` actions is exported
- **THEN** each action carries them again in the export

### Requirement: Orphans are pruned and reported

The export SHALL treat the component with id `root` as the anchor, omit components no reachable component refers to unless `pruneOrphans: false`, and list them in `orphans`. A surface without a `root` component SHALL prune nothing and report no orphans.

#### Scenario: Unreachable component

- **WHEN** a component is no longer referenced from the root
- **THEN** it is omitted from the export and listed in `orphans`
