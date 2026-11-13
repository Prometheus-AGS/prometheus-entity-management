## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: G3, G7.

## Decisions

Adopted operator decisions that bind this change: D5 (AG-UI ^1.0.0).

## Open design records

Recorded here during execution, before dependent code: AG-UI 1.0 event, run-outcome and resume[] type map from the installed @ag-ui/core; recorded middleware payload shape; zod peer resolution.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Record: ranges and lockfile (task 4.1, 2026-11-12)

- `@ag-ui/core` peer `^1.0.0` in `entity-graph-core`, `entity-graph-react`, `a2ui-react` (was `>=0.0.30` /
  `>=0.0.59 <0.1.0 || ^1.0.0`); `a2ui-react` dev pin 1.0.4. Root devDependencies for the acceptance flows:
  `@ag-ui/core` 1.0.4, `@ag-ui/client` 1.0.4, `@ag-ui/encoder` 1.0.4, `@ag-ui/a2ui-middleware` **0.0.16**
  (published 2026-11-12, the latest at execution; the contract named 0.0.15), `rxjs` 7.8.1 (the middleware's exact
  peer). Every importer now resolves `@ag-ui/core@1.0.4`; the 0.0.57 resolution is gone (the lab example keeps 1.0.3
  until change 9). `zod` is a non-optional peer of `@ag-ui/core|client|encoder` 1.0.4 (`^3.25.18 || ^4.0.0`),
  satisfied by the workspace's `zod@4.6.7` override.

## Record: AG-UI 1.0 type map (task 4.2, from installed `@ag-ui/core@1.0.4`)

- `EventType`: `TEXT_MESSAGE_START|CONTENT|END|CHUNK`, `TOOL_CALL_START|ARGS|END|CHUNK|RESULT`,
  `STATE_SNAPSHOT|DELTA`, `MESSAGES_SNAPSHOT`, `ACTIVITY_SNAPSHOT|DELTA`, `RAW`, `CUSTOM`,
  `RUN_STARTED|FINISHED|ERROR`, `STEP_STARTED|FINISHED`, `REASONING_START|MESSAGE_START|MESSAGE_CONTENT|
  MESSAGE_END|MESSAGE_CHUNK|END|ENCRYPTED_VALUE`, `SUBAGENT_STARTED|FINISHED|ERROR`.
- `RunFinishedEvent { threadId, runId, result?, outcome?: RunFinishedOutcome, metadata?, timestamp? }`;
  `RunFinishedInterruptOutcome { type: "interrupt", interrupts: Interrupt[] }` (also success and cancelled
  outcomes); `Interrupt { id, reason, message?, toolCallId?, responseSchema?, expiresAt?, subagentRunId?,
  metadata? }`.
- `RunAgentInput { threadId, runId, protocolVersion?, parentRunId?, state?, …, resume?: ResumeEntry[] }`;
  `ResumeEntry { interruptId, status: "resolved" | "cancelled", payload?, metadata? }`.
- Changes 6 and 7 build on these shapes; the outcome fields are still marked Draft in the AG-UI docs.

## Record: real middleware payload (task 4.2 probe, read from the `@ag-ui/a2ui-middleware@0.0.16` build)

- Operations: `ACTIVITY_SNAPSHOT`, `activityType: "a2ui-surface"`, `messageId: "a2ui-surface-<toolCallId>"`
  (or `-<surfaceId>-<toolCallId>`), `replace: true`, `content: { a2ui_operations: [...] }`. **Same convention as
  ours.** Operation `version` follows the catalog: `v0.9` or `1.0` (the middleware exports both
  `A2UI_PROTOCOL_V0_9` and `A2UI_PROTOCOL_V1_0`), so the assessment's "middleware emits only v0.9" is outdated.
- **Lifecycle activities, not `a2ui_recovery`.** 0.0.16 has no `a2ui_recovery` activity type (the assessment's
  research was wrong). Progress and failure travel as `a2ui-surface` activities whose content is
  `{ status: "building" | "retrying" | "failed", progressTokens?, attempt?, maxAttempts?, errors?, error? }` with
  no `a2ui_operations`.
- **Defect found:** our runtime threw `invalid-message` ("omitted content.a2ui_operations") on every lifecycle
  activity, so a real middleware stream would fail on its first progress update.

## Record: adaptation (task 4.3)

- `agui-activity.ts` accepts lifecycle activities (no surface change). A `failed` one is reported once per message
  id as a resync request with the new reason `producer-failed` (public union widened). The remembered ids are capped
  at 256.
- **Contract impact:** UPG-2's oracle names `a2ui_recovery`; the observed mechanism is the lifecycle `failed`
  status. The oracle needs an operator-signed amendment before the boundary run (queued in execution.md).
