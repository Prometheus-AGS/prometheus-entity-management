## Why

`@a2a-js/sdk` 1.0.1 → 1.3.0; official URI and media type; A2UI 1.0 payloads; per-turn capabilities. Review round 1 found `entity-graph-a2a` has no inbound A2UI action path (`handler.ts` applies graph mutations only), so task 4 builds one. The verifier renders received parts through the packed `a2ui-react` headless runtime, because it is a Node script with no browser.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 5 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Map `@a2a-js/sdk` 1.0.1→1.3.0 changes, bump it in `entity-graph-a2a`, and update the SDK pins in the packed-consumer scripts
- Replace the private extension URI and media type with the official ones and carry A2UI 1.0 payloads
- Send and honour per-turn renderer capabilities and omit A2UI parts when the extension is not activated
- Accept inbound A2UI 1.0 action and function messages from clients and route them to an application-owned handler behind a framework-free authorization callback in `entity-graph-a2a` (no dependency on the React package's policy), defaulting to deny
- Update `verify-a2a-conformance.mjs` to build surfaces from received parts with the packed headless runtime and take its report path as an argument, and write the `v3-a2a-conformance-agent` spec delta

## Impact

- Scope: `packages/entity-graph-a2a`, `scripts/verify-a2a-conformance.mjs`, packed-consumer SDK pins
- Depends on: 2, 3 · Est. L · Complexity High · frontier · MEDIUM
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
