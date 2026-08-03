---
type: research-addendum
title: Acceptance testing a recoverable 3.0 release-candidate pipeline
date: 2026-08-02
confidence: 0.97
verification_status: verified
feynman_grade: 0.968
misconceptions_absent: 1.0
---

# Acceptance-testing addendum

## Feynman model

A release rehearsal is a fire drill, not a fire. It must prove that every
declared package can be packed, consumed, ordered, recovered, and handed to the
authorized workflow while making the dangerous outcome—public registry
mutation—impossible in the test lane.

That requires three concentric evidence boundaries:

1. **Pure policy and recovery tests** prove manifest derivation, root denial,
   dependency ordering, immutable-version classification, restartable journal
   transitions, OIDC authority, and protected-tag comparison.
2. **Packed consumer tests** prove all twelve exact tarballs with publint,
   Are the Types Wrong, ESM, CommonJS, TypeScript NodeNext, Node16, and Bundler.
   Workspace source aliases are not acceptable consumer evidence.
3. **Workflow contract tests** parse the real workflow and prove Changesets
   version-PR release notes, GitHub attestation permissions, the protected
   `npm-rc` environment, stage-only authority, artifact handoff, and absence of
   long-lived npm tokens or stable-tag promotion.

The visual certificate must be rendered from the machine-readable report. It
is a view of evidence, not an independent claim.

## Skeptic checks

- A passing dry run does not prove npm accepted an upload.
- A GitHub workflow file does not prove the npm trusted-publisher relationship
  or GitHub environment reviewers are configured.
- Provenance proves origin and digest, not functional correctness.
- Mock-only assertions do not prove packed consumers; the verifier must install
  and execute candidate tarballs.
- `skipLibCheck` would hide declaration incompatibility. The Tauri public
  facade therefore structurally contains generated event types while the raw
  generated implementation remains drift-checked.

## Authoritative source refresh

- [npm staged publishing](https://docs.npmjs.com/cli/v11/commands/npm-stage/):
  staging requires an existing package, preserves a unique immutable version,
  and defers human 2FA approval.
- [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/): the
  trusted relationship binds the workflow filename, optional environment, and
  allowed publish actions; stage-only authority is the strongest fit here.
- [GitHub artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations): binary
  attestations require `contents: read`, `id-token: write`, and
  `attestations: write` plus `actions/attest@v4`.
- [Changesets action](https://github.com/changesets/action): versioning and
  publication are separable, and individual actions are recommended when
  tightening trusted-publishing permissions.
- [actionlint](https://github.com/rhysd/actionlint): validates workflow syntax,
  expression types, action inputs, shell scripts, dependency edges, and common
  injection hazards.

## Transfer results

1. **An upstream peer declaration fails NodeNext.** Do not set
   `skipLibCheck`; prevent private upstream implementation types from leaking
   through the package's public declaration surface, then rerun the packed
   consumer.
2. **The release workflow passes locally but npm rejects OIDC.** Treat local
   evidence as intact but publication as unproven; obtain npm organization and
   GitHub environment evidence rather than weakening the authority guard.

Both transfer problems were applied during task 3 and passed. The existing
Feynman grade remains `0.968`, with `misconceptions_absent = 1.0`.
