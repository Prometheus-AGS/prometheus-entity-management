# v3-agentic-a2ui-example Specification

## Purpose

Define and certify a keyless React/Vite example that composes the official A2A
task lifecycle with official A2UI surfaces, application-owned action authority,
and one normalized entity graph without broadening package or publication claims.

## Requirements
### Requirement: Safe end-to-end agentic A2UI example

The 3.0 release SHALL implement and verify the complete `v3-agentic-a2ui-example` scope and acceptance criteria defined in `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

#### Scenario: Agentic A2UI example is release evidence

- **WHEN** `pnpm run verify:agentic-a2ui` passes from its deletion-aware clean state
- **THEN** every acceptance criterion in the plan's `v3-agentic-a2ui-example` section has reproducible evidence
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are synchronized when affected
