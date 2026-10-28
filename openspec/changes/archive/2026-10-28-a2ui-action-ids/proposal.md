# Proposal: a2ui-action-ids

Phase `phase-v4-a2ui-runtime-hardening` · issue #72. Depends on `a2ui-versioned-deltas` (held versions and the shared builder).

## Problem

The A2UI v0.9.1 client action has no id. `runtime.ts:128,366` mints `surface:component:++actionSequence` only for v1 `wantResponse` actions, per runtime instance, so two tabs or a reload collide and a server cannot make action handling idempotent.

## Design (operator-confirmed)

- `actionId`: a UUIDv7 (RFC 9562), small inline implementation, **no new dependency**, created once per interaction.
- Location: `forwardedProps.a2uiAction.actionId` with `heldVersion` beside it. The raw A2UI v0.9.1 action object is not modified.
- The existing v1 correlation id inside the action stays as is and keys `pendingActions`. Two ids, two jobs: correlation (v1 response matching, per runtime instance) and idempotency (`actionId`, global).
- "Retry reuses the id" holds only if the runtime owns the retry, so a runtime `retryAction(actionId)` is added; a host resending on its own mints a new id.
- Envelope builder extends the single module from `a2ui-versioned-deltas#4`, attaching the data model from `getClientDataModel()` when the surface sets `sendDataModel` (v0.9.1 and v1).
- **Emission (Claude decision, pending operator confirmation):** today `forwardV1Action` (`runtime.ts:157-158,362`) runs only for v1 actions after an `executed` policy decision, so a v0.9.1 action never produces an envelope. The runtime will emit it for executed actions of both versions and never for policy-denied ones, so a denied action cannot leave the runtime (trust boundary: the action policy).
- Operations returned with a stale-action rejection are applied here (moved from `a2ui-versioned-deltas`) because correlation needs `actionId`; the wire shape is decided in task 5 and recorded.

## Out of scope

Server-side arbitration of duplicate actions (UAR's side).

## Acceptance

AUI-8, AUI-9 and AUI-14 at the phase's final boundary.
