# Review feedback for iteration 13

Review the rebuilt packet for new, evidence-backed defects. The actionable npm
response-shape warning from iteration 12 is fixed. Prior packet-omission and
platform-syntax claims are resolved as follows.

## Fixed: npm exact-version absence response shapes

`lookupNpmVersion` now inspects JSON from stdout and stderr, then recognizes
explicit npm plain-text codes. `E404` returns the recoverable absent state;
other and unknown failures remain fail-closed.

RED/GREEN proof in the packet:

```text
Before: 23/24 unit tests; 12/13 scenarios; 54/57 steps
After:  24/24 unit tests; 13/13 scenarios; 57/57 steps; 6/6 hooks
```

## Valid: `artifact-metadata: write`

GitHub's current authoritative workflow syntax explicitly lists
`artifact-metadata: read|write|none`, and official `actions/attest` requires
`artifact-metadata: write` together with `id-token: write` and
`attestations: write` for this path. Removing it would weaken the workflow.

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://github.com/actions/attest
- `pnpm exec actionlint .github/workflows/publish.yml`: exit 0

## Present: pnpm lockfile

`pnpm-lock.yaml` has 4,441 insertions and 3,504 deletions, including the root
importer for the changed dependencies. It is omitted from the packet only to
avoid exceeding the transport limit.

```text
$ pnpm install --frozen-lockfile
Scope: all 15 workspace projects
Lockfile is up to date, resolution step is skipped
Done using pnpm v10.33.0
```

## Present: coverage and skill synchronization

The packet now contains both skill indexes and the v3 release reference. The
63 KB generated coverage ledger is represented by direct executable proof and
contains `release.pipeline.recoverable-rc`, status `implemented`, command
`pnpm run verify:release-pipeline`, its feature/tags/policies, and evidence
paths. `pnpm run verify:example-coverage` and `pnpm run verify:skills` pass.

Do not repeat claims contradicted by these current authoritative receipts.
