# Verification — `v3-flint-portable-contracts`

Date: 2026-08-04

Implementation commits: `9e8481b` through `5ef6ea3`, based on `342e951`

Verdict: **PASS — IMPLEMENTATION COMPLETE; REVIEW REMEDIATION VERIFIED; FINAL ISOLATED REVIEW AND ARCHIVE PENDING**

## Acceptance matrix

| Plan or OpenSpec criterion | Authoritative evidence | Result |
| --- | --- | --- |
| Default CI contains no machine-specific Flint path or silent success | Checked portable fixture, cross-platform workstation plus Unix/Windows absolute Flint-root scan, 13 Node regressions, 6/20 BDD, and task-2/3/task-6 receipts | Pass |
| Explicit real integration fails if unavailable | Missing-root negative receipt, immutable workflow inputs, exact checkout/build/export checks, and no skip/catch branch | Pass |
| Current watch/mutate contract works through the normalized graph | Portable adapter round trip, exact Git-HEAD equality, pinned-commit blob hashes, independent working-tree hashes for all three roots, and pinned Realtime Fabric SDK 1/1 live round trip | Pass |
| Issuer, tenant, `kid`, JWKS, roles, and key separation are verified | Security fixture, fail-closed drift tests, current Gate hashes, and precise RSA/EC caveat | Pass |
| Client examples never expose service-role credentials | 481 repository-owned text-like source/config and generated-output files including `.env*`, YAML, TOML, native config, `.next`, `build`, `dist`, and `target`; 250 binaries classified separately; dependency/cache exclusions enumerated; name-, assignment-, and decoded-JWT-value service-role rejection regressions | Pass |
| Forge provisioning behavior is documented truthfully | Pinned Forge hashes plus plan/apply/status/DDL, service-role, RLS, audit, and restart guidance; adapter claim explicitly false | Pass |
| Coverage, API, skills, and docs are synchronized | Two implemented coverage entries; 203 React exports and all companion ledgers; human API and skill references | Pass |
| Relevant clean/package/docs/security/platform gates pass | Exact-head serialized full repository CI, packed consumers, strict OpenSpec, actionlint, Node 22/24/26, and Tauri packed-consumer receipt at `5ef6ea3` | Pass |

## Evidence integrity

- External source receipt SHA-256:
  `bb203482164cddc6bfb1d8fb41916a45f81ab3ebde48e7f61d5b5eb33a906f6f`.
- Task-6 revision-and-hash source receipt SHA-256:
  `3b359bd664063886ddf26511866239d621b91f2b65babb26c7fde68c732e8972`.
- Task-4 synchronization receipt SHA-256:
  `a0d94cc36edfe20816699f21d33cf240f316e609b63b520696e635e316ff3131`.
- Task-5 clean receipt SHA-256:
  `30ba1890cbd2eb3b73a41fec9e925d164b569fe29bd2aa944759253963b92bd4`.
- Portable contract fixture SHA-256:
  `b1e2622c45849e9d75fbaba78c615d077d7d8c2ac5190f624ed846b2d5975747`.
- Live workflow SHA-256:
  `022253ef25f4c332cb8d77622abe72e39a6fe1ede0394a2b63c3584ea608094e`.

## Explicit limits

- The portable checked fixture is default-CI evidence, not real SDK execution.
- The live receipt uses one pinned Realtime Fabric source revision; it is not a
  compatibility claim for arbitrary future SDK commits.
- Forge provisioning semantics are verified and documented from pinned source;
  this repository does not implement or claim a Forge adapter.
- Current RSA JWK publication is RFC 7517-compatible; current EC publication
  still lacks standard `crv`, `x`, and `y` coordinates.
- Dart, Cargo, and native platform source did not change in this Flint change;
  their expensive builds are not rerun or claimed.
- Complete skills ecosystem, Docusaurus/Pages, aggregate release
  certification, registry authority, and stable publication remain downstream.

## React-first boundary

Remote `main` remains the frozen React RC source at
`1c40eaa08da210cbe3e20a77c5db211712b5c3a1`. npm remains `latest: 2.2.0` and
`alpha: 3.0.0-alpha.0`, with no `next`. This change does not mutate the fixed
twelve-package version policy or authorize publication.
