# Review feedback for iteration 4

Re-review the corrected change and look for new defects. Do not repeat a
finding merely because it appeared in an earlier pass.

## Earlier corrections remain in force

- GitHub's current workflow syntax supports `artifact-metadata: write`; the
  earlier unsupported-key finding was disproved by official GitHub syntax and
  `actions/attest` documentation.
- Rehearsal tarballs are bundle-relative and traversal-safe.
- The fixed npm group is in Changesets RC mode at `3.0.0-rc.1`; alpha and
  unnumbered prereleases fail before candidate planning.

## Incomplete or forged rehearsal accepted — fixed

`validateRehearsalForStaging` at
`scripts/release-candidate-pipeline.mjs:257` now validates the schema, no-mutation
flag, protected tags, source SHA, version, dist-tag, exact order/artifact set,
all seven states and their evidence, tarball paths and SRI, npm dry-run receipts,
native receipts, and embedded-native dispositions. The stage CLI invokes it at
`scripts/release-candidate.mjs:45`, before it constructs adapters or performs a
network command.

RED-first coverage is at
`tests/release/v3-release-pipeline-rc.test.mjs:370` and `:531`.

## Locally fabricated registry verification — fixed

`validateStagedNpmResult` at
`scripts/release-candidate-pipeline.mjs:394` requires the exact package name,
version, rehearsed integrity, and a syntactically valid registry-issued stage
UUID. The state machine records the returned integrity and stage ID with
`authority: npm-stage-publish-response` at line 668; missing or mismatched fields
block before `complete`.

This follows npm 11.16.0's installed implementation:

- `npm/lib/commands/publish.js` assigns `stageId = res.stageId`, adds it to the
  packed `pkgContents`, and emits that object through JSON output.
- `npm/lib/utils/tar.js` computes and includes the tarball's SHA-512 `integrity`
  in `pkgContents`.
- `npm stage publish --json` is therefore the authoritative registry response
  available to an OIDC trust token.
- npm's staged-publishing contract says short-lived trust tokens can run only
  `npm stage publish` and `npm publish`; they cannot run `npm stage view`, so a
  follow-up stage-management lookup in the same OIDC job would be invalid.

The adapter parses the JSON at line 869. RED-first unit coverage is at
`tests/release/v3-release-pipeline-rc.test.mjs:433`; the partial-recovery test
also exercises the state-machine path.

## Current deterministic result

- Release unit tests: 21/21 pass.
- Release BDD: 13/13 scenarios and 53/53 steps pass; 6/6 hooks pass.
- No registry mutation was performed.
