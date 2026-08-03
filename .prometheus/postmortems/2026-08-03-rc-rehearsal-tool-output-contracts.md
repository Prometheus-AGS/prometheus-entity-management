# RC rehearsal assumed synthetic package-manager output

Date: 2026-08-03

## Symptom

The first immutable `3.0.0-rc.1` rehearsal stopped while packing
`@prometheus-ags/entity-graph-core` because pnpm did not return an `integrity`
field. After that was corrected, the rehearsal reached the Rust CLI dry run and
failed with `release command returned an empty receipt`.

## Root cause

The release adapter tests modeled output that the real tools do not produce.
pnpm 10.33 returns the tarball filename and file inventory from `pack --json`,
but not an SRI value. Cargo writes successful `publish --dry-run` diagnostics
to stderr while leaving stdout empty. The adapter required the synthetic pnpm
field and read only Cargo stdout.

## Fix

- Compute SHA-512 SRI from the exact generated tarball when pnpm does not
  provide integrity.
- Preserve both stdout and stderr when recording a Cargo dry-run receipt.
- Add regression tests using the observed pnpm and Cargo channel shapes.

## Prevention

Release command adapters must be tested against captured shapes from the pinned
tool versions, including which output channel owns the receipt. The protected
rehearsal remains mandatory before any RC staging action.
