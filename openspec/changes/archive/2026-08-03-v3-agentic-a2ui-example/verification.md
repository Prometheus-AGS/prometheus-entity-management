# Verification: v3-agentic-a2ui-example

## Current disposition

- Implementation evidence: PASS
- Artifact-refiner QA: PASS — cycle 7, 8/8 blocking constraints
- Adversarial diff review: PASS — cycle 7 alternate, 0 findings,
  anti-sycophancy score 0.0
- Archive: COMPLETE — 2026-08-03
- npm publication: NOT APPLICABLE TO THIS CHANGE

Archive completed after final strict OpenSpec verification against this state.

## Acceptance evidence

| Plan requirement | Reproducible evidence | Disposition |
|---|---|---|
| Dedicated React/Vite example composes deterministic A2A with official A2UI surfaces | `examples/agentic-a2ui-app/src/features/agentic/reference-agent.ts`, `reference-surfaces.test.ts`, task-5 browser receipt | PASS |
| Approved actions enter hooks/stores and update all normalized views | `action-policy.test.tsx`; happy Chromium flow proves list/detail status both become `done` and then `archived` | PASS |
| Streaming task state and artifact rendering | `agent-session-store.ts`, `a2a-client-service.ts`, four session-store units, happy and cancellation Chromium flows | PASS |
| Validation failures fail closed | malformed golden fixture/Chromium flow, canonical atomic-batch regression, and sequential happy-then-malformed stale-surface regression | PASS |
| Authorization denial does not mutate the graph | policy unit and happy Chromium flow cover unauthorized delete, invalid context, and unknown action | PASS |
| Human approval gates destructive actions | policy unit and happy Chromium flow cover explicit denial/approval; overlap regression preserves the first request; session regression denies pending decisions before run/reset | PASS |
| Cancellation occurs before artifact delivery | cancellation unit and Chromium flow retain zero artifacts and no graph mutation | PASS |
| Optional external-agent configuration is explicit, scheme-safe, and credential-free | `VITE_EXTERNAL_A2A_URL`, canonical `external-executor.ts`, four endpoint-policy tests, source contract test, example and release guidance | PASS for configuration; live endpoint remains uncertified |
| CI requires no model API key | source/dependency contract test and clean verifier | PASS |
| Golden fixtures and E2E cover happy, denied, malformed, and cancelled behavior | two golden fixture tests; three Chromium tests with denied outcomes inside the happy policy flow | PASS |
| Agent-generated UI cannot bypass the component or action catalog | unknown component, unknown action, invalid context, tenant authorization, and approval evidence | PASS |
| Public ledgers and guidance remain synchronized | 13/13 semantic scenarios, 14/14 coverage regressions, A2UI 18+9 and A2A 30+2 export ledgers, strict OpenSpec | PASS |

## Deterministic QA evidence

The deletion-aware `pnpm run verify:agentic-a2ui` clean gate passed 19 commands:
frozen installation, typecheck, lint, 11 focused example units, one focused
canonical A2UI atomic-batch regression, four focused endpoint-policy tests,
four package builds, both
export ledgers, the Vite production build, three Chromium flows, coverage,
security audit, strict OpenSpec, and diff hygiene. The task-5 report binds ten
artifacts by SHA-256; all ten hashes were independently recomputed and matched.
Accessibility recorded zero serious and zero critical findings separately for
the happy, malformed, and cancelled browser states.

The final receipt was produced against the promoted coverage and guidance state;
no separate stale pre-promotion receipt is used.

Artifact-refiner cycle 4 `c0bef464-354b-4dd4-a293-9510989e80bb` revalidated all
eight blocking constraints after the final task transition and finalized at
`.refiner/history/v3-agentic-a2ui-example-archive-qa/2026-08-03_21-42-27Z/`.

## Review cycle 1 and corrections

The isolated cycle-1 verdict was BLOCK with two critical findings and one
warning. It remains retained and cannot authorize archive.

