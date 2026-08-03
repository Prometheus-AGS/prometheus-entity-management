# Review feedback for iteration 5

Re-review the current corrected code and hunt for new defects. Do not repeat
findings already falsified or corrected.

## Missing workflow — packet-scope false positive

`.github/workflows/publish.yml` exists in the repository, is required by the
BDD Given step, and the full tagged BDD suite passes. The previous packet's
generic file-tree filter excluded `.github` because its `.git*` prune pattern
also matches `.github`; that is packet noise, not repository state. The current
packet includes the workflow diff explicitly.

## Authority after registry reads — fixed

`stageReleaseCandidate` now requires `assertStageAuthority` and awaits it as
its first operation, before `snapshotTags`, `lookupNpmVersion`, or `stageNpm`.
`createReleaseCommandAdapters` binds that operation to
`assertRcStageAuthority(manifest, releaseEnvironment)`, which proves GitHub
Actions, the protected `npm-rc` environment, explicit `stage-rc` authority,
OIDC request credentials, absence of long-lived write tokens, protected
`latest`, and exact workflow SHA.

The upload adapter repeats the authority check as defense in depth. RED-first
unit and BDD coverage proves that an authority failure prevents every registry
read even when the exact version would otherwise classify as matching.

## Earlier corrections remain in force

- Complete manifest-consistent rehearsal proof before adapter construction.
- Bundle-relative, traversal-safe candidate tarballs.
- Numbered `3.0.0-rc.N` fixed-group versions only.
- Exact npm stage package/version/SRI and registry-issued stage UUID required.
- `latest` is protected and no publication occurred.

## Current deterministic result

- Release unit tests: 22/22 pass.
- Release BDD: 13/13 scenarios and 54/54 steps pass; 6/6 hooks pass.
- `.github/workflows/publish.yml`: present.
- No registry mutation was performed.
