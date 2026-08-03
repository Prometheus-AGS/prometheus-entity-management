# RC bundle upload excluded the hidden candidate directory

## Symptom

Release rehearsal `30835508418` passed the complete certification gate,
rehearsed all declared artifacts, and created the provenance attestation. The
final `actions/upload-artifact@v7` step then failed with:

`No files were found with the provided path: .release-candidate.`

## Root cause

`actions/upload-artifact@v7` excludes hidden files and directories by default.
The release pipeline deliberately stores its immutable bundle and recovery
journal under `.release-candidate`, but neither upload step enabled hidden-file
inclusion.

## Fix

Set `include-hidden-files: true` on both the candidate-bundle upload and the
staging recovery-journal upload.

## Prevention

The release verifier now requires both upload actions to include the hidden
candidate path. This covers the rehearsal artifact and the same observed path
class in the stage recovery job.
