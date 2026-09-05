# Proposal: C6-react-table-v9 — react-table v8 to v9 migration

**Phase:** pem-refresh-3-3-0 (child of web-ui-architecture, prior-auth repo)
**Depends on:** C2
**Recommended agent:** typescript-reviewer
**Model class:** frontier

## Why

Required by the `pem-refresh-3-3-0` plan. The authoritative scope, tasks,
verification commands and acceptance criteria are in the **C6-react-table-v9** section of:

`/Users/gqadonis/Projects/TribeHealth/kevin/prior-auth/.kbd-orchestrator/phases/web-ui-architecture/children/pem-refresh-3-3-0/plan.md`

That plan is the source of truth. Do not restate it here — read it.

## What changes

- Implement exactly the tasks listed for C6-react-table-v9 in that plan section.
- Run that section's Verify block and record observed output, not intent.
- Preserve the repository's normalized graph, ID-only list, layered I/O,
  pnpm-only, and skills-to-code synchronization rules.
- Do not widen scope: this phase does not touch the consuming application,
  `prometheus-entity-sync`, or open `>=` peer floors lacking a named failure.

## Acceptance

Every command in the plan section's Verify block runs and passes, with the
observed output recorded. A check that could not run is reported as
unverified — never as passing.
