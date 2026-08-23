# Overlapping package-output writers caused a false clean-gate failure

## Symptom

A second full-CI verification attempt failed while packing
`@prometheus-ags/entity-graph-core` because `dist/index.d.ts` was absent from
the tarball, even though the package build normally emits both declaration
forms.

## Root cause (inferred from reproduction)

The second attempt was dispatched before the first high-output child session
had been conclusively closed. Both attempts could clean and rebuild the same
package `dist/` directory. The observed partial tarball is best explained by
overlapping build-output ownership, which violated the repository's
single-writer discipline.

This conclusion is supported by the exact focused build-pack-consumer command
passing after all `pnpm` writers were absent, followed by a serialized complete
CI pass with no source change. It is an inference from those observations; no
package implementation defect was reproduced.

## Correction

- Wait for the underlying execution session, not only its output wrapper, to
  return an exit code.
- Confirm no package writer remains before starting another clean gate.
- Run the complete repository CI gate with one writer and poll that same
  session through completion.

## Prevention

Never start a replacement full-CI run merely because an output transcript was
truncated. Preserve the returned process/session identifier, poll it to a final
exit status, and serialize all commands that clean or write shared package
output directories.
