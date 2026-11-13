## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: G12 docs drift; skills↔exports rule.

## Decisions

Adopted operator decisions that bind this change: D3 (5.0.0 major; tag and publish need separate operator approval), D8 (client-only basic catalog documented).

## Open design records

Recorded here during execution, before dependent code: Boundary scripts and controls; review before the boundary run.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Record: docs (task 11.2, 2026-11-12)

Executed by a profile-I worker (`claude-sonnet-5-5`), reviewed by the driver. New migration guides
`site/docs/migration/a2ui-1-0.mdx` (sidebar registered) and `website/docs/operations/migration-5.md` (route added
to `website/routes.json`); A2UI/AG-UI/A2A pages in both trees, both package READMEs and the `examples/coverage.json`
prose updated. The worker's three unverified claims were checked by the driver: the 4.x A2A URI was
Prometheus-owned (HEAD `types.ts`), the reference agent still activates the extension when requested
(`handler.ts`), and the guides say a 1.0 surface holds no theme (true). Left for release bookkeeping: stale package
version labels in a few pages, and the generated `site/docs/packages/*.mdx` (regenerated from package metadata).
`scripts/check-build.mjs` acceptance of the new website route is unverified until the docs gates run.

## Record: changeset (task 11.4, 2026-11-12)

`.changeset/a2ui-1-0-agui-1-0.md` (major: a2ui-react, entity-graph-a2a, entity-graph-core, entity-graph-react; the
fixed group moves all 13 packages to 5.0.0) and "5.0.0 (unreleased)" sections in the a2ui-react and
entity-graph-a2a changelogs. Following the repository's release practice (see `b1d456cd`), versions, the root
changelog fold-in, tags and publication are left to the operator-approved release step.

## Execution record: acceptance authoring (11.1, 2026-11-12)

Scripts (all require `--report`/`--out`, none run yet): `verify:a2ui-v1` (UPG-1/2/4/5/6/7/8/13/17),
`verify:agui-run-stack` (UPG-10/11/12), `verify:a2ui-examples` (UPG-14), `capture:a2ui-visual` with
`verify-a2ui-visual-evidence.mjs` reading `A2UI_VISUAL_EVIDENCE`, UPG-15 additions to `verify-package-contracts.mjs`
(registry `@a2ui/web_core/v0_9` control consumer must fail with TS2835 only; zod 4.6.7 via `zod/v3`), UPG-16
`verify-skills-scratch-control.mjs` chained into `verify:skills`, and the UPG-9 rewrite of `verify-a2a-conformance.mjs`.

Findings and limits recorded here rather than hidden:
- `refresh:exports` and `verify:skills` imported the client-only a2ui-react root entry in plain Node and failed
  (`HTMLElement is not defined`). `scripts/dist-dom-globals.mjs` now loads that one package inside jsdom for both.
- The visual evidence page (`tests/fixtures/a2ui-browser`) still sends v0.9.1 envelopes; the visual receipt is
  regression evidence for the v0.9.1 path, not 1.0 rendering. Its own Vite config cannot build at the root; the
  capture borrows Vite/React from `examples/agentic-a2ui-app`.
- The `agentic-a2ui` example's own A2A artifact is not observable in the page; the examples verifier captures the
  planner's runtime input instead (the artifact is guarded by `createA2UIArtifact`'s 1.0 check).
- UPG-8: the official binder resolves every bound action with `userActivation: true`, so a script-dispatched
  `element.click()` likely runs an activation-gated function. The control exercises the programmatic path
  (`resolveAction(..., { userActivation: false })`); amendment 4 states that scope.
- Two chat defects found while authoring (tool calls not rendered; client tools re-run after agent results) are
  fixed; see `agui-1-0-chat-run-stack/design.md`.
- Contract wording mismatches (UPG-1 refusal code, UPG-3 multi-assertion divergences, UPG-6 response name, UPG-8 scope,
  UPG-12 component name, UPG-13 Node version) are in amendment 4, pending operator signature.

## Boundary repairs (11.6)

- Run 1 (2026-11-12T155514): step 6 failed before any check: scratch consumers ran pnpm through corepack's
  last-known-good 12.16.1, which this corepack cannot launch. Repair: every scratch consumer pins the repository's
  `packageManager`.
- Run 2 (2026-11-12T155910): packed consumers passed; the visual gate failed on caption contrast (page styling,
  repaired with `color-scheme: light` on the light card) and an axe-incomplete `aria-prohibited-attr` on official
  `a2ui-basic-*` hosts, recorded as an operator-approved exception in the visual verifier (see .prometheus/decisions.md).
- Run 3 (2026-11-12T185319): step 7 failed on an unpinned control consumer (same corepack fallback); pinned, plus the
  skills scratch control.
- Run 4 (2026-11-12T185629): step 8 failed on a product defect: `isV1Surface` expected `v1.0` while the official model
  stores `1.0`, so held 1.0 surfaces were reseeded as v0.9.1. Fixed in v1-messages.ts.
- Run 5 (2026-11-12T190151): UPG-4 control failed: official errors escaped unwrapped in minified builds (name-based detection); now instanceof A2uiError.
- Run 6 (2026-11-12T190539): A2A conformance failed: the a2a reference surface used Text variant h2 (invalid in 1.0); removed.
- Run 7 (2026-11-12T190822): A2A scenario's summarizer ignored inline createSurface content (verifier defect); fixed.
- Run 8 (2026-11-12T191139): run-stack checks predated tool-call rendering and streaming settlement; UPG-10 compares the content element, UPG-11 excludes settle-only writes.
- Run 9 (2026-11-12T191505): the settle-write filter also dropped genuine END writes; replaced by marking writes after sendMessage's synchronous part.
- Run 10 (2026-11-12T191816): example surfaces used hyphenated component ids, invalid in 1.0 (UAX #31); renamed to snake_case across examples and Flutter.
- Run 11 (2026-11-13T012741): 28/29 conformance cases within allowances; the agent-function case also changed the data model (local increment after the failed agent-function argument); allowance added on operator decision.
- Run 12 (2026-11-13T013254): first cold Xcode build failed to link Flutter; runs now retry once on app build/launch failure only, both attempts recorded.
- Run 13 (2026-11-13T013848): Flutter test could not find the off-screen hostile switch after scrolling; it now drags the list back first.
- Run 14 (2026-11-13T014906): a2a export ledger stale (its refresh:exports skipped the build); script fixed, ledgers regenerated.
- Run 15 (2026-11-13T020030): release contract still at 4.4.0; moved to 5.0.0 with Dart/Rust aligned per the native policy.
- Run 16 (2026-11-13T020958): docs artifacts stale after source repairs; API reference, search, evidence gallery (caption moved to its source) and native API docs regenerated.

## Boundary run record (task 11.6)

Run 17 (repair attempt 16 of the 20 allowed by amendment 5) passed all 14 boundary commands against contract digest
bfa43f3b. Evidence: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/evidence/2026-11-13T022253-boundary`, with one
receipt per scenario (UPG-1 to UPG-18, all PASS) and a README mapping each scenario to its report. Runs 1–16 are kept in
their own dated folders with the failure and the repair.
