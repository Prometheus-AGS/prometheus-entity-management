# Task 6 — Independent release-state BDD receipt

## Red first

The new archive-readiness scenario initially failed because
`final-verification.json` and the independent-state visual evidence did not
exist. The retained failure is `task-6-bdd-red.md`: 9 of 10 scenarios passed,
one failed, and the two dependent steps were skipped.

## Initial green result

- Unit contract: 15 of 15 tests pass.
- Cucumber: 10 of 10 scenarios pass.
- Cucumber steps: 41 of 41 pass.
- Hooks: 6 of 6 pass.
- Retries and mandatory skipped lanes: zero.

## Adversarial correction green result

The fresh-context review identified a cross-job absolute tarball path. The
retained second RED receipt is `task-6-adversarial-bdd-red.md`. After the fix:

- Unit contract: 16 of 16 tests pass.
- Cucumber: 11 of 11 scenarios pass.
- Cucumber steps: 45 of 45 pass.
- Hooks: 6 of 6 pass.
- Bundle-relative `packages/*.tgz` relocation and traversal rejection are both
  executed by the regression scenario.

## RC-version correction green result

The second review pass identified that the RC lane still accepted alpha
versions. The retained RED receipt is `task-6-rc-version-bdd-red.md`. After the
Changesets prerelease transition and fail-closed version rule:

- Unit contract: 17 of 17 tests pass.
- Cucumber: 12 of 12 scenarios pass.
- Cucumber steps: 48 of 48 pass.
- All 12 npm manifests are `3.0.0-rc.1`.
- `3.0.0-alpha.0`, unnumbered `3.0.0-rc`, and non-policy prereleases are
  rejected by the RC manifest builder.

## Pnpm forwarding correction green result

The real plan command exposed the literal separator defect recorded in
`task-6-pnpm-forwarding-bdd-red.md`. After removing it from workflow and guide:

- Unit contract: 18 of 18 tests pass.
- Cucumber: 12 of 12 scenarios pass.
- Cucumber steps: 49 of 49 pass.
- The actual `pnpm run release:rc:plan --source-sha ...` command emits a
  `3.0.0-rc.1` manifest.
- Workflow rehearsal and stage invocations forward named flags directly.

## Staging-proof correction green result

The third review pass identified that staging could accept an incomplete or
forged rehearsal and could claim `registry-verified` from local integrity when
the npm stage response omitted authoritative fields. The retained RED receipt
is `task-6-staging-evidence-bdd-red.md`. After the fix:

- Unit contract: 21 of 21 tests pass.
- Cucumber: 13 of 13 scenarios pass.
- Cucumber steps: 53 of 53 pass.
- Hooks: 6 of 6 pass.
- The CLI rejects incomplete rehearsal evidence before any registry command.
- Every absent staged package requires npm's exact package/version, SRI, and
  registry-issued stage UUID before its journal can reach `complete`.

## Stage-authority ordering correction green result

The next review found that authority was checked only inside the upload adapter,
so an all-matching retry could read registry state and complete without proving
the GitHub/OIDC context. The retained RED receipt is
`task-6-stage-authority-bdd-red.md`. After the fix:

- Unit contract: 22 of 22 tests pass.
- Cucumber: 13 of 13 scenarios pass.
- Cucumber steps: 54 of 54 pass.
- Hooks: 6 of 6 pass.
- Authority is the first stage state-machine operation; the regression contract
  proves no tag snapshot, version lookup, or upload runs when authority fails.

## Npm exact-field JSON correction green result

The next review questioned the JSON shape produced by `npm view <name>@<version>
version dist.integrity --json`. A live npm 11.16.0 query confirmed the property
is flat (`"dist.integrity"`). The retained RED receipt is
`task-6-npm-view-shape-bdd-red.md`. After the fix:

- Unit contract: 22 of 22 tests pass.
- Cucumber: 13 of 13 scenarios pass.
- Cucumber steps: 55 of 55 pass.
- Hooks: 6 of 6 pass.
- The adapter decodes npm's live flat field and retains nested-shape
  compatibility before immutable integrity classification.

## Partial-failure journal correction green result

The next review found that the CLI wrote its recovery report only after the
entire staging operation returned, so a failure after a successful package
could discard the restart state. The retained RED receipt is
`task-6-partial-journal-bdd-red.md`. After the fix:

- Unit contract: 23 of 23 tests pass.
- Cucumber: 13 of 13 scenarios pass.
- Cucumber steps: 56 of 56 pass.
- Hooks: 6 of 6 pass.
- Progress is persisted after confirmed transitions and before mutation; a
  failed report retains completed packages and the ambiguous last attempt.
- The workflow uploads the recovery report with `always()` after nonzero exits.

## Npm absence-response correction green result

The critic found that an unpublished exact version could be misclassified as a
hard registry failure when npm emitted `E404` as JSON on stdout or plain text on
stderr. The retained RED receipt is `task-6-npm-absence-shape-bdd-red.md`.
After the fix:

- Unit contract: 24 of 24 tests pass.
- Cucumber: 13 of 13 scenarios pass.
- Cucumber steps: 57 of 57 pass.
- Hooks: 6 of 6 pass.
- Exact-version lookup recognizes structured and human-readable npm absence
  responses while retaining fail-closed behavior for other registry failures.

The final scenario proves that implementation completion, evidence completion,
OpenSpec archive readiness, full-release certification, and publication
authority remain independent. In particular, archiving this bounded change
does not authorize an npm upload, version reservation, dist-tag move, GitHub
Release, or any other public mutation.
