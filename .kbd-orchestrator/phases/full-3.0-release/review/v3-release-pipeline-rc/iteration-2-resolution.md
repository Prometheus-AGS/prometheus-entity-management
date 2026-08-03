# Review feedback for iteration 3

Re-review the corrected change and look for new defects. Do not repeat a
finding merely because it appeared in an earlier pass.

## Permission finding — disproved

The claim that `artifact-metadata: write` is unsupported is false under the
current GitHub Actions permission model. GitHub's official workflow syntax
lists `artifact-metadata: read|write|none`, and the official `actions/attest`
repository explains that the permission creates the artifact storage record.

- https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- https://github.com/actions/attest

Treat the permission as valid. Review whether its use is appropriate, but do
not report it as an unsupported key.

## Cross-job tarball path — fixed

The rehearsal journal now records only `packages/*.tgz`, the stage job resolves
that path under the freshly downloaded candidate bundle, and absolute or
traversal paths fail closed. RED-first unit and Cucumber evidence is retained.

## Alpha accepted as RC — fixed

The fixed npm group is now in Changesets prerelease mode at `3.0.0-rc.1`.
`assertReleaseCandidateVersion` requires `3.0.0-rc.N`; alpha, unnumbered RC,
mixed, and other-channel versions fail before candidate creation. RED-first
unit and Cucumber evidence is retained.
