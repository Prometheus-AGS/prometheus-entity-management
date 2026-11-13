## Why

Remaining acceptance scripts authored now (A-9). Review runs **before** the boundary so its fixes do not invalidate receipts. The boundary runs once; a repair reruns, in a new timestamped folder, every scenario whose keyed inputs the repair changed, counted against the repair budget.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 11 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Author `verify:a2ui-v1`, `verify:agui-run-stack` and `verify:a2ui-examples` with their negative controls and report path arguments; a `capture:a2ui-visual` script that writes into the boundary folder with `verify-a2ui-visual-evidence.mjs` retargeted to read it; the TS2835 control consumer and the zod-resolution assertion in `verify-package-contracts.mjs`; and the scratch-copy control for `verify:skills`
- Update `site/docs` and `website/docs` with the 1.0 migration guide, client-only basic catalog, RC-input shim, AG-UI `^1.0.0` and the A2A extension
- Run `pnpm run refresh:exports`, update the skill docs, regenerate the website packed API reference and search index, and make `pnpm run verify:skills` pass
- Add the major changeset for the fixed group and CHANGELOG entries, without tagging or publishing
- Run isolated adversarial review of the cumulative diff and the sycophancy screen, and fix CRITICAL findings before the boundary run
- Run the boundary packet once, rerunning only scenarios affected by a repair, and record receipts in a new dated evidence folder
- Archive the changes whose scenarios passed

## Impact

- Scope: scripts, both doc trees, website API reference, skills, changesets, evidence
- Depends on: 1–10 · Est. L · Complexity Medium · frontier · HIGH
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