- The reviewer could not see the unchanged canonical endpoint guard. Inspection
  showed a narrower real defect: `ftp://localhost` and other non-HTTP loopback
  schemes bypassed the guard. A regression was observed RED, the canonical A2A
  executor now allows HTTPS universally and HTTP only on named/IPv4/IPv6
  loopback, and all three focused endpoint-policy tests pass.
- The first packet omitted the three PNGs and three traces. All six binaries are
  now included explicitly in `files.txt` and in the corrected review packet.
- Axe previously ran only in the happy state. Every browser flow now has its own
  serious/critical receipt, and the verifier requires the exact three-flow set.
- The clean verifier also exposed and corrected dependency ordering plus a
  self-referential promoted-coverage check. It writes a non-passing `running`
  receipt before coverage and overwrites it with `pass` only after all 18
  commands succeed.

The isolated cycle-2 verdict was BLOCK with one critical finding and one
warning. It is retained separately and also cannot authorize archive.

- Component-facing cancellation was enabled during `submitted` before a task
  ID necessarily existed. `canCancelAgentTask` now requires both a cancellable
  lifecycle and a non-null task ID; existing lifecycle tests cover the pre-ID
  and post-ID states.
- The malformed scenario previously labeled any thrown error as a validation
  failure. `classifyAgentFailure` now maps only `PrometheusA2uiError` to
  `validation-failed`; a generic transport error maps to `failed`.
- Focused typecheck, lint, and session-store tests passed, followed by a fresh
  passing 18-command clean receipt and ten independently matching hashes.

The isolated cycle-3 verdict was BLOCK with one procedural critical finding:
the final task remained unchecked even though its required artifacts existed.
The signed KBD apply driver completed task 6; all six tasks are checked. At the
cycle-3 boundary, no runtime code or browser evidence had changed after the
passing 18-command clean receipt.

## Review cycle 4 and correction

The isolated cycle-4 verdict was BLOCK with one substantive critical finding.
The example-level rollback deleted only newly created surfaces, so an earlier
valid message could mutate an existing surface before a later message in the
same batch failed component allowlisting.

- A package-level regression first reproduced the defect: an update of `/body`
  to `Must not commit` remained visible after a later `UnsafeWidget` rejection.
- The canonical `PrometheusA2uiRuntime` now seeds a shadow official
  `MessageProcessor` with the current surface/catalog/component/data state and
  applies the complete batch there with the same component allowlist.
- Only a fully successful preflight reaches the real official processor. The
  example's partial bespoke rollback was removed and now delegates directly to
  canonical runtime ownership.
- The focused regression passed, followed by the complete 19-command clean
  verifier and ten freshly bound artifact hashes.

Cycles 1–4 remain retained and cannot authorize archive. The correction required
a new artifact-refiner cycle before the fifth isolated review.

Artifact-refiner cycle 5 `3ff5b299-db89-478b-ae55-21f13a7f008a` passed all
eight constraints, checkpointed as `3fc51bfb`, and finalized at
`.refiner/history/v3-agentic-a2ui-example-archive-qa/2026-08-03_21-58-39Z/`.
At the cycle-5 QA boundary, the fifth isolated review remained the only archive
gate.

## Review cycle 5 and corrections

The isolated cycle-5 verdict was BLOCK with one critical finding and one
warning. A successful surface could survive a later malformed scenario, and a
second destructive approval could replace the pending request and orphan its
promise.

- The sequential session regression first streamed the happy surface, then ran
  malformed, and observed the prior demo surface still present.
- `clearAgentSurfaces()` now sends official `deleteSurface` messages for every
  current surface. The session store calls it before each run and on reset.
- The approval regression issued two archive requests before resolving the
  first; it observed a changed pending ID and timed out.
- The store now denies an overlapping request immediately, preserves the active
  ID, and permits the original human decision to resolve and execute.
- Both focused files pass 6/6 tests, typecheck and lint pass, and the regenerated
  clean verifier passes 19 commands with 10/10 example units and ten freshly
  matching evidence hashes.

Cycles 1–5 remain retained and cannot authorize archive. Artifact-refiner cycle
6 `7827b0f6-8776-4f2b-87b5-3847d614bead` passed all eight constraints,
checkpointed as `fcde5949`, and finalized at
`.refiner/history/v3-agentic-a2ui-example-archive-qa/2026-08-03_22-07-55Z/`.
The sixth isolated review remained the next archive gate at that point.

