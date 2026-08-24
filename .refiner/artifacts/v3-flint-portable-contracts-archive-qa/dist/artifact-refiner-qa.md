# Artifact-refiner QA — `v3-flint-portable-contracts`

Date: 2026-08-04

Refinement ID: `eab2c50d-ca1e-4046-b26c-eb8c85a0aa3e`

Result: **PASS — 8/8 blocking constraints satisfied**

## Delta first

The implementation had task-local evidence but no cumulative archive artifact.
This pass reconciles the portable default, fail-closed real SDK, immutable
source hashes, security matrix, Forge documentation limits, synchronized
ledgers, clean/remote gates, and independently frozen React/npm boundary.

The first isolated review then exposed two archive-evidence defects. Both
declared outputs are now tracked, and the complete clean/external/remote matrix
has been repeated at cumulative source `5ef6ea3`; no implementation source was
changed by that remediation.

The second isolated review found that matching hashes could still be accepted
from a wrong-revision Git worktree. The verifier now requires each supplied
`HEAD^{commit}` to equal its declared revision before hashing; focused negative
and exact-revision positive checks pass.

The fourth review found that commit identity plus working-tree hashes still did
not prove the committed blobs. The verifier now independently hashes the pinned
Git blob and the working-tree bytes for every file; committed drift, dirty
working trees, wrong revisions, and the exact positive matrix are covered.

The fifth review found the client-secret scan excluded common environment and
configuration files. The sixth then found that generated output directories
were still omitted and Linux/non-home absolute Flint roots evaded the path
rule. The verifier now scans 481 repository-owned text-like source/config and
generated-output files, classifies 250 binaries, enumerates dependency/cache
exclusions, and rejects macOS, Linux, root, Windows-profile, and other absolute
Flint sibling paths. Refreshed remote refs also advanced Forge to
`0135946cec589c1059a9f82ac373c7cb6c12e387`; its newer deployment/JWKS commits
do not alter the four hashed provisioning contract files.

The seventh review correctly found that arbitrary Windows drive-root Flint
paths were not covered. That path form now fails, and a direct
`SUPABASE_SERVICE_ROLE_KEY` env regression proves the generic service-role rule
that was already present; the assignment-specific rule makes the boundary
explicit. The focused suite passes 12/12.

The eighth review found a value-level credential bypass: a service-role JWT
could be mislabeled as a public/anonymous variable. The scanner now decodes
JWT payloads and rejects nested `role`/`roles` claims containing
`service_role`; a misleading `NEXT_PUBLIC_SUPABASE_ANON_KEY` regression passes.
The focused suite now passes 13/13.

The ninth review found two delimiter variants: forward-slash Windows drive
paths and JWT signatures ending in `-`. Drive-root matching now accepts either
separator, and JWT extraction uses explicit base64url lookarounds instead of a
word boundary, including an empty signature segment. The variants are covered
without increasing the focused test count.

The tenth review found the corresponding forward-slash Windows profile form
and a common-prefix assumption in JWT extraction. Profile paths now accept
either separator. JWT candidates are generic compact base64url triplets whose
header and payload must both decode as JSON, so leading whitespace or other
valid header serialization cannot hide a service-role payload.

The eleventh review found the remaining Windows UNC absolute-root form. UNC
paths that lead to a Flint sibling repository now fail, with a direct
`\\server\\share\\flint-gate` regression.

The twelfth review found a delimited string `roles` form. Role strings are now
tokenized on common claim delimiters before exact service-role comparison; the
JWT regression uses `authenticated service_role`.

## Constraint verdicts

| Constraint | Result |
| --- | --- |
| Acceptance has direct evidence and no silent mandatory skip | Pass |
| Portable default and explicitly enabled live lane fail correctly | Pass |
| Realtime contract and immutable external source agree | Pass |
| Issuer, tenant, key, JWKS, role, and secret boundaries fail closed | Pass |
| Forge provisioning guidance is complete without adapter overclaim | Pass |
| Coverage, docs, skills, and public ledgers are synchronized | Pass |
| Clean and remote gates cover the declared candidate | Pass |
| Frozen React RC and broader release limits remain truthful | Pass |

## Boundary

This QA pass permits independent review of the bounded Flint change. It does
not authorize npm publication, `next`/`latest` movement, stable 3.0, an
unimplemented Forge adapter, client service-role credentials, or broader
platform certification.
