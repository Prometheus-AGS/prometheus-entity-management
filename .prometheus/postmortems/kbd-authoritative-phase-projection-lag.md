# KBD authoritative-runtime phase projection lag

Date: 2026-08-29

## Symptom

During `v3-devtools-time-travel` task 10, canonical runtime revision 341
reported task 10 `in_progress` and the executable next command
`/kbd-apply v3-devtools-time-travel`, while phase `progress.json` and
`tasks.md` remained projections of revision 338. Those legacy files showed
the change terminally complete, only 6 of 10 tasks counted, and a cancelled
targeted-test task as next work.

`position.json` was regenerated at revision 341, but its embedded change
summary still retained terminal status and 6/10 progress. Only its waypoint
metadata was current.

## Root cause

The implementation-complete helper transitioned the change to terminal
`Complete` before evidence/review/archive finished. The signed runtime then
correctly rejected reopening that terminal change with `409 Conflict`.
Separately, installed `kbd-apply` function `sync_progress` returns
immediately when `kbd_runtime_authoritative` is true because the compatibility
ledger must not be edited in place. Phase activation refreshed the unified
waypoint and position to revision 341 but did not regenerate phase-level legacy
projections.

## Operational handling

- Do not hand-edit generated phase projections.
- Treat `current-waypoint.json` and canonical `prometheus kbd status` as
  authoritative.
- Do not use the embedded `position.json` change summary for readiness while
  this defect is present.
- Complete canonical task 10 through signed `kbd-apply end-task` only after
  isolated review and strict anti-sycophancy pass.
- Verify and archive from canonical state and retained evidence, not from the
  stale compatibility ledger.
- Preserve the mismatch in the evidence index and correction receipt.

## Prevention

The KBD implementation-complete helper must not terminally complete a change
whose evidence, review, or archive task remains in progress. The authoritative
runtime projection path also needs one signed regeneration mechanism for
phase-level compatibility files; until that exists, callers must never claim
that `end-task` repairs those legacy files.
