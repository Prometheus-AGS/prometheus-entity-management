## ADDED Requirements

### Requirement: Resource limits are enforced by default

The runtime SHALL enforce `maxSurfaces`, `maxComponentsPerSurface`, `maxComponentsTotal`, `maxComponentDepth`, `maxDataModelBytes`, `maxComponentBytes`, `maxOperationsPerCall`, `maxCallBytes`, `maxTrackedMessages`, `maxTombstones`, `maxBufferedDeltas` and `bufferTimeoutMs`, with defaults exported as `DEFAULT_PROMETHEUS_A2UI_LIMITS`. Every limit SHALL be a positive safe integer and an unknown limit name SHALL throw at construction.

#### Scenario: Defaults apply without configuration

- **WHEN** a runtime is created with no `limits`
- **THEN** the default limits are enforced

#### Scenario: Invalid limit configuration

- **WHEN** a limit is zero, negative, fractional or unknown
- **THEN** construction throws

### Requirement: An exceeded limit rejects the whole call

When a call would exceed a limit, the runtime SHALL reject it before applying anything, leave every surface unchanged, report the limit name, `max`, `attempted`, `current` (for state limits) and `surfaceId` through `onProducerFault`, and throw a `PrometheusA2uiError` with code `limit-exceeded`. State limits SHALL be measured on the state the call would produce.

#### Scenario: Oversized surface

- **WHEN** a call would push a surface past `maxComponentsPerSurface`
- **THEN** nothing is applied and `limit-exceeded` is thrown and reported

#### Scenario: Oversized component payload

- **WHEN** a call would push a surface's serialized components past `maxComponentBytes`
- **THEN** the call is rejected whole

### Requirement: Limits change at runtime without evicting

`setLimits` SHALL apply to later calls only and SHALL NOT evict held surfaces. When a cap is lowered below what is held, calls that grow that value past the cap SHALL be rejected and calls that shrink it or leave it unchanged SHALL succeed. `getLimitUsage` SHALL report held usage per state limit.

#### Scenario: Recovering under a lowered cap

- **WHEN** `maxSurfaces` is lowered below the surfaces held
- **THEN** creating another surface is rejected and deleting one succeeds

### Requirement: v1 action responses are bounded

A v1.0 `actionResponse` value written to a surface's `responsePath` SHALL be checked against the same limits, and a rejection SHALL be reported through `onProducerFault` without undoing messages already applied.

#### Scenario: Oversized action response

- **WHEN** an action response would exceed `maxDataModelBytes`
- **THEN** the surface is unchanged and a producer fault is reported
