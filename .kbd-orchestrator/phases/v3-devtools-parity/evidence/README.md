# DevTools parity evidence index

## `v3-devtools-time-travel`

- Implementation and the complete packed-consumer gate are complete.
- A premature implementation-complete helper transition projected this change
  as `COMPLETE`/`DONE` before task 10's review/archive gate finished.
- The signed control plane correctly refused to reopen the terminal change with
  `409 Conflict`; generated projections were not hand-edited.
- Signed plan revision 9 and phase activation revision 341 record the corrective
  course with executable next command `/kbd-apply v3-devtools-time-travel`.
- Canonical runtime state at revision 341 has phase `in_progress` and task 10
  `in_progress`. Legacy `progress.json`/`tasks.md` remain projections of
  revision 338. The authoritative-runtime branch of `kbd-apply end-task`
  intentionally does not rewrite that compatibility ledger, so the lag is an
  observed control-plane projection defect recorded in the phase postmortem.
- `current-waypoint.json` and canonical `prometheus kbd status` are
  authoritative. Signed `end-task` completes canonical task 10 and refreshes
  unified position; it does not claim to repair the legacy phase projection.
- `currentTask: null` is expected after phase-level reactivation at revision
  341: the active path is the phase, while canonical task 10 independently
  remains `in_progress`.
- `position.json` is a mixed revision-341 projection: its waypoint metadata is
  current, but its embedded time-travel change summary retains terminal status
  and 6/10 progress. It is covered by the same projection-lag defect and is not
  authoritative for change/task readiness.
- The change must not be archived on the terminal projection alone. The retained
  clean review verdict and sycophancy result are the gate authority.

Change evidence lives in `v3-devtools-time-travel/`, including the assembled
receipt, security boundary, verification receipt, final review packet, findings,
and finding dispositions.

`.kbd-orchestrator/changes/v3-devtools-time-travel/files.txt` is the
adversarial-review path scope consumed by `build-review-packet.sh`. Directory
entries intentionally include complete small artifacts; it is not an exhaustive
commit-file inventory. Reserved final review paths may be listed before the
gate creates them; the archive guard reports their absence explicitly.
