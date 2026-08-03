# Task 6 final-gate correction — pnpm forwarding RED receipt

The first real `pnpm run release:rc:plan -- ...` execution proved that pnpm
10.33.0 forwards the standalone `--` to `release-candidate.mjs`, whose strict
named-argument parser correctly rejects it.

- Direct command: failed with `invalid argument sequence`.
- Unit: 18 tests, 17 pass, 1 fails on the workflow/guide separator contract.
- Cucumber: 12 scenarios, 11 pass, 1 fails.
- Cucumber steps: 49 total, 48 pass, 1 fails.

The same literal separator existed in both mutating workflow paths, so this was
a runnable-pipeline defect rather than a documentation-only typo.
