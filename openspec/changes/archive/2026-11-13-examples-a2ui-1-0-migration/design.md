## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: G12 example inventory; goal 1 ("every example that uses it").

## Decisions

Adopted operator decisions that bind this change: D7 (Flutter out of scope; spec amended).

## Open design records

Recorded here during execution, before dependent code: Pre-migration envelope recordings per example, digested, for UPG-14's negative control.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Record: implementation (tasks 9.1–9.4, 2026-11-12)

Executed by an Agent-tool worker on profile I (`claude-sonnet-5-5`), result reviewed by the driver.

- **Pre-migration recordings** (UPG-14 negative control), recorded before any edit at `a8f543dc`:
  `tests/fixtures/a2ui-1-0-migration/pre-migration/{agentic-a2ui-app,agentic-a2ui,agui-activity-lab}.json` with
  `manifest.json` (sha256 `9c6681d0…`, `4fd9cbbf…`, `b45227cf…`; the driver re-hashed all three and they match).
  The lab producer holds no scenario, so its envelopes were dumped from `server/events.ts` builders with
  components from the legacy browser spec's helper (both sources listed in the manifest).
- **agentic-a2ui-app:** fixtures renamed to `*.1.0.json` (1.0 version, 1.0 catalog, `@path`); producers use `@path`;
  `runtime.ts` uses `PROMETHEUS_A2UI_V1_PROTOCOL_VERSION`; the A2A client drops the v0.9.1 check and wrapper parsing,
  reads parts with `extractA2UIMessages`, and sends `a2uiRendererCapabilities` on every user message; the example's
  own executor publishes A2UI only when `offersA2UICatalog(...)`; `@a2a-js/sdk` 1.3.0.
- **agentic-a2ui:** builders use the 1.0 constants and `@path` (including action-context bindings); the A2A client
  always attaches capabilities (a minimal 1.0 entry when none is passed); `@a2a-js/sdk` 1.3.0. Its legacy golden
  file was rewritten to the new builder output (a legacy artifact; not cited as evidence).
- **agui-activity-lab:** `server/events.ts` emits `"1.0"` envelopes against the 1.0 catalog (string literals kept so
  the Node producer does not import the React package); `@ag-ui/core` 1.0.4.
- **9.4** spec deltas (`v3-agentic-a2ui-example`, `v3-flutter-riverpod-a2ui-example`) validated.
- **Open (not tasked):** `tests/browser/v4-a2ui-runtime-hardening.spec.ts` (legacy, previous phase) still posts RC
  and bare `{path}` envelopes to the lab and has an RC "AUI-9" case; it is not in this phase's boundary packet and
  is left as a legacy artifact. The `agent-server.ts` external-executor path is unchanged; whether
  `createExternalA2AExecutor` forwards message metadata (capabilities) to a remote agent is unverified.
  `examples/coverage.json` prose still says v0.9.1 (change 11 docs sync).

**Note (2026-11-12, amendment 3).** The `v3-flutter-riverpod-a2ui-example` deferral delta written by 9.4 was moved
to change `flutter-a2ui-1-0-parity` and replaced by the 1.0 parity requirement, after the operator reversed D7.

**Execution finding (2026-11-12).** Three 1.0 producers sent Text `variant: "h2"`, which the 1.0 basic catalog
(enum `caption`/`body`) and therefore `PROMETHEUS_A2UI_V1_CATALOG_ID` do not allow:
`agentic-a2ui-app` `fixtures/task-review.1.0.json` and `reference-surfaces.ts`, and `agentic-a2ui`
`src/agent/surface-messages.ts`. The variant was removed (headings render as body text). Found while reviewing the
Flutter migration; not yet exercised.
