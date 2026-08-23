# RC stage rejected setup-node v6 dummy token

Date: 2026-08-05

## Symptom

Protected RC staging run `30976967778` stopped with `long-lived npm write tokens
are forbidden` before any npm registry mutation.

## Root cause

The stage job used `actions/setup-node@v6` with `registry-url`. That action
exported its dummy `NODE_AUTH_TOKEN` fallback even though the release lane uses
npm trusted publishing through GitHub OIDC. The release guard intentionally
rejects `NODE_AUTH_TOKEN` and `NPM_TOKEN`, so it treated the dummy value exactly
like a prohibited long-lived token.

## Fix

The stage job now uses `actions/setup-node@v7`, which removed the v6 dummy-token
fallback. The OIDC and protected-environment requirements remain unchanged. A
cross-run reuse path lets a retry download the already-certified immutable
candidate rather than rerunning the full rehearsal.

The reuse path verifies the selected run and SHA as one authority: current
repository, `publish.yml`, completed workflow-dispatch run, successful
`rehearse` job, and an unexpired SHA-named candidate artifact. Partial input
sets fall back entirely to the current run and cannot mix sources.

## Prevention

Release verification now asserts the setup-node major, atomic reuse expressions,
source-run proof, successful rehearsal proof, and live artifact proof. Focused
tests, BDD, actionlint, full local package-contract verification, and isolated
adversarial review gate changes to this boundary.
