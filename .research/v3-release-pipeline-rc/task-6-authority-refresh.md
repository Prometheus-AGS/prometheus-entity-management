---
type: research-addendum
title: Archive readiness versus publication authority
date: 2026-08-02
confidence: 0.98
verification_status: verified
sources_count: 6
okf_version: '0.1'
---

# Task 6 authority refresh

## Question

What may the repository truthfully claim when the recoverable RC pipeline is
locally reproducible, but no live registry or repository authority has been
exercised?

## Verified answer

The OpenSpec change may be certified and archived because its bounded contract
is implementation, recovery policy, packed-artifact verification, workflow
structure, and non-mutating rehearsal. It may not claim that any publisher
relationship, environment protection rule, registry credential, version,
provenance record, or public tag exists until the corresponding external system
has accepted and exposed it.

This distinction is required by the current primary sources:

- npm states that trusted-publisher configuration is package-side state and is
  not validated when saved; repository, workflow, and environment mismatches
  may only surface when publishing is attempted. Stage-only authority plus
  token denial is the strongest supported npm boundary, but still requires
  external package configuration and maintainer approval.
- npm staged publishing requires an already-existing package and a maintainer's
  2FA approval before the candidate becomes public. Therefore local rehearsal
  cannot prove live staging, and a new package cannot use staging as its
  bootstrap path.
- GitHub requires `contents: read`, `id-token: write`,
  `attestations: write`, and `actions/attest@v4` for binary provenance. A valid
  workflow proves the intended contract; an actual Actions run and attestation
  are separate evidence.
- pub.dev automated publishing must be enabled by a package uploader or
  publisher administrator, binds an accepted tag pattern, and can bind a
  GitHub environment. The repository cannot prove that account-side setup by
  inspecting YAML.
- Cargo's `--dry-run` performs checks without uploading. A real publish needs
  registry authentication and the registry may apply additional checks after
  upload.

## Claim vector

| Dimension | Current claim | Evidence needed to advance |
| --- | --- | --- |
| RC implementation | Complete | Current unit, BDD, packed-consumer, native, and documentation gates |
| Change evidence | Complete | Hashed final verification and visual disposition |
| OpenSpec archive | Ready after final task and strict validation | All six tasks complete; no unresolved change-scope issue |
| Full 3.0 certification | Pending | Downstream examples, docs, skills, Pages, and immutable release bundle |
| npm authority | Unproven | Package-side trusted-publisher and protected-environment evidence |
| Pub.dev authority | Unproven | Publisher admin/tag/environment configuration and accepted workflow run |
| crates.io authority | Unproven | Owner/token or approved credential-provider evidence |
| Stable publication | Blocked | Separate certification bundle and explicit human authorization |

## Contradiction resolution

There is no contradiction between archiving this OpenSpec change and blocking
publication. Archive means the scoped design and implementation have adequate
evidence. Publication means external systems have accepted irreversible state.
They are independent dimensions and must never be collapsed into one green
status.

## Primary sources

1. [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/)
2. [npm staged publishing](https://docs.npmjs.com/staged-publishing/)
3. [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
4. [pub.dev automated publishing](https://dart.dev/tools/pub/automated-publishing)
5. [Cargo publish command](https://doc.rust-lang.org/cargo/commands/cargo-publish.html)
6. [Publishing on crates.io](https://doc.rust-lang.org/cargo/reference/publishing.html)

