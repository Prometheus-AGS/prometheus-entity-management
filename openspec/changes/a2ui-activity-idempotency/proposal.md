# Proposal: a2ui-activity-idempotency

Phase `phase-v4-a2ui-runtime-hardening` · issue #70 (AG-UI redelivery rolls a surface back and loses input).

## Problem

`processAgUiEvent` (`runtime.ts:272-316`) deletes every surface the same `messageId` ever named, then re-applies only that message. `:295-300` treats every surface mentioned by any of four operation types as "owned", so an updater owns what it updates. There is no digest or version, and `MESSAGES_SNAPSHOT` returns false.

## Design (operator-confirmed: producer wins; absent message leaves surfaces alone)

- Deletion only by explicit `deleteSurface`. `replace:true` restates the producer's statement and applies as updates; `replace:false` stays "ignore if known".
- Ordering key `(surface, epoch, version)` from `content.surfaceVersions`; epoch is an integer the producer raises on every restart (missing means 0); canonical digest only detects a conflict at an equal key (same key, different digest: first kept, producer fault reported). Versionless snapshots dedupe by digest only (documented limitation).
- Strip `createSurface` for held surfaces (`web_core` throws `Surface X already exists`); a restated `catalogId`/`theme`/`sendDataModel` that differs is a producer fault; keep the v1 `clearSurfaceActions` path correct.
- Data model: path `/` replaces the whole model in `web_core`, so the runtime stores the last producer-applied value per path and writes only changed paths; producer wins; `onConflict` reports it.
- Bounded tombstones prevent a redelivered `createSurface` from resurrecting a deleted surface; maps are bounded by the limits from `a2ui-runtime-limits`.
- New `MESSAGES_SNAPSHOT` handler through the same idempotent path; an absent message is untracked and its surfaces are left alone.

## Constraints from existing gates

`tests/steps/v3-a2ui-protocol-bridge.steps.ts` fails if source under `official/`, `react/` or `policy/` contains `JSON.parse`, `jsonl`, `STATE_SNAPSHOT` or `MESSAGE_START`, or if `runtime.ts` contains `getState(`. Use `structuredClone` and sorted-key `JSON.stringify`.

## Behavior change

The legacy "honors replacement" behavior (`official-a2ui.test.tsx:322-376`) changes intentionally. Release as a minor version (4.3.0) with a changelog callout, `deleteSurface` as the migration, and no compatibility flag. The existing assertion is reconciled once at the final boundary in `a2ui-hardening-acceptance#5`, not during implementation. The bridge step also bans `STATE_DELTA` (case-insensitive) in source, so avoid identifiers such as `stateDelta`.

## Acceptance

AUI-1..5, run at the phase's final boundary.
