# RC rehearsal failed because the A2A TCK runtime was absent

## Symptom

The exact-main release rehearsal for commit
`57d3700b4ba0a1f6de8dbe050106b03a0de3321c` failed during `pnpm run ci`.
The first causal error was `spawnSync uv ENOENT` from `scripts/run-a2a-tck.mjs`.
Ten BDD scenarios then failed because the A2A TCK receipt was not produced.

## Root cause

The release workflow installed the pinned `uv` runtime in the `version-pr` job,
but not in the independently provisioned `rehearse` job that executes the A2A
TCK. Job environments are isolated, so the version job's setup could not satisfy
the rehearsal dependency.

## Fix

Install the same pinned `astral-sh/setup-uv` action and `uv` version `0.12.1`
inside the rehearsal job before running the aggregate certification gate.

## Prevention

The release verifier now requires the rehearsal job itself to contain the pinned
`uv` setup. This checks the consumer job rather than accepting the dependency
from another isolated workflow job.
