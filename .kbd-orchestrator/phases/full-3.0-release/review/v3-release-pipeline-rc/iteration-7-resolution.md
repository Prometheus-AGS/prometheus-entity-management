# Review feedback for iteration 7

Review the current scoped diff for new defects. Do not infer that an omitted
file is absent from the repository.

## Release scripts exist — packet-scope false positive

The root `package.json` contains all three workflow commands:

```json
"release:rc:plan": "node scripts/release-candidate.mjs plan",
"release:rc:rehearse": "node scripts/release-candidate.mjs rehearse",
"release:rc:stage": "node scripts/release-candidate.mjs stage"
```

The previous packet focused on the corrected mechanism and did not include the
root manifest hunk. The current packet includes `package.json` explicitly. The
real `pnpm run release:rc:plan --source-sha ...` command has also produced the
numbered `3.0.0-rc.1` manifest successfully.

## Previously falsified findings remain false

- `.github/workflows/publish.yml` exists and is included.
- Current GitHub workflow syntax supports `artifact-metadata: write`; current
  actionlint passes the workflow.

## Corrected behaviors remain green

- Unit tests: 22/22.
- BDD: 13/13 scenarios, 55/55 steps, 6/6 hooks.
- Authority-before-read, complete rehearsal proof, relocatable tarballs,
  numbered RC versions, authoritative stage UUID/SRI, and live npm exact-field
  decoding are all covered.
- No registry mutation occurred.
