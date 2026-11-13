## Why

Before each migration, the task records the example's current envelope stream (from its producer module or activity stream, since two examples produce in the browser) as a digested fixture; UPG-14's negative control runs its assertion against those recordings.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 9 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Migrate `examples/agentic-a2ui-app` producers, fixtures and A2A client to A2UI 1.0 and `@a2a-js/sdk` 1.3.0, after recording its pre-migration envelope stream as a digested fixture
- Migrate `examples/agentic-a2ui` producers and A2A client to A2UI 1.0 and `@a2a-js/sdk` 1.3.0, after recording its pre-migration envelope stream as a digested fixture
- Migrate `examples/agui-activity-lab` producers to A2UI 1.0 and AG-UI 1.0.4, after recording its pre-migration envelope stream as a digested fixture
- Write spec deltas for `v3-agentic-a2ui-example` and `v3-flutter-riverpod-a2ui-example`

## Impact

- Scope: `examples/agentic-a2ui-app`, `examples/agentic-a2ui`, `examples/agui-activity-lab`, Flutter spec text
- Depends on: 2, 3, 4, 5, 6 · Est. M · Complexity Medium · medium · HIGH
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
