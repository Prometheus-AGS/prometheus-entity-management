# Review feedback for iteration 6

Review the current corrected code for new defects. Do not repeat findings that
official sources or executable evidence disprove.

## `artifact-metadata: write` is supported — do not repeat

The unsupported-permission claim has now been returned twice and is false.
GitHub's current official workflow-syntax permission list explicitly includes:

```text
artifact-metadata: read|write|none
attestations: read|write|none
```

Official sources:

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://github.com/actions/attest

The installed current `actionlint` also validates
`.github/workflows/publish.yml` with `artifact-metadata: write` without error.
The permission is used by `actions/attest@v4` to create the artifact metadata
storage record. Treat this key as supported.

## Flat npm exact-field response — fixed

A live npm 11.16.0 public-registry query confirmed:

```json
{
  "version": "3.0.0-alpha.0",
  "dist.integrity": "sha512-..."
}
```

`lookupNpmVersion` now reads
`registry.dist?.integrity ?? registry["dist.integrity"]`. The changed adapter
test uses the live flat shape, and the BDD contract separately exercises it.
The retained RED receipt proves the old implementation returned
`integrity: undefined` before the one-line correction.

## All earlier corrections remain in force

- The workflow exists and is included in the packet.
- Authority is verified before every stage-path registry read.
- Rehearsal proof is complete and manifest-consistent.
- Candidate paths are bundle-relative and traversal-safe.
- Fixed-group candidates must be numbered `3.0.0-rc.N`.
- Absent staging requires exact package/version/SRI and registry stage UUID.
- `latest` remains protected; no registry mutation occurred.

## Current deterministic result

- Release unit tests: 22/22 pass.
- Release BDD: 13/13 scenarios, 55/55 steps, 6/6 hooks.
- `actionlint .github/workflows/publish.yml`: pass.
- No registry mutation was performed.
