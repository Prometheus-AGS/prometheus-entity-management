# v3-a2ui-protocol-bridge Specification

## Purpose
TBD - created by archiving change v3-a2ui-protocol-bridge. Update Purpose after archive.

## Requirements

### Requirement: Native A2UI 1.0 bridge with v0.9 compatibility

The release SHALL accept A2UI 1.0 final envelopes (`version: "1.0"`) natively through the official processor's 1.0 adapter and SHALL keep accepting v0.9 and v0.9.1 envelopes. A 1.0 surface SHALL render only against a catalog declared for protocol 1.0. AG-UI `a2ui-surface` activities SHALL be accepted without granting transport input authority.

#### Scenario: A2UI 1.0 surface renders through the official processor

- **WHEN** a valid 1.0 `createSurface` with allow-listed components and data is applied
- **THEN** the runtime renders the surface through the official processor's 1.0 adapter
- **AND** the public input is not mutated
- **AND** unknown catalogs or components fail before partial commit

#### Scenario: Catalog version mismatch is refused

- **WHEN** a 1.0 surface names a catalog declared for v0.9.1
- **THEN** the surface is refused with a catalog error and nothing renders

#### Scenario: AG-UI transports A2UI without bypassing policy

- **WHEN** an AG-UI activity snapshot contains A2UI surface operations
- **THEN** replacement is deterministic by message id
- **AND** operations cross the same schema, catalog, and action-policy gates as direct input

### Requirement: Envelope keys and release-candidate input

Component envelope keys SHALL be accepted in bare and `@`-prefixed form, and a component carrying both forms SHALL be rejected. A2UI 1.0 release-candidate envelopes (`version: "v1.0"`) SHALL be refused unless the application enables the RC-input shim.

#### Scenario: Both key forms on one component

- **WHEN** a component carries both `catalogId` and `@catalogId`
- **THEN** it is rejected and nothing from its batch renders

#### Scenario: RC envelopes need the shim

- **WHEN** a `version: "v1.0"` envelope arrives and the RC-input shim is not enabled
- **THEN** it is refused with a validation error

### Requirement: Processor errors keep their A2UI code

An error the official A2UI processor raises while the runtime applies a call SHALL surface as a `PrometheusA2uiError` with code `protocol-error`, carrying the A2UI error code in `protocolCode` and the original error in `cause`.

#### Scenario: Catalog mismatch reports CATALOG_ERROR

- **WHEN** a 1.0 surface names a catalog declared for v0.9.1
- **THEN** the call fails with `protocol-error` and `protocolCode` `CATALOG_ERROR`, unless this package's own check refuses it first
