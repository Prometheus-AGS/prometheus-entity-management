# Proposal: a2ui-versioned-deltas

Phase `phase-v4-a2ui-runtime-hardening` · issue #71 (versioned, incremental A2UI activities). Depends on `a2ui-activity-idempotency`.

## Problem

`processAgUiEvent` handles only `ACTIVITY_SNAPSHOT` (`runtime.ts:276`). A producer updating a long-lived surface must resend cumulative operations (resetting it) or open a new activity per batch. A reconnecting client cannot say which versions it holds, and a refused batch stalls silently.

## Design

- AG-UI 1.0 target: `@ag-ui/core` 1.0.3 dev dependency, peer `>=0.0.59 <0.1.0 || ^1.0.0` (operator-confirmed). Check the legacy 0.0.59 `ag-ui` subpath still typechecks in Gate II.
- `ACTIVITY_DELTA` handler. Version lives in activity `content` (D4, agreed). Accepts RFC 6902 `add` to the operations list and `test` on the held version only; other operations and **deltas without a version are rejected** (agreed). `web_core` has no remove-component, so `remove` cannot be honored.
- Early delta (no held surface) or a gap: bounded buffer wired to the runtime limits, then the host's `onResyncNeeded` callback; `dispose()` clears timers. AG-UI has no resync event, so the request travels in `forwardedProps`.
- `getHeldVersions()` and **one** `forwardedProps` builder module (resync request now; `a2ui-action-ids` adds the action fields) so the wire object has a single builder.
- A runtime refusal of a batch the producer accepted is reported as the A2UI validation error plus a resync request.
- The runtime does not import `@ag-ui/core` (handlers take untyped payloads); the dependency declares 1.0 compatibility and serves the lab example's types.
- Applying operations returned with a stale-action rejection moved to `a2ui-action-ids#5` because it needs `actionId` for correlation.

## Acceptance

AUI-6 and AUI-7 at the phase's final boundary (AUI-14 is owned with `a2ui-action-ids`).
