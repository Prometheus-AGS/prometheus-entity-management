## MODIFIED Requirements

### Requirement: Complete Flutter, Riverpod, and A2UI example

The Flutter showcase SHALL accept and validate A2UI 1.0 release-candidate
surface envelopes, then normalize them at an explicit compatibility boundary
to the currently published GenUI v0.9 renderer. The boundary SHALL retain the
component/action allowlist and reject an invalid batch before rendering.

#### Scenario: Change is ready to archive

- **WHEN** every task in the Flutter/Riverpod/A2UI example change is complete
- **THEN** focused validation, widget, and documentation checks pass
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are synchronized when affected

#### Scenario: Flutter renders a safe A2UI 1.0-RC surface

- **WHEN** a v1.0 `createSurface` embeds the registered components and data model
- **THEN** the validator emits the equivalent GenUI v0.9 message sequence
- **AND** RC-only action response metadata is removed only at that renderer boundary
- **AND** user intent still crosses the application-owned Riverpod policy

#### Scenario: Flutter rejects unsafe RC input atomically

- **WHEN** a v1.0 surface requests an unknown catalog, component, function, or action
- **THEN** no surface is rendered
- **AND** no graph mutation occurs
