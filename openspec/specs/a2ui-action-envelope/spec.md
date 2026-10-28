# a2ui-action-envelope Specification

## Purpose
TBD - created by archiving change a2ui-action-ids. Update Purpose after archive.

## Requirements

### Requirement: Executed actions carry a globally unique idempotency id

For every action the action policy executed, on v0.9.1 and v1.0 surfaces, the runtime SHALL call `onActionEnvelope` with `forwardedProps.a2uiAction` containing the unmodified `userAction`, an `actionId` that is a UUIDv7 minted once per interaction, the `heldVersion` of the surface when it fired (absent without versioned state), and the client data model only when the surface sets `sendDataModel`. A policy-denied action SHALL NOT produce an envelope.

#### Scenario: Distinct ids across contexts

- **WHEN** two tabs, or one tab before and after a reload, fire actions
- **THEN** their `actionId` values differ

#### Scenario: Envelope fidelity

- **WHEN** an executed action fires
- **THEN** `userAction` is exactly what the renderer produced
- **AND** `actionId` is a valid UUIDv7 and `heldVersion` matches the held version

#### Scenario: Denied action never leaves the runtime

- **WHEN** the policy denies an action
- **THEN** no envelope is emitted

### Requirement: The correlation id and the idempotency id stay separate

The v1.0 correlation `actionId` inside an action SHALL be unchanged and SHALL key response matching only. The envelope `actionId` SHALL be the global idempotency id.

#### Scenario: v1 wantResponse action

- **WHEN** a v1.0 `wantResponse` action fires
- **THEN** the correlation id still matches its `actionResponse` and the envelope carries a separate UUIDv7

### Requirement: Retry reuses the id

`retryAction(actionId)` SHALL resend the original envelope under the same id with its original `heldVersion` and data model, and SHALL return `false` for an unknown id (the last 100 envelopes are retained) or when no handler is installed.

#### Scenario: Retry after a failed send

- **WHEN** a host retries an action
- **THEN** the resent envelope has the same `actionId`

### Requirement: Stale-action rejections repair the surface

`applyStaleActionRejection` SHALL apply the returned `a2ui_operations` and `surfaceVersions` through the same ordering and limits as any activity, so a repeated rejection changes nothing. A rejection carrying no operations SHALL call `onResyncNeeded` with reason `stale-action`.

#### Scenario: Rejection with operations

- **WHEN** a server rejects an action as stale and returns operations
- **THEN** the surface advances to the returned versions

#### Scenario: Rejection without operations

- **WHEN** the rejection carries no operations
- **THEN** a resync is requested with reason `stale-action`
