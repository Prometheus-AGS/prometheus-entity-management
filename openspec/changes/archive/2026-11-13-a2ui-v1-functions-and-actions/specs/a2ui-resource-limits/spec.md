## REMOVED Requirements

### Requirement: v1 action responses are bounded

**Reason**: A2UI 1.0 final forbids response-aware actions (`wantResponse`/`responsePath`), so RC `actionResponse` writes no longer exist outside the opt-in RC shim.
**Migration**: An agent's answer arrives as a 1.0 `agentFunctionResponse` to the runtime's `callAgentFunction` and is bounded by the requirement "Function responses are bounded".

## ADDED Requirements

### Requirement: Function responses are bounded

An agent's answer to `callAgentFunction` that the runtime writes into a surface's data model (`writeTo`, and RC response-aware actions through the opt-in shim) SHALL be checked against the same limits, and a rejection SHALL be reported through `onProducerFault` without failing the call that produced it.

#### Scenario: Oversized function response

- **WHEN** a function response would exceed `maxDataModelBytes`
- **THEN** the surface is unchanged and a producer fault is reported
