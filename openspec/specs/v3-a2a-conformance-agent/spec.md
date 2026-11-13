# v3-a2a-conformance-agent Specification

## Purpose
TBD - created by archiving change v3-a2a-conformance-agent. Update Purpose after archive.

## Requirements

### Requirement: A2A conformance and deterministic reference agent

The release SHALL carry A2UI over A2A using the official extension `https://a2ui.org/a2a-extension/a2ui/v1.0`, with DataParts of media type `application/a2ui+json` carrying A2UI 1.0, per-turn renderer capabilities in `message.metadata.a2uiRendererCapabilities`, and no A2UI parts when the extension is not activated. Inbound client A2UI actions SHALL reach an application-owned handler only through an authorization callback that denies by default.

#### Scenario: Official extension exchange

- **WHEN** a client activates the official extension and sends a turn with renderer capabilities
- **THEN** the agent replies with A2UI 1.0 DataParts of media type `application/a2ui+json`
- **AND** a client action sent back is handled only if the authorization callback allows it

#### Scenario: Extension not activated

- **WHEN** a client does not activate the extension
- **THEN** the agent sends no A2UI parts

#### Scenario: Change is ready to archive

- **WHEN** every task in `openspec/changes/v3-a2a-conformance-agent/tasks.md` is complete
- **THEN** every acceptance criterion in the plan's `v3-a2a-conformance-agent` section has reproducible evidence
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are synchronized when affected
