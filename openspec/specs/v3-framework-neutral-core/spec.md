# v3-framework-neutral-core Specification

## Purpose
TBD - created by archiving change v3-framework-neutral-core. Update Purpose after archive.

## Requirements

### Requirement: Framework-neutral core package

The framework-neutral core package SHALL ingest a successful fetched-list
result through one graph operation that
merges normalized entities, marks their entity and sync lifecycle records
fetched with one timestamp, and applies replace or append list metadata in one
store publication independent of row count. Framework bindings and list adapters
MUST delegate that result ingestion to the shared core behavior rather than
repeating per-row lifecycle writes. GraphQL normalization MUST batch rows by
descriptor, and view-backed pagination MUST update matching base projections in
the same successful ingestion publication.

#### Scenario: Change is ready to archive

- **WHEN** every task in `openspec/changes/fix-atomic-fetched-list-ingestion/tasks.md` is complete
- **THEN** every atomic fetched-list ingestion scenario in this change has reproducible evidence
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are synchronized when affected

#### Scenario: A fetched list replaces an existing result

- **WHEN** a successful replace fetch returns normalized rows and pagination metadata
- **THEN** the graph publishes one successful ingestion update after fetch-start
- **AND** every row, lifecycle record, sync record, list ID, and pagination value matches the existing 3.0 semantics
- **AND** every row in that ingestion shares one explicit batch timestamp, replacing 3.0.2's incidental per-row clock sampling without changing freshness ordering between fetches

#### Scenario: A fetched page appends to an existing result

- **WHEN** a successful append fetch contains existing and new entity IDs
- **THEN** the graph publishes one successful ingestion update after fetch-start
- **AND** merge strategy, stable ID order, deduplication, lifecycle, and pagination semantics remain compatible

#### Scenario: A fetched page updates a view-backed projection

- **WHEN** a GraphQL list or remote view fetch returns multiple normalized rows
- **THEN** matching entities and the affected list or base projection publish as one successful ingestion state
- **AND** filtering, sorting, search, append placement, and fetch completion preserve the existing view semantics

#### Scenario: Publication count is independent of fetched row count

- **WHEN** successful fetches return 1, 12, and 7,248 normalized rows in separate runs
- **THEN** successful ingestion publishes exactly once after fetch-start
- **AND** the success publication count does not grow with row count

#### Scenario: The 3.0.2 negative control is observed

- **WHEN** the same notification-count fixture runs against unmodified 3.0.2 behavior
- **THEN** it observes N+2 successful publications for N rows
- **AND** the command and failing output are retained as negative evidence

#### Scenario: A list fetch fails

- **WHEN** transport, normalization, or ingestion fails
- **THEN** existing error, stale-data, retry, and list-preservation semantics remain unchanged
- **AND** no partial successful ingestion is published
