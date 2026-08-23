# v3-nextjs-app-router-example Specification

## Purpose
Certify the Next.js App Router integration across per-request server graph
ownership, server preload and serialization, client hydration, route lifecycle,
mutation, realtime takeover, and packed-package production/browser execution.

## Requirements

### Requirement: Next.js SSR, RSC, and hydration showcase

The 3.0 release SHALL implement and verify the complete `v3-nextjs-app-router-example` scope and acceptance criteria defined in `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

#### Scenario: Change is ready to archive

- **WHEN** every task in `openspec/changes/archive/2026-08-03-v3-nextjs-app-router-example/tasks.md` is complete
- **THEN** every acceptance criterion in the plan's `v3-nextjs-app-router-example` section has reproducible evidence
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are synchronized when affected
