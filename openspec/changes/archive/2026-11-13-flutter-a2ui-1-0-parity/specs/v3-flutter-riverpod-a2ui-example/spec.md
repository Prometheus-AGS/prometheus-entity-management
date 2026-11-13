## REMOVED Requirements

### Requirement: Complete Flutter, Riverpod, and A2UI example

**Reason**: It accepted the A2UI 1.0 release-candidate dialect and translated it to GenUI v0.9; the operator reversed
the Flutter deferral (D7) and chose the official `a2ui_flutter` renderer.

**Migration**: Replaced by "Flutter A2UI 1.0 example" below; the showcase emits A2UI 1.0 final and renders it natively.

## ADDED Requirements

### Requirement: Flutter A2UI 1.0 example

The Flutter showcase SHALL render A2UI 1.0 final surfaces natively through the official `a2ui_flutter` renderer and
`a2ui_core` message processor, with no protocol translation layer. Every user action from a rendered surface SHALL
cross the application-owned Riverpod action policy, which allow-lists components and actions and fails closed.

#### Scenario: Change is ready to archive

- **WHEN** every task in the Flutter/Riverpod/A2UI example change is complete
- **THEN** the Flutter integration acceptance run passes on a booted simulator
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are
  synchronized when affected

#### Scenario: Flutter renders a safe A2UI 1.0 surface

- **WHEN** the showcase agent emits a `version: "1.0"` `createSurface`, components and data model against the 1.0 basic catalog
- **THEN** `A2uiSurface` renders the task-board surface
- **AND** a user action crosses the Riverpod policy and produces a receipt before any graph mutation

#### Scenario: Flutter rejects unsafe input atomically

- **WHEN** a surface requests an unknown catalog, component, function, or action
- **THEN** no surface is rendered
- **AND** no graph mutation occurs
