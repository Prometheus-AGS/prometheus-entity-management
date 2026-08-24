# Refinement log — `v3-agentic-a2ui-example-archive-qa`

## Iteration 1 — 2026-08-03T19:55:23Z

### Delta first

The implementation already had a passing clean runtime receipt, but it lacked
an independent criterion-by-criterion QA bundle and a consolidated disposition
of evidence limits and React-first release impact.

### Actions taken

- Reconciled the KBD plan and OpenSpec requirement with source, focused tests,
  coverage declarations, documentation, skill guidance, and retained browser
  evidence.
- Evaluated eight task-specific blocking constraints derived from the generic
  KBD template because no project constraint file exists.
- Re-ran post-promotion coverage, coverage regressions, both package export
  ledgers, strict OpenSpec, JSON parsing, all ten evidence hashes, and diff
  hygiene.
- Preserved source-workspace, external-agent, browser/platform, packed-package,
  frozen-RC, and registry-publication limits without waiver.

### Constraint status

All eight blocking constraints are satisfied. No implementation correction was
identified by the deterministic pass.

### Reflection summary

- Convergence: terminate.
- Next: obtain a fresh-context adversarial verdict; archive only on PASS.

### Content type

- Type: `direct:content`
- Evaluation: deterministic validation and evidence inspection.

## Cycle 2, iteration 1 — 2026-08-03T21:30:48Z

### Delta first

The first isolated review blocked on two critical findings and one warning. The
literal “no endpoint validation” claim omitted the unchanged canonical executor,
but inspection found a real narrower defect: non-HTTP loopback URLs bypassed its
scheme check. The review packet also omitted six retained visual binaries, and
axe covered only the happy browser state.

### Actions taken

- Added a RED regression proving `ftp://localhost` was accepted, then tightened
  the canonical A2A executor to allow HTTPS universally and HTTP only for
  `localhost`, `127.0.0.1`, and `[::1]`.
- Added three focused endpoint-policy tests to the deletion-aware verifier.
- Ran axe in all three browser flows and made the verifier require the exact
  per-flow accessibility receipt set.
- Added all three screenshots and all three traces to the explicit review file
  surface.
- Corrected clean-verifier ordering and its promoted-coverage self-reference;
  the verifier now writes a non-passing `running` receipt and overwrites it with
  `pass` only after every gate succeeds.
- Regenerated the complete 18-command receipt and all browser hashes.

### Constraint status

All eight blocking constraints are satisfied again. A new isolated review is
required; the blocked cycle-1 verdict cannot authorize archive.

## Cycle 3, iteration 1 — 2026-08-03T21:37:20Z

### Delta first

The second isolated review blocked because `canCancel` was true during
`submitted` before an A2A task ID necessarily existed. It also warned that the
malformed scenario converted any thrown error into `validation-failed`.

### Actions taken

- Gated component-facing cancellation on both a cancellable lifecycle and a
  non-null task ID; the existing lifecycle unit now proves the pre-ID state is
  disabled and the post-ID submitted/working states are enabled.
- Replaced scenario-based error classification with an explicit
  `PrometheusA2uiError` check. The malformed unit now proves a generic transport
  error maps to `failed` while a catalog validation error maps to
  `validation-failed`.
- Passed focused typecheck, lint, and all three session-store tests.
- Regenerated the 18-command clean receipt, all browser evidence, and all ten
  artifact hashes.

### Constraint status

All eight blocking constraints pass again. A third fresh-context verdict is
required; the two retained BLOCK verdicts remain non-authoritative for archive.

## Cycle 4, iteration 1 — 2026-08-03T21:40:55Z

### Delta first

The third isolated review found no new code defect. It blocked because the
completed verification/limits/release-impact work still had an unchecked final
OpenSpec task while the review contract requires all tasks complete.

### Actions taken

- Closed KBD task 6 through the signed apply driver after confirming
  `verification.md`, task-5 receipts, refiner history, limits, and release impact
  were present.
