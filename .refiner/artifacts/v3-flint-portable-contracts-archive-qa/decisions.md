# Refinement decisions — `v3-flint-portable-contracts-archive-qa`

## Iteration 1 decision

- **Decision:** terminate deterministic refinement
- **Blocking violations remaining:** 0
- **Rationale:** All eight constraints have current direct evidence; no
  observed implementation defect warrants another source change.
- **Next gate:** Fresh-context cumulative-diff adversarial review, then strict
  OpenSpec verification/archive only on a non-blocking verdict.

## Scope decision

The project has no `.kbd-orchestrator/constraints.md`, so the generic KBD
template was adapted to eight task-specific constraints. This pass certifies
only the bounded Flint portability change. It does not authorize npm, move
`main`, create `next`, split the twelve-package fixed group, certify full 3.0,
or claim a Forge adapter that this repository does not implement.

## Iteration 2 decision

- **Delta:** The first isolated review found two evidence-integrity defects:
  declared dist outputs were absent from the tracked diff, and clean/remote
  proof was bound to an earlier candidate.
- **Correction:** Both manifest outputs are now tracked, and the full clean,
  external-source, real-SDK, strict OpenSpec, workflow, and remote matrix was
  repeated at exact cumulative source `5ef6ea3`.
- **Decision:** terminate deterministic remediation with 8/8 constraints
  satisfied and dispatch a fresh isolated cumulative-diff review.

## Iteration 3 decision

- **Observed defect:** File hashes alone did not prove that supplied external
  roots were at the revisions declared by the contract.
- **Correction:** The verifier now resolves `HEAD^{commit}` for every supplied
  Git root, requires exact equality before reading the hash set, records the
  verified revisions, and has an 8th regression for a valid wrong-revision
  worktree.
- **Disposition:** The 8/8 constraints remain satisfied only after this code
  correction and its focused positive/negative verification; isolated review
  must run again.

## Iteration 4 decision

- **Observed defect:** A pinned `HEAD` and matching filesystem hashes did not
  prove the contract bytes were committed at that revision.
- **Correction:** Each file must now match both its pinned Git blob and its
  independently read working-tree bytes. Separate regressions cover committed
  drift and dirty pinned files.
- **Decision:** retain 8/8 constraint satisfaction and repeat isolated review
  over the complete cumulative diff and regenerated task-6 receipt.

## Iteration 5 decision

- **Observed defect:** The client-secret verifier omitted common environment
  and configuration files.
- **Correction:** Scan all example files, classify binaries explicitly or by
  NUL probe, and inspect all remaining text-like bytes. A `.env.local`
  regression proves the corrected boundary.
- **Decision:** retain 8/8 constraint satisfaction with 428 text files checked,
  112 binaries reported separately, and zero exposed credentials; repeat the
  isolated cumulative review.

## Iteration 6 decision

- **Observed defects:** Linux and other absolute Flint roots were not rejected,
  and shared directory exclusions kept generated example outputs outside the
  credential scan while the evidence claimed all text-like example files.
- **Corrections:** Reject macOS, Linux, root, Windows-profile, and non-home
  absolute Flint sibling paths. Traverse `.next`, `build`, `dist`, and `target`;
  classify binaries; enumerate only third-party dependency/cache exclusions.
- **Latest-source reconciliation:** Refreshed all sibling remotes. Realtime
  Fabric and Gate main remain at their pins. Forge main advanced to
  `0135946cec589c1059a9f82ac373c7cb6c12e387`; none of the four hashed
  provisioning files changed, so only its revision pin advanced.
- **Decision:** retain 8/8 constraint satisfaction with 11 focused regressions,
  481 repository-owned text files, 250 binaries, zero exposed credentials, and
  a fresh exact-revision external receipt; repeat isolated cumulative review.

## Iteration 7 decision

- **Observed defect:** The cross-platform path rule still omitted arbitrary
  Windows drive-root Flint checkouts such as `D:\\checkouts\\flint-gate`.
- **Evidence clarification:** The cited `SUPABASE_SERVICE_ROLE_KEY` already
  matched the generic `service[_-]?role[_-]?key` rule. A direct env regression
  now proves that fact, and an assignment-specific rule makes the trust
  boundary explicit without broadening to harmless prose mentions.
- **Correction:** Add Windows drive-root sibling rejection and a focused
  D-drive case; reject generic service-role assignments and add a Supabase env
  case.
- **Decision:** retain 8/8 constraints with 12/12 focused regressions and a
  regenerated exact-source receipt; repeat isolated cumulative review.

## Iteration 8 decision

- **Observed defect:** A real service-role JWT value could be assigned to a
  misleading public-looking variable without matching any credential-name or
  Flint-key prefix rule.
- **Correction:** Parse token-shaped base64url JWT payloads, recursively inspect
  `role`/`roles` claims, and reject `service_role` or `service-role` values.
  Add a `NEXT_PUBLIC_SUPABASE_ANON_KEY` regression carrying a service-role JWT.
- **Decision:** retain 8/8 constraints with 13/13 focused regressions, zero
  exposed credentials across the full scanned boundary, and a regenerated
  exact-source receipt; repeat isolated cumulative review.

## Iteration 9 decision

- **Observed defects:** Windows drive-root Flint paths using forward slashes
  and service-role JWT signatures ending in `-` could evade separator/boundary
  assumptions.
- **Correction:** Match either slash throughout Windows drive roots; replace
  JWT word boundaries with negative base64url-character lookarounds; extend the
  existing path and value regressions with both variants.
- **Decision:** retain 8/8 constraints with 13/13 focused regressions and a
  regenerated exact-source receipt; repeat isolated cumulative review.

## Iteration 10 decision

- **Observed defects:** Windows user profiles written with forward slashes and
  compact JWTs whose JSON header does not begin with the common `eyJ` encoding
  could evade otherwise valid checks.
- **Correction:** Use either separator in the user-profile pattern. Extract
  generic compact base64url triplets, require a decoded JSON header containing
  `alg`, decode the JSON payload, then inspect service-role claims. Extend the
  path and leading-whitespace-header regressions.
- **Decision:** retain 8/8 constraints with 13/13 focused regressions and a
  regenerated exact-source receipt; repeat isolated cumulative review.

## Iteration 11 decision

- **Observed defect:** Windows UNC network-share paths to Flint sibling roots
  were outside the Unix and drive-letter portability grammar.
- **Correction:** Add a UNC Flint-root pattern and a
  `\\server\\share\\flint-gate` regression.
- **Decision:** retain 8/8 constraints with 13/13 focused regressions and a
  regenerated exact-source receipt; repeat isolated cumulative review.

## Iteration 12 decision

- **Observed defect:** A scalar `roles` claim containing multiple delimited
  roles could hide `service_role` from exact-string comparison.
- **Correction:** Split role strings on whitespace, comma, semicolon, and pipe
  delimiters, then compare exact normalized tokens. Use
  `authenticated service_role` in the JWT regression.
- **Decision:** retain 8/8 constraints with 13/13 focused regressions and a
  regenerated exact-source receipt; repeat isolated cumulative review.
