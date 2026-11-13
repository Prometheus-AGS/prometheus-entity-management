## REMOVED Requirements

### Requirement: The correlation id and the idempotency id stay separate

**Reason**: Its scenario depends on the RC `wantResponse`/`actionResponse` pair, which A2UI 1.0 final forbids.
**Migration**: See "Protocol correlation ids stay separate from the idempotency id".

## ADDED Requirements

### Requirement: Protocol correlation ids stay separate from the idempotency id

A protocol correlation id carried by an action or a function call (for example a 1.0 `functionCallId`) SHALL be unchanged and SHALL key response matching only. The envelope `actionId` SHALL be the global idempotency id.

#### Scenario: Function call answered after an action

- **WHEN** a 1.0 surface action leads to a `callAgentFunction` whose `agentFunctionResponse` arrives
- **THEN** the response matches by its function call id and the envelope carries a separate UUIDv7