- Confirmed all six OpenSpec tasks are checked.
- Preserved the passing 18-command clean receipt and independently matching ten
  hashes without rerunning unchanged runtime work.
- Revalidated strict OpenSpec, artifact-refiner schemas/state, and diff hygiene.

### Constraint status

All eight blocking constraints remain satisfied. The final packet must receive
a new isolated PASS before archive.

## Cycle 5, iteration 1 — 2026-08-03T21:56:09Z

### Delta first

The fourth isolated review found a real defect that the earlier new-surface
cleanup did not cover: a valid early message could mutate an existing surface
before a later invalid component rejected the same batch.

### Actions taken

- Added a package-level regression that first failed with `/body` changed to
  `Must not commit` after the later `UnsafeWidget` rejection.
- Moved atomic ownership into `PrometheusA2uiRuntime`: it seeds a shadow official
  `MessageProcessor` with current surfaces, components, and data, applies the
  complete batch there with the same allowlist, and touches the live processor
  only after successful preflight.
- Removed the example-owned partial rollback and delegated directly to the
  canonical runtime.
- Passed the focused regression and the full 19-command clean verifier.
- Independently recomputed all ten retained hashes; all matched. Every Chromium
  flow still records zero serious and zero critical axe findings.
- Updated public package, release, skill, clean-receipt, and OpenSpec guidance to
  describe transactional batches rather than the superseded cleanup behavior.

### Constraint status

All eight blocking constraints are satisfied. The cycle-4 BLOCK remains audit
history; a fifth isolated review is required before archive.

## Cycle 6, iteration 1 — 2026-08-03T22:05:40Z

### Delta first

The fifth isolated review found two state-lifecycle gaps not exercised by the
fresh-page browser flows: a successful surface survived a later malformed run,
and a second approval request replaced the active request and orphaned its
promise.

### Actions taken

- Added a sequential happy-then-malformed assertion to the existing session
  unit; it failed because the demo surface remained.
- Added overlapping approval assertions to the existing policy unit; the test
  timed out because the first request could no longer resolve.
- Added `clearAgentSurfaces()` using official `deleteSurface` messages and call
  it for every scenario start and explicit reset.
- Deny an overlapping approval request immediately while preserving the first
  pending ID and its eventual human resolution.
- Passed the two focused files (6/6), typecheck, scoped lint, and the complete
  19-command clean verifier (10/10 example units).
- Independently matched all ten regenerated artifact hashes and retained zero
  serious/critical axe findings for every browser flow.

### Constraint status

All eight blocking constraints are satisfied. Cycles 1–5 remain retained audit
history; a sixth isolated review is required before archive.

## Cycle 7, iteration 1 — 2026-08-03T22:20:07Z

### Delta first

The sixth isolated review found two trust-boundary gaps: a pending destructive
approval survived a new run or reset, and an external HTTPS endpoint could embed
username/password credentials in browser-visible configuration.

### Actions taken

- Added a session regression that first failed because a pending archive request
  remained active after `run()` and `reset()`.
- Deny and resolve the pending decision before either boundary clears surfaces or
  replaces session state.
- Added an endpoint-policy regression that first failed because
  `https://token@agents.example.test/a2a` was accepted.
- Reject URL username/password credentials in the canonical A2A executor before
  AgentCard discovery; retain HTTPS and loopback scheme policy unchanged.
- Passed both focused regressions, affected package/example typechecks, and scoped
  lint.
- Regenerated the complete 19-command clean verifier with 11/11 example units,
  four endpoint-policy tests, three Chromium flows, and zero serious/critical axe
  findings.
- Independently matched all ten retained artifact hashes and revalidated strict
  OpenSpec, JSON structure, documentation counts, and diff hygiene.

### Constraint status

All eight blocking constraints are satisfied. Cycles 1–6 remain retained audit
history; a seventh isolated review is required before archive.
