# Review feedback for iteration 8

Review the corrected failure path for new defects. Do not repeat findings that
the included files or official evidence disprove.

## Partial stage failure discarded the journal — fixed

`stageReleaseCandidate` now accepts an `onProgress` persistence callback and:

- persists after every confirmed journal transition;
- persists immediately before every mutating `npm stage publish` attempt;
- records the raw stage response before validating it;
- records a conservative `registryMutation: true` once any stage attempt starts;
- returns `status: complete` only after protected-tag validation;
- on error, emits `status: failed` with completed packages, all attempts, the
  last confirmed journal state, protected-tag snapshots, and a safe error
  summary, then rethrows so CI still fails.

The CLI binds `onProgress` to `writeJson(output, progressReport)`, so the report
is rewritten throughout the operation rather than only after successful return.
The workflow's `Preserve the staging recovery journal` step now has
`if: ${{ always() }}`, making artifact upload run after a nonzero stage exit.

RED-first unit and BDD coverage simulates package 1 succeeding and package 2
throwing. It proves the failed report retains package 1 as complete, package 2
as an ambiguous `attempting` mutation, and the last journal state.

## Packet-scope and official-source facts

- `package.json` includes all three `release:rc:*` scripts and is in the packet.
- `.github/workflows/publish.yml` exists and is in the packet.
- GitHub officially supports `artifact-metadata: write`; current actionlint
  validates the workflow.

## Current deterministic result

- Release unit tests: 23/23.
- BDD: 13/13 scenarios, 56/56 steps, 6/6 hooks.
- No live stage or other registry mutation occurred.
