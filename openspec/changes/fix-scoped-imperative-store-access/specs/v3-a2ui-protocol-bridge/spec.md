## MODIFIED Requirements

### Requirement: Official A2UI graph bridge and honest AG-UI boundary

The 3.0 release SHALL accept strict A2UI 1.0 release-candidate envelopes while
using the currently published official renderer engines through explicit
compatibility adapters. React SHALL support single-message surface creation,
response-aware actions, app-owned function calls, and AG-UI 0.0.59
`a2ui-surface` activity snapshots without granting transport input authority.

#### Scenario: Change is ready to archive

- **WHEN** every task in `openspec/changes/fix-scoped-imperative-store-access/tasks.md` is complete
- **THEN** focused React, Flutter, AG-UI, package, and documentation checks pass
- **AND** public contracts describe compatibility versus native conformance accurately

#### Scenario: A2UI 1.0-RC surface renders through the maintained engine

- **WHEN** a valid v1.0 `createSurface` embeds allowlisted components and data
- **THEN** the runtime renders the surface through the official processor
- **AND** the public input is not mutated
- **AND** unknown catalogs or components fail before partial commit

#### Scenario: Response-aware actions remain application-owned

- **WHEN** an allowlisted v1.0 action requests a response
- **THEN** the application policy authorizes and executes it first
- **AND** the renderer-to-agent message carries an explicit action id
- **AND** a matching action response updates only its declared response path

#### Scenario: AG-UI transports A2UI without bypassing policy

- **WHEN** an AG-UI 0.0.59 activity snapshot contains A2UI surface operations
- **THEN** replacement is deterministic by message id
- **AND** operations cross the same schema, catalog, and action-policy gates as direct input
