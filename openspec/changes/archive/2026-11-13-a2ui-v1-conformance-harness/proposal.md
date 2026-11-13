## Why

Acceptance infrastructure, so it is authored after production work (A-9). Framework-adapter tier only (`core/adapter_conformance.yaml`, `core/accessibility.yaml`) at a pinned upstream commit, driving the built renderer in Chromium. This change alone owns `verify:a2ui-conformance`.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 10 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Pin the upstream conformance suite at a recorded commit with per-file content digests
- Build the framework-adapter harness from the upstream implementation guide, driving the built `a2ui-react` in Chromium
- Add the `verify:a2ui-conformance` script with a mutated-case negative control and a report path argument, and write the `a2ui-v1-conformance` spec

## Impact

- Scope: harness directory, `verify:a2ui-conformance` script, spec
- Depends on: 1–7, 9 (all production work) · Est. M · Complexity Medium · frontier · HIGH
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
