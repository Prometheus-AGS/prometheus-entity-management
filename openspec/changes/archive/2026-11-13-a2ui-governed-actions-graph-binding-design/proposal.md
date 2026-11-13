## Why

Design record plus a throwaway spike against `data-reconcile.ts`; nothing merged into packages. No spec delta, so it is archived with `--skip-specs`.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 8 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Write the W5 design: attested approvals through `action.metadata.extensions`, with a threat model
- Write the W6 design: reconciling `updateDataModel`/`sendDataModel` with graph entities under an explicit conflict policy, with spike measurements on a throwaway branch

## Impact

- Scope: design documents; no shipped code, no exports
- Depends on: 3 · Est. S · Complexity Medium · frontier · LOW (enables the next phase)
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
