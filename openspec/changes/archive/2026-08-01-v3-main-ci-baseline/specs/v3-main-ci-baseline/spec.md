# Clean current-main installation and CI baseline delta

## ADDED Requirements

### Requirement: Clean current-main installation and CI baseline

The 3.0 release SHALL implement and verify the complete `v3-main-ci-baseline` scope and acceptance criteria defined in `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

#### Scenario: Change is ready to archive

- **WHEN** every task in `openspec/changes/v3-main-ci-baseline/tasks.md` is complete
- **THEN** every acceptance criterion in the plan's `v3-main-ci-baseline` section has reproducible evidence
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are synchronized when affected