## Review cycle 6 and corrections

The isolated cycle-6 verdict was BLOCK with two critical findings. Both traced
to real browser-agent trust boundaries and were reproduced before correction.

- A pending destructive approval survived a new scenario or explicit reset. A
  RED session regression observed the request remain active. Both boundaries
  now deny and resolve the pending decision before clearing surfaces or replacing
  session state, so a stale human response cannot mutate a later scenario.
- `VITE_EXTERNAL_A2A_URL` could carry URL username/password credentials into the
  browser-visible transport configuration. A RED package regression observed
  that the canonical executor accepted `https://token@...`. It now rejects any
  endpoint with URL userinfo before AgentCard discovery.
- The focused regressions pass, both affected TypeScript checks and scoped lint
  pass, and the regenerated deletion-aware verifier passes all 19 commands with
  11/11 example units, four endpoint-policy tests, three Chromium flows, and ten
  freshly bound evidence artifacts.

Cycles 1–6 remain retained and cannot authorize archive. Artifact-refiner cycle
7 `ab6b3b85-9fee-46d5-8405-7a519a98e578` passed all eight constraints,
checkpointed as `122c01d4`, and finalized at
`.refiner/history/v3-agentic-a2ui-example-archive-qa/2026-08-03_22-23-11Z/`.
At that boundary, a fresh seventh isolated review was still required.

## Review cycle 7 and factual correction

The initial cycle-7 reviewer returned BLOCK with one critical claim that the
runtime retained a caller-owned catalog array while the live official processor
used a separate snapshot. Direct source inspection contradicted the claim:

- the runtime first creates a private array with
  `const catalogs = [...options.catalogs]`;
- both `this.catalogs` and the live `OfficialMessageProcessor` receive that same
  private array; and
- the pinned official processor assigns `this.catalogs = catalogs` rather than
  making the snapshot asserted by the finding.

The preflight shadow copies the current elements of that same internal array,
and catalog objects are shared by both processors. No caller reference can
mutate the internal array, so there was no observed failure and no speculative
code was added. The unchanged packet plus this source-level correction was sent
to the alternate isolated `kbd-critic` reviewer. It returned PASS with zero
findings; the anti-sycophancy screen passed at 0.0. Both the rejected report and
the accepted alternate report remain retained for audit.

## Blocking review constraints

1. Every bounded plan and OpenSpec criterion must have direct current evidence.
2. The example must reuse canonical A2A and official A2UI runtime ownership.
3. Untrusted components/actions must fail closed at catalog, schema, tenant,
   authorization, and human-approval boundaries.
4. Components must consume hooks; stores must own mutation; lists must retain
   IDs and project one canonical entity into list/detail views.
5. Keyless lifecycle, golden fixtures, render, denial, malformed rejection,
   approval, and cancellation must be covered.
6. Machine evidence must parse; all ten retained hashes must match; serious and
   critical accessibility findings must remain zero.
7. Coverage, package ledgers, skills, docs, and OpenSpec must agree.
8. Packed-consumer, live external-agent, non-Chromium, native-platform, frozen
   RC, and registry-publication exclusions must remain explicit.

## Evidence boundary and release impact

This is source-workspace Chromium evidence. It does not certify packed npm
installation, a live external agent, Firefox/WebKit/mobile browsers, Flutter,
Tauri, or native devices. The example adds no public package export.

The worktree is based on `c8c97d1dccaf1ac12b2e138b2af5e2843f5fb361`.
It does not alter the frozen React `3.0.0-rc.1` candidate at
`1c40eaa08da210cbe3e20a77c5db211712b5c3a1`; that candidate may publish first
after npm trusted-publisher authorization. This example can enter a later
coordinated prerelease only after this continuation is reviewed and merged.

The Vite build's approximately 661 kB minified-chunk warning and the production
audit's two low findings are recorded non-blocking limits. Moderate, high,
critical, and audit-blocking findings were zero.
