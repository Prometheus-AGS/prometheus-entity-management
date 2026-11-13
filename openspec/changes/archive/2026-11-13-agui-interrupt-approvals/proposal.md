## Why

`RUN_FINISHED.outcome` interrupts and `RunAgentInput.resume[]`; approve, deny, edit-before-approve, each decided and audited by the entity action policy. Draft wire mapping isolated in one module.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 7 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Model interrupt outcomes and `resume[]` in the run-stack store, isolating the Draft wire mapping in one module
- Add approve, deny and edit-before-approve to `EntityApproval`, routed through the entity action policy with audited decisions
- Write the `agui-interrupt-approvals` spec

## Impact

- Scope: run-stack store, `EntityApproval`, action policy decisions
- Depends on: 3, 6 · Est. M · Complexity High · frontier · MEDIUM
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
