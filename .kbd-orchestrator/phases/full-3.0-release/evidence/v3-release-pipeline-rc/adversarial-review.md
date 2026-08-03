# Adversarial review — `v3-release-pipeline-rc`

## Final result

**PASS — 0 critical, 2 warnings, 0 suggestions.**

- Judge: `kbd-critic`
- Producer: `gpt-5`
- Isolation: fresh-context REST gateway
- Cross-model check: `verified-distinct`
- Sycophancy screen: pass, score `0.0`, strict mode
- Authoritative findings: `.kbd-orchestrator/phases/full-3.0-release/review/v3-release-pipeline-rc/findings.json`

## Confirmed findings corrected with RED/GREEN evidence

1. Candidate tarball paths were absolute and could not survive the
   rehearsal-to-stage job boundary. Paths are now bundle-relative and reject
   traversal.
2. The RC lane accepted alpha and unnumbered prereleases. It now requires
   `3.0.0-rc.N` and uses the `next` channel.
3. A literal pnpm argument separator reached the release CLI. Workflow and
   guidance now forward named arguments correctly.
4. Staging could accept incomplete rehearsal evidence and locally fabricated
   registry proof. It now validates the entire rehearsal before network access
   and requires npm's exact package/version, SRI, and stage UUID.
5. Authority was enforced only at upload. It is now the first stage
   state-machine operation before tag snapshots or exact-version reads.
6. Exact npm integrity lookup did not decode npm's live flat
   `"dist.integrity"` field. It now accepts the live flat shape and the nested
   compatibility shape.
7. A partial staging failure could lose its restart journal. Progress is now
   persisted after confirmed transitions and before mutation; CI uploads it
   with `always()`.
8. Exact-version absence parsed only JSON stderr. It now recognizes `E404`
   from JSON stdout/stderr and explicit plain-text npm errors while other
   failures remain fail-closed.

The corrected task-specific result is 24/24 unit tests and 13 scenarios/57
steps with all 6 hooks passing.

## False findings rejected with authoritative evidence

- `artifact-metadata: write` is a current supported GitHub Actions permission
  and is required by official `actions/attest` guidance. Actionlint passes the
  workflow unchanged.
- `pnpm-lock.yaml` is present with 4,441 insertions and 3,504 deletions; a
  frozen install passes for all 15 workspaces. The generated bulk was omitted
  from the review packet to stay within the request transport limit.
- The coverage ledger, skill indexes, and v3 release-contract reference are
  synchronized and their executable validators pass. Untracked/generated
  files were added to the packet through a disposable Git index without
  mutating the real index.

## Retained warnings

1. The stage job downloads the candidate produced by the same workflow run but
   does not independently verify its GitHub attestation before npm staging.
   This is retained for future hardening; artifact download integrity and the
   immutable candidate manifest remain active, and no registry mutation was
   performed in this change.
2. The local environment check is spoofable and therefore must not be described
   as the cryptographic authority boundary. GitHub/npm OIDC trusted publishing
   is the actual external authority. The environment check remains an
   accident-prevention and workflow-shape guard.

Warnings do not authorize publication, move `latest`, or convert unproven npm
trusted-publisher and protected-environment settings into passing claims.
