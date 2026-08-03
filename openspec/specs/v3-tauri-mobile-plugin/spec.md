# Tauri desktop/mobile plugin contract

## Purpose

Define the stable implementation and evidence boundary for the Prometheus
entity-graph Tauri plugin across desktop, Android, and iOS hosts.

## Requirements

### Requirement: Complete Tauri desktop/mobile plugin contract

The 3.0 release SHALL implement and verify the complete
`v3-tauri-mobile-plugin` scope and acceptance criteria defined in
`.kbd-orchestrator/phases/full-3.0-release/plan.md`.

#### Scenario: Change is ready to archive

- **WHEN** every task in the `v3-tauri-mobile-plugin` OpenSpec change is complete
- **THEN** every acceptance criterion in the plan's `v3-tauri-mobile-plugin` section has reproducible evidence
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are synchronized when affected
