## MODIFIED Requirements

### Requirement: One graph singleton across framework bindings

The 3.0 release SHALL provide one explicit default graph singleton across
framework bindings while keeping React selector hooks and captured imperative
access scoped to the nearest `GraphStoreProvider`. The compatibility imperative
methods attached to the callable React hook SHALL remain default-singleton-only
for 3.x, SHALL be deprecated, and SHALL identify that target through a
development diagnostic instead of implying provider scope.

#### Scenario: Change is ready to archive

- **WHEN** every task in `openspec/changes/fix-scoped-imperative-store-access/tasks.md` is complete
- **THEN** every acceptance criterion for scoped and singleton access has reproducible evidence
- **AND** no mandatory test or documentation lane is silently skipped
- **AND** public API, example, changelog, and migration guidance are synchronized

#### Scenario: React code captures provider-scoped imperative access

- **WHEN** a component or custom hook calls `useGraphStoreApi()` beneath a `GraphStoreProvider`
- **THEN** the returned `GraphStore` is the provider-owned store
- **AND** callbacks that retain that store continue to write to the provider-owned graph
- **AND** the default singleton remains unchanged

#### Scenario: Legacy attached methods expose their singleton target

- **WHEN** development code accesses `getState`, `setState`, `subscribe`, or `getInitialState` through the callable `useGraphStore` compatibility export
- **THEN** the operation continues to target the default singleton for 3.x compatibility
- **AND** a bounded diagnostic identifies the singleton-only behavior and the explicit-store migration path
- **AND** the attached methods are marked deprecated in the TypeScript surface

#### Scenario: Non-React code uses an explicit graph dependency

- **WHEN** module-level infrastructure, an external store action, or server code needs imperative graph access
- **THEN** it receives or creates an explicit `GraphStore`
- **AND** it does not rely on React context or a process-global active-provider pointer
