# a2ui-1-0-migration Specification

## Purpose
Moves the published packages, examples and docs from A2UI 0.9 to the A2UI 1.0 protocol and records how a consumer migrates, including the 5.0.0 release, the acceptance scenarios and the evidence that proves them.

## Requirements

### Requirement: The A2UI 1.0 release documents its migration

The release that moves to A2UI 1.0 SHALL be a major version of the fixed package group and SHALL document migration from the 1.0 release candidate and `@a2ui` 0.12.0, including the client-only rendering of the basic catalog, the opt-in RC-input shim, AG-UI `^1.0.0` peers and the official A2A extension.

#### Scenario: Migration guide present

- **WHEN** the release documentation is built
- **THEN** both documentation trees contain the migration guide with each of those topics
