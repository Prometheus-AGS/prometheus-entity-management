# PLAN: phase-a2ui-1-0-agui-upgrade

- **Project:** prometheus-entity-management (`@prometheus-ags/*`, 13 npm packages in one changesets `fixed` group)
- **Date:** 2026-11-12 · **Revision:** 2 (after adversarial review round 1, see "Review record")
- **OpenSpec available:** YES (CLI 2.0.0 through the managed runner; `specBackend` unpinned, resolved from `openspec/`)
- **Changes to implement:** 11 (10 shipping, 1 design-only) · **Tasks:** 52
- **Inputs:** `assessment.md` (G1–G13, W1–W12, decisions D1–D8 **adopted 2026-11-12**), `goals.md`, `prior-context.md`, `CLAUDE.md`
- **Analyze stage:** skipped (no `library-candidates.json`). The one adopt-versus-build question (upstream
  `@a2ui/web_core/catalogs/basic/v1` for the 1.0 catalog) is decided in `a2ui-v1-native-surfaces#2`, which
  records the evidence it used.
- **Contract:** `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/adopted-contract.json`; identity in
  "Contract binding".

## Operator attention: two refinements of adopted decisions

> **Accepted by the operator 2026-11-12 ("Accept both")**: the D6 mechanism refinement and the D4 narrowing below.

**D6 (pnpm patch for #75) is necessary but not sufficient.** Review round 1 showed, and I confirmed, that the
published `packages/a2ui-react/dist/index.d.ts:1-2` imports types from `@a2ui/web_core/v0_9`, and the
packed-consumer fixtures install the registry `@a2ui/web_core` without any patch. A pnpm patch fixes this
repository's own builds only; consumers would still hit TS2835 with `skipLibCheck: false`. The plan keeps D6's
goal (no `skipLibCheck`) and adds `a2ui-0-15-library-baseline#3`: make the published declarations independent
of the broken upstream declaration (for example by inlining the needed `@a2ui` types into the bundled `.d.ts`).
That is a change of mechanism, not of goal; it is flagged here so the operator can object before execution.

**D4 (W3 in scope) is narrowed.** The plan tasks AG-UI 1.0 run lifecycle, text, tool calls and results,
reasoning, state and `MESSAGES_SNAPSHOT`, but excludes `SUBAGENT_*` events and multimodal message parts,
because no adopted scenario needs them and they would add a further rendering surface to an already large phase.
If the operator wants them in, they become a task in change 6 and a scenario, by contract amendment.

## Recalled lessons that shape this plan

- *"Boundary gates must launch the packaged artifact"* — boundary commands run against built and packed
  packages and built examples, never source-level suites.
- *"External integrations require at least one real-service test"* — UPG-2 runs the real
  `@ag-ui/a2ui-middleware`, UPG-9 a real `@a2a-js/sdk` client/server exchange, UPG-10 a real AG-UI
  client/encoder stream. These packages are added as root devDependencies by
  `agui-1-0-floors-and-middleware-interop#1` so the frozen-lockfile install provides them.
- *"Put pinned runtime first on PATH before running gates"* — the boundary runs in one shell session whose first
  command exports `PATH` and fails unless Node 22 or 24 is selected.
- *"Preserve production evidence in dated review folders"* — the boundary creates a new
  `evidence/<date>-boundary/` with plain `mkdir` (fails if it exists) and every report, including the A2A and
  visual reports that previously wrote into `full-3.0-release`, is redirected there.
- *"Ask once at phase boundary for operator-only actions"* — the 5.0.0 tag, publish and any merge are asked
  once, after `a2ui-1-0-release-sync#7`, never inferred from adopting D3.
- Previous reflection (`phase-v4-a2ui-runtime-hardening`): placeholder boundary commands forced an amendment,
  and the phase needed two budget extensions (to 1,440 min) at a smaller scope. This contract names concrete
  commands and sets the budget from this plan's own estimate.

## Scope check (anti-sycophancy)

- **Size is large.** 52 tasks, estimated 45–70 agent-hours (2,700–4,200 min) by the S/M/L guide. The contract
  budget is 3,600 min; reaching it means checkpoint and BLOCKED, then an operator decision.
- **Cut or deferred:** Flutter (D7; spec amended), W8–W12 (D4), W5/W6 design only (change 8), AG-UI
  `SUBAGENT_*` events and multimodal message parts (not needed by any adopted scenario; listed as exclusions so
  the deferral is explicit), the AUI-16/AUI-18 discrimination check and npm provenance from the previous phase
  (release-process debt, not protocol work).
- **Moving targets:** A2UI spec PR #4044 (`@`-prefixed keys) is unreleased; AG-UI interrupt `outcome` fields
  are Draft upstream. Both are risks, isolated in one module each.
- **Build health is UNKNOWN.** Dependencies are not installed; `a2ui-0-15-library-baseline#2` installs them.
- **Not tasked on purpose:** the stale-history read in `use-chat-session` (assessment G5 marks it PLAUSIBLE,
  unobserved). Under A-2 it gets a question, not code: should it be probed during change 6?

## CHANGE LIST (ordered)

### 1. `a2ui-0-15-library-baseline` — `@a2ui/*` 0.12.0 → 0.15.0 with the v0.9.1 path intact
- Scope: package deps, one patch file, declaration bundling, `packages/a2ui-react/src/official/*`, packed-consumer pins
- Depends on: NONE · Est. L · Complexity High · Model class frontier · Customer value HIGH
- Details: Changelog read mapped to call sites first (G13; closes goal 4). One combined 0.15.0 patch file for
  the zod/v3 rewrite (G9, including `import("zod")` type references) and the #75 import (pnpm keeps one patch
  per package version). Published declarations made independent of the broken upstream file (see Operator
  attention). API fixes. v0.9.1 surfaces must still render; 1.0 is not added yet.
- Tasks:
  1. Read the `@a2ui/web_core` and `@a2ui/react` changelogs 0.12.0→0.15.0 and record every breaking change against its call sites in design.md
  2. Install workspace dependencies, pin `@a2ui/web_core` and `@a2ui/react` exactly at 0.15.0, and write one 0.15.0 patch file covering the zod/v3 rewrite (including `import("zod")` type references) and the #75 extension-less import, recording bundle size before and after
  3. Make the published `a2ui-react` declarations independent of the upstream #75 declaration so packed consumers type-check with `skipLibCheck: false`, and draft the upstream fix
  4. Fix the 0.13–0.15 API breaks in `packages/a2ui-react` (basic catalog import, possibly-undefined `SurfaceModel.catalog`, parent/child enforcement through `createPrometheusA2uiComponent`, `CatalogInterface` additions, agent-only invoker, `a2ui-` class prefix)
  5. Update the 0.12.0 and v0.9.1 pins in `scripts/verify-a2ui-protocol-bridge.mjs`, `scripts/verify-package-contracts.mjs`, the release notes, and `tests/steps/v3-a2ui-protocol-bridge.steps.ts` (kept consistent, not cited as evidence)

### 2. `a2ui-v1-native-surfaces` — A2UI 1.0 surfaces through the processor's own 1.0 adapter
- Scope: `runtime-core`, catalogs, `v1-compat.ts` (deleted), export/shadow seed/activity plan, release contract
- Depends on: 1 · Est. L · Complexity High · frontier · HIGH
- Details: D2, D1. Split `runtime-core.ts` (925 lines) first (G10). 1.0 catalog with its own id beside the
  v0.9.1 catalog. Delete the RC downgrade; translate `@`-prefixed keys, reject both forms on one component.
  Capabilities, 1.0 error codes, limits, `theme` split (G11). `@accessibility` → ARIA for the 1.0 catalog,
  implemented from the 1.0 spec's MUST rules (W10 as far as conformance needs). Release-contract baseline
  updated in spec, JSON and validator.
- Tasks:
  1. Split `runtime-core.ts` below 800 lines along protocol boundaries without behaviour change
  2. Add a 1.0 catalog with its own id beside the v0.9.1 catalog, deciding build-on versus alongside upstream `catalogs/basic/v1` with recorded evidence and recording the catalog-mismatch error code, and split the catalog public API by protocol version
  3. Route 1.0 envelopes through the processor's 1.0 adapter, delete the RC downgrade in `v1-compat.ts`, and translate `@`-prefixed envelope keys, rejecting a component that carries both forms
  4. Model renderer capabilities (`supportedCatalogIds`, `inlineCatalogs`, `a2uiRendererDataModel`) and 1.0 error codes, and apply resource limits to every new message type
  5. Split `theme` handling by protocol version in surface export, shadow seed and activity plan
  6. Map `accessibility` metadata to ARIA for the 1.0 catalog following the 1.0 specification's MUST rules
  7. Write spec deltas for `v3-a2ui-protocol-bridge` and `v3-release-contract`, and update the RC and AG-UI 0.0.59 baseline in `release/v3-release-contract.json` and `scripts/validate-v3-release-contract.mjs`

### 3. `a2ui-v1-functions-and-actions` — 1.0 function calls and actions under the existing policies
- Scope: runtime + headless runtime, action policy, entity-graph policy, limits, RC shim
- Depends on: 2 · Est. L · Complexity High · frontier · HIGH
- Details: `callRendererFunction` → `agentFunctionResponse` for agent-callable functions only;
  `callAgentFunction` → `rendererFunctionResponse`; D2a re-expression; UUIDv7 envelope kept;
  `requiresUserActivation`. The opt-in RC-input shim lives here because it must translate RC response-aware
  actions to the 1.0 function mechanism (D2a, D3). Carried review findings 6–10 that survive the rewrite are
  closed here (G10). Spec deltas for the three specs that require `wantResponse`/`responsePath`.
- Tasks:
  1. Implement `callRendererFunction` → `agentFunctionResponse` for agent-callable functions only, refusing others with `INVALID_FUNCTION_CALL`
  2. Implement `callAgentFunction` → `rendererFunctionResponse`, re-express response-aware actions as function calls, and bound response writes by the resource limits
  3. Emit the action envelope for 1.0 actions through the action policy and entity-graph policy, and refuse functions that require user activation when no gesture occurred
  4. Add the opt-in RC-input shim, off by default for one minor line, translating RC envelopes and RC response-aware actions to 1.0 messages and function calls
  5. Close the carried review findings 6–10 that survive the rewrite (`keysOf` versus `parsePath`, unpruned `pendingActions`, `dispose()` leaving promises live, shadow-seed `catalogId`, action-key collisions)
  6. Bring the headless runtime and surface export to parity for 1.0 functions and actions
  7. Write spec deltas for `a2ui-action-envelope`, `a2ui-headless-runtime` and `a2ui-resource-limits`

### 4. `agui-1-0-floors-and-middleware-interop` — AG-UI 1.0 ranges and the real A2UI middleware
- Scope: peers in core/react/a2ui-react, root devDependencies, lockfile, activity ingestion
- Depends on: 1 · Est. M · Complexity Medium · frontier · MEDIUM
- Details: `^1.0.0` everywhere (D5), dev pin 1.0.4, lockfile off 0.0.57 (G7), `zod` peer question settled.
  Root devDependencies for the real collaborators. Task 2 is an implementation probe (F-5, resolving the G3
  UNKNOWN), not evidence.
- Tasks:
  1. Set AG-UI peer ranges to `^1.0.0` in core, react and a2ui-react, dev-pin 1.0.4, add `@ag-ui/client`, `@ag-ui/encoder` and `@ag-ui/a2ui-middleware` (latest at execution, recorded) with its peers as root devDependencies, re-resolve the lockfile, and satisfy the non-optional `zod` peer of `@ag-ui/core` 1.0.4
  2. Map the AG-UI 1.0 event, run-outcome and `resume[]` types from the installed `@ag-ui/core` into design.md, and probe a real `@ag-ui/a2ui-middleware` stream, recording its payload shape against our `a2ui-surface` ingestion
  3. Adapt to the middleware's `a2ui_operations` shape where it differs and request a resync on `a2ui_recovery`
  4. Write the `a2ui-activity-delivery` spec delta for recovery activities

### 5. `a2a-official-a2ui-extension` — A2A on the official A2UI v1.0 extension, both directions (G2)
- Scope: `packages/entity-graph-a2a`, `scripts/verify-a2a-conformance.mjs`, packed-consumer SDK pins
- Depends on: 2, 3 · Est. L · Complexity High · frontier · MEDIUM
- Details: `@a2a-js/sdk` 1.0.1 → 1.3.0; official URI and media type; A2UI 1.0 payloads; per-turn capabilities.
  Review round 1 found `entity-graph-a2a` has no inbound A2UI action path (`handler.ts` applies graph mutations
  only), so task 4 builds one. The verifier renders received parts through the packed `a2ui-react` headless
  runtime, because it is a Node script with no browser.
- Tasks:
  1. Map `@a2a-js/sdk` 1.0.1→1.3.0 changes, bump it in `entity-graph-a2a`, and update the SDK pins in the packed-consumer scripts
  2. Replace the private extension URI and media type with the official ones and carry A2UI 1.0 payloads
  3. Send and honour per-turn renderer capabilities and omit A2UI parts when the extension is not activated
  4. Accept inbound A2UI 1.0 action and function messages from clients and route them to an application-owned handler behind a framework-free authorization callback in `entity-graph-a2a` (no dependency on the React package's policy), defaulting to deny
  5. Update `verify-a2a-conformance.mjs` to build surfaces from received parts with the packed headless runtime and take its report path as an argument, and write the `v3-a2a-conformance-agent` spec delta

### 6. `agui-1-0-chat-run-stack` — chat, copilot and stream components speak AG-UI 1.0 (W3, W7, G4–G6)
- Scope: `use-chat-session`, `entity-stream`, `EntityChat`/`EntityCopilot`/`EntityStream`, a store-owned message adapter
- Depends on: 4 · Est. L · Complexity High · frontier · HIGH
- Details: AG-UI 1.0 events including `RUN_ERROR` and `MESSAGES_SNAPSHOT`; `streamFactory` receives an
  `AbortSignal` (breaking, fits 5.0.0). The abort defect (G5) is read from code; it is demonstrated, and its fix
  shown, by a recorded reproduction before the change (task 2, a probe, not evidence) and by UPG-11 in the
  boundary run. Messages move into the graph through a store (G6, layering).
- Tasks:
  1. Replace the bespoke `StreamEvent` union with AG-UI 1.0 events (run lifecycle including `RUN_ERROR`, text messages, tool calls and results, reasoning, state, `MESSAGES_SNAPSHOT`) in `use-chat-session` and `entity-stream`, and pass an `AbortSignal` to `streamFactory`
  2. Record a reproduction of the no-op abort against the current code in design.md (implementation probe, not evidence), then make cancellation stop earlier streams on send, clear and unmount and drop events that arrive after abort
  3. Move chat messages into the entity graph through a store-owned adapter that the hooks read from
  4. Update `EntityChat`, `EntityCopilot` and `EntityStream` to the new hook contract, including reasoning and tool-result rendering, and update the `StreamEvent` uses in the `verify-a2ui-protocol-bridge.mjs` consumer fixtures
  5. Write the `agui-run-stack` spec

### 7. `agui-interrupt-approvals` — interrupt/resume tied to the entity action policy (W4)
- Scope: run-stack store, `EntityApproval`, action policy decisions
- Depends on: 3, 6 · Est. M · Complexity High · frontier · MEDIUM
- Details: `RUN_FINISHED.outcome` interrupts and `RunAgentInput.resume[]`; approve, deny, edit-before-approve,
  each decided and audited by the entity action policy. Draft wire mapping isolated in one module.
- Tasks:
  1. Model interrupt outcomes and `resume[]` in the run-stack store, isolating the Draft wire mapping in one module
  2. Add approve, deny and edit-before-approve to `EntityApproval`, routed through the entity action policy with audited decisions
  3. Write the `agui-interrupt-approvals` spec

### 8. `a2ui-governed-actions-graph-binding-design` — design only for W5 and W6
- Scope: design documents; no shipped code, no exports
- Depends on: 3 · Est. S · Complexity Medium · frontier · LOW (enables the next phase)
- Details: Design record plus a throwaway spike against `data-reconcile.ts`; nothing merged into packages. Its
  spec delta is a documentation requirement (`a2ui-design-records`: both design records exist with a threat
  model and a conflict policy), so it follows the normal validate and archive path. Added 2026-11-12 per the
  recalled lesson "Require spec deltas before accepting /kbd-plan OpenSpec changes".
- Tasks:
  1. Write the W5 design: attested approvals through `action.metadata.extensions`, with a threat model
  2. Write the W6 design: reconciling `updateDataModel`/`sendDataModel` with graph entities under an explicit conflict policy, with spike measurements on a throwaway branch

### 9. `examples-a2ui-1-0-migration` — every example that uses `a2ui-react` emits 1.0
- Scope: `examples/agentic-a2ui-app`, `examples/agentic-a2ui`, `examples/agui-activity-lab`, Flutter spec text
- Depends on: 2, 3, 4, 5, 6 · Est. M · Complexity Medium · medium · HIGH
- Details: Before each migration, the task records the example's current envelope stream (from its producer
  module or activity stream, since two examples produce in the browser) as a digested fixture; UPG-14's negative
  control runs its assertion against those recordings.
- Tasks:
  1. Migrate `examples/agentic-a2ui-app` producers, fixtures and A2A client to A2UI 1.0 and `@a2a-js/sdk` 1.3.0, after recording its pre-migration envelope stream as a digested fixture
  2. Migrate `examples/agentic-a2ui` producers and A2A client to A2UI 1.0 and `@a2a-js/sdk` 1.3.0, after recording its pre-migration envelope stream as a digested fixture
  3. Migrate `examples/agui-activity-lab` producers to A2UI 1.0 and AG-UI 1.0.4, after recording its pre-migration envelope stream as a digested fixture
  4. Write spec deltas for `v3-agentic-a2ui-example` and `v3-flutter-riverpod-a2ui-example`

### 10. `a2ui-v1-conformance-harness` — upstream conformance cases against the built renderer (W2)
- Scope: harness directory, `verify:a2ui-conformance` script, spec
- Depends on: 1–7, 9 (all production work) · Est. M · Complexity Medium · frontier · HIGH
- Details: Acceptance infrastructure, so it is authored after production work (A-9). Framework-adapter tier only
  (`core/adapter_conformance.yaml`, `core/accessibility.yaml`) at a pinned upstream commit, driving the built
  renderer in Chromium. This change alone owns `verify:a2ui-conformance`.
- Tasks:
  1. Pin the upstream conformance suite at a recorded commit with per-file content digests
  2. Build the framework-adapter harness from the upstream implementation guide, driving the built `a2ui-react` in Chromium
  3. Add the `verify:a2ui-conformance` script with a mutated-case negative control and a report path argument, and write the `a2ui-v1-conformance` spec

### 11. `a2ui-1-0-release-sync` — acceptance authoring, docs, skills, changesets, review, the boundary run
- Scope: scripts, both doc trees, website API reference, skills, changesets, evidence
- Depends on: 1–10 · Est. L · Complexity Medium · frontier · HIGH
- Details: Remaining acceptance scripts authored now (A-9). Review runs **before** the boundary so its fixes do
  not invalidate receipts. The boundary runs once; a repair reruns, in a new timestamped folder, every scenario
  whose keyed inputs the repair changed, counted against the repair budget.
- Tasks:
  1. Author `verify:a2ui-v1`, `verify:agui-run-stack` and `verify:a2ui-examples` with their negative controls and report path arguments; a `capture:a2ui-visual` script that writes into the boundary folder with `verify-a2ui-visual-evidence.mjs` retargeted to read it; the TS2835 control consumer and the zod-resolution assertion in `verify-package-contracts.mjs`; and the scratch-copy control for `verify:skills`
  2. Update `site/docs` and `website/docs` with the 1.0 migration guide, client-only basic catalog, RC-input shim, AG-UI `^1.0.0` and the A2A extension
  3. Run `pnpm run refresh:exports`, update the skill docs, regenerate the website packed API reference and search index, and make `pnpm run verify:skills` pass
  4. Add the major changeset for the fixed group and CHANGELOG entries, without tagging or publishing
  5. Run isolated adversarial review of the cumulative diff and the sycophancy screen, and fix CRITICAL findings before the boundary run
  6. Run the boundary packet once, rerunning only scenarios affected by a repair, and record receipts in a new dated evidence folder
  7. Archive the changes whose scenarios passed

## EXECUTION ROUND ORDER

Default execution is **sequential in one worktree** (A-10: changes 2, 3, 4 and 6 all touch
`packages/a2ui-react`). Parallel work needs separate worktrees and an explicit operator reason.

- Round 1: 1
- Round 2: 2, 4
- Round 3: 3, 6
- Round 4: 5, 7, 8
- Round 5: 9
- Round 6: 10
- Round 7: 11

## Scenario → task coverage (frozen IDs; full definitions in `adopted-contract.json`)

| ID | Scenario | Owner tasks | Boundary command |
| --- | --- | --- | --- |
| UPG-1 | Conformant 1.0 surface renders through the built package; RC envelope refused with the shim off | a2ui-v1-native-surfaces#3, a2ui-1-0-release-sync#1 | `verify:a2ui-v1` |
| UPG-2 | Real `@ag-ui/a2ui-middleware` surface renders identically to the same operations sent directly; `a2ui_recovery` triggers one resync | agui-1-0-floors-and-middleware-interop#1,3 | `verify:a2ui-v1` |
| UPG-3 | Upstream adapter + accessibility conformance cases at the pinned commit pass against the built renderer | a2ui-v1-conformance-harness#1-3, a2ui-v1-native-surfaces#6 | `verify:a2ui-conformance` |
| UPG-4 | 1.0 message naming the v0.9.1 catalog refused with the recorded catalog-mismatch code; `catalogId` resolution | a2ui-v1-native-surfaces#2 | `verify:a2ui-v1` |
| UPG-5 | Bare and `@`-prefixed keys render identically; both forms on one component rejected | a2ui-v1-native-surfaces#3 | `verify:a2ui-v1` |
| UPG-6 | `callRendererFunction` answered for agent-callable functions; renderer-only refused with `INVALID_FUNCTION_CALL` | a2ui-v1-functions-and-actions#1 | `verify:a2ui-v1` |
| UPG-7 | `callAgentFunction` → `rendererFunctionResponse` writes within limits; policy-denied and oversize refused | a2ui-v1-functions-and-actions#2,3 | `verify:a2ui-v1` |
| UPG-8 | (rare, critical) user-activation function without a gesture refused | a2ui-v1-functions-and-actions#3 | `verify:a2ui-v1` |
| UPG-9 | Real A2A exchange on the official extension: surface built from received parts, client action handled by the agent; no A2UI parts without activation | a2a-official-a2ui-extension#2-5 | `verify-a2a-conformance.mjs` |
| UPG-10 | Real AG-UI 1.0 stream drives `EntityChat`; messages land in the graph and show in a second view | agui-1-0-chat-run-stack#1,3,4 | `verify:agui-run-stack` |
| UPG-11 | Superseded stream makes zero graph writes after abort | agui-1-0-chat-run-stack#2 | `verify:agui-run-stack` |
| UPG-12 | Interrupt → approve/edit/deny → resume, decided by the entity action policy | agui-interrupt-approvals#1,2 | `verify:agui-run-stack` |
| UPG-13 | Headless export round-trips a 1.0 surface without `theme`; v0.9.1 keeps it | a2ui-v1-native-surfaces#5, a2ui-v1-functions-and-actions#6 | `verify:a2ui-v1` |
| UPG-14 | The three examples run 1.0 end to end from their built output; every captured envelope is `"1.0"` | examples-a2ui-1-0-migration#1-3 | `verify:a2ui-examples` |
| UPG-15 | Packed consumers type-check with `skipLibCheck: false`; zod advisory stays closed | a2ui-0-15-library-baseline#2-5 | `verify:a2ui-bridge`, `verify:package-contracts` |
| UPG-16 | (delivery only) exports manifest, skills, release contract and generated docs in sync | a2ui-1-0-release-sync#1,3, a2ui-v1-native-surfaces#7 | `verify:skills`, `validate`, `docs:artifacts:check` |
| UPG-17 | RC shim off by default; when enabled, RC envelopes and RC response-aware actions become 1.0 messages and function calls | a2ui-v1-functions-and-actions#4 | `verify:a2ui-v1` |

Change 8 owns no scenario (ships nothing). Tasks without a scenario (changelog mapping, `runtime-core` split,
spec deltas, docs, changesets, review, archive) are covered by UPG-16, by review, and by the receipts' source
digests.

## TASK MODEL ASSIGNMENTS

**Discovery, 2026-11-12.** Harness: Claude Code desktop, this session on `claude-opus-5-5`. The Agent tool
accepts a per-subagent `model` override (`opus`, `sonnet`, `haiku`, `fable`), observed in this session's tool
schema and exercised once (the plan review ran on `fable`). Its `effort` override may be set only when the
operator asks, so reasoning effort is **inherited (not set)** for every row. liter-llm: the
`plugin:prometheus-skill-pack:liter-llm` MCP server failed to connect and the model preflight reported a
judge/producer collision, so **no external route is verified**; every row is native. No local capability
results exist for these models on this repo's tasks, so every rationale is **weak evidence** (judged from the
task text).

**Profiles**
- **D** — Anthropic `claude-opus-5-5`, effort inherited. Protocol, runtime and security-boundary work,
  ambiguous upstream behaviour, cross-file invariants. Route: native; the active session executes.
- **I** — Anthropic `claude-sonnet-5-5`, effort inherited. Well-specified mechanical migration whose target
  shape is fixed by D tasks. Route: native Agent tool, `model: "sonnet"`.
- **R** — Anthropic `claude-fable-5-2`, effort inherited. Isolated review, a different model from every
  producer (same vendor; cross-vendor independence not claimed). Route: native Agent tool, `model: "fable"`,
  prompt = mandate + artifact only.

**Worker contract (every row):** scope = the one task; working directory = repository root (or the change's
worktree if one is created); tools = Read, Edit, Write, Bash, Grep; skills = none beyond project rules; result
handed back to the active `kbd-apply` driver, which alone begins and ends tasks. Native alternative = same
profile (no other route verified). Availability = **configured, not verified on these tasks**. Every row after
`a2ui-0-15-library-baseline#2` requires the dependencies it installs.

| Phase path | Change ID | Backend task ID | Requirements | Profile | Rationale (2026-11-12, weak) | Prerequisites |
| --- | --- | --- | --- | --- | --- | --- |
| phase-a2ui-1-0-agui-upgrade | a2ui-0-15-library-baseline | a2ui-0-15-library-baseline#1 | High reasoning; changelogs against code; large context | D | Mapping breaking changes needs judgement | none |
| phase-a2ui-1-0-agui-upgrade | a2ui-0-15-library-baseline | a2ui-0-15-library-baseline#2 | Medium; patch over generated `.d.ts`; shell | D | Security-relevant patch (GHSA) | network |
| phase-a2ui-1-0-agui-upgrade | a2ui-0-15-library-baseline | a2ui-0-15-library-baseline#3 | High; declaration bundling for consumers | D | Published-type contract | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-0-15-library-baseline | a2ui-0-15-library-baseline#4 | High; API migration with new enforcement | D | Behaviour-preserving migration | #1, #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-0-15-library-baseline | a2ui-0-15-library-baseline#5 | Low; pin updates in scripts and docs | I | Mechanical | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-native-surfaces | a2ui-v1-native-surfaces#1 | High; refactor 925-line core | D | Invariant-heavy refactor | change 1 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-native-surfaces | a2ui-v1-native-surfaces#2 | High; catalog design, adopt-vs-build | D | Core design decision | #1 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-native-surfaces | a2ui-v1-native-surfaces#3 | High; protocol routing, key translation | D | Wire correctness | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-native-surfaces | a2ui-v1-native-surfaces#4 | Medium–high; capabilities, codes, limits | D | Trust-boundary limits | #3 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-native-surfaces | a2ui-v1-native-surfaces#5 | Medium; version split in three modules | D | Cross-module invariant | #3 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-native-surfaces | a2ui-v1-native-surfaces#6 | Medium; ARIA mapping per spec | D | Accessibility rules need care | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-native-surfaces | a2ui-v1-native-surfaces#7 | Medium; spec + release JSON + validator | D | Requirements match behaviour | #2–#6 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-functions-and-actions | a2ui-v1-functions-and-actions#1 | High; agent→renderer boundary | D | Security boundary | change 2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-functions-and-actions | a2ui-v1-functions-and-actions#2 | High; RC semantics re-expressed | D | Semantic translation with limits | #1 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-functions-and-actions | a2ui-v1-functions-and-actions#3 | High; policy, user activation | D | Authorization boundary | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-functions-and-actions | a2ui-v1-functions-and-actions#4 | Medium–high; opt-in shim | D | Must not weaken defaults | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-functions-and-actions | a2ui-v1-functions-and-actions#5 | Medium; carried defects | D | Lifecycle and keying correctness | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-functions-and-actions | a2ui-v1-functions-and-actions#6 | Medium; headless parity | D | Shared-core consistency | #3 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-functions-and-actions | a2ui-v1-functions-and-actions#7 | Medium; three spec deltas | D | Behaviour-changing requirements | #1–#6 |
| phase-a2ui-1-0-agui-upgrade | agui-1-0-floors-and-middleware-interop | agui-1-0-floors-and-middleware-interop#1 | Low–medium; ranges, devDeps, lockfile | I | Mechanical once D5 adopted | change 1 |
| phase-a2ui-1-0-agui-upgrade | agui-1-0-floors-and-middleware-interop | agui-1-0-floors-and-middleware-interop#2 | Medium; real-service probe | D | UNKNOWN shape needs interpretation | #1, network |
| phase-a2ui-1-0-agui-upgrade | agui-1-0-floors-and-middleware-interop | agui-1-0-floors-and-middleware-interop#3 | Medium; ingestion adaptation | D | Delivery guarantees must hold | #2 |
| phase-a2ui-1-0-agui-upgrade | agui-1-0-floors-and-middleware-interop | agui-1-0-floors-and-middleware-interop#4 | Low–medium; spec delta | D | Matches observed behaviour | #3 |
| phase-a2ui-1-0-agui-upgrade | a2a-official-a2ui-extension | a2a-official-a2ui-extension#1 | Medium; SDK changelog, bump, pins | D | Breaking-change judgement | changes 2, 3 |
| phase-a2ui-1-0-agui-upgrade | a2a-official-a2ui-extension | a2a-official-a2ui-extension#2 | Medium; protocol constants, payloads | D | Interop correctness | #1 |
| phase-a2ui-1-0-agui-upgrade | a2a-official-a2ui-extension | a2a-official-a2ui-extension#3 | Medium; capability negotiation | D | Per-turn rule | #2 |
| phase-a2ui-1-0-agui-upgrade | a2a-official-a2ui-extension | a2a-official-a2ui-extension#4 | High; inbound action path under policy | D | New trust boundary | #2 |
| phase-a2ui-1-0-agui-upgrade | a2a-official-a2ui-extension | a2a-official-a2ui-extension#5 | Medium; verifier + spec | D | Oracle and requirement | #4 |
| phase-a2ui-1-0-agui-upgrade | agui-1-0-chat-run-stack | agui-1-0-chat-run-stack#1 | High; event model, breaking API | D | Public API design | change 4 |
| phase-a2ui-1-0-agui-upgrade | agui-1-0-chat-run-stack | agui-1-0-chat-run-stack#2 | High; concurrency, cancellation | D | Defect fix | #1 |
| phase-a2ui-1-0-agui-upgrade | agui-1-0-chat-run-stack | agui-1-0-chat-run-stack#3 | High; graph ownership, layering | D | Architectural rule | #1 |
| phase-a2ui-1-0-agui-upgrade | agui-1-0-chat-run-stack | agui-1-0-chat-run-stack#4 | Medium; component updates | I | Shape fixed by #1, #3 | #3 |
| phase-a2ui-1-0-agui-upgrade | agui-1-0-chat-run-stack | agui-1-0-chat-run-stack#5 | Medium; capability spec | D | Requirements match API | #1–#4 |
| phase-a2ui-1-0-agui-upgrade | agui-interrupt-approvals | agui-interrupt-approvals#1 | High; Draft upstream fields | D | Uncertain spec | changes 3, 6 |
| phase-a2ui-1-0-agui-upgrade | agui-interrupt-approvals | agui-interrupt-approvals#2 | High; approval UX under policy | D | Authorization boundary | #1 |
| phase-a2ui-1-0-agui-upgrade | agui-interrupt-approvals | agui-interrupt-approvals#3 | Medium; spec | D | Requirements | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-governed-actions-graph-binding-design | a2ui-governed-actions-graph-binding-design#1 | High; threat modelling | D | Security design | change 3 |
| phase-a2ui-1-0-agui-upgrade | a2ui-governed-actions-graph-binding-design | a2ui-governed-actions-graph-binding-design#2 | High; reconciliation design + spike | D | Differentiator design | change 3 |
| phase-a2ui-1-0-agui-upgrade | examples-a2ui-1-0-migration | examples-a2ui-1-0-migration#1 | Medium; fixture/producer migration | I | Shape fixed by changes 2, 3, 5 | changes 2, 3, 5 |
| phase-a2ui-1-0-agui-upgrade | examples-a2ui-1-0-migration | examples-a2ui-1-0-migration#2 | Medium; same | I | Same | changes 2, 3, 5 |
| phase-a2ui-1-0-agui-upgrade | examples-a2ui-1-0-migration | examples-a2ui-1-0-migration#3 | Medium; same | I | Same | changes 2, 4, 6 |
| phase-a2ui-1-0-agui-upgrade | examples-a2ui-1-0-migration | examples-a2ui-1-0-migration#4 | Low–medium; spec deltas | D | D7 wording | #1–#3 |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-conformance-harness | a2ui-v1-conformance-harness#1 | Low; vendoring with digests | I | Fully specified | network |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-conformance-harness | a2ui-v1-conformance-harness#2 | High; harness design, browser driving | D | New infrastructure | #1, Chromium |
| phase-a2ui-1-0-agui-upgrade | a2ui-v1-conformance-harness | a2ui-v1-conformance-harness#3 | Medium; script, negative control, spec | D | Oracle discrimination | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-1-0-release-sync | a2ui-1-0-release-sync#1 | High; acceptance oracles, visual capture | D | Oracle discrimination | changes 1–10 |
| phase-a2ui-1-0-agui-upgrade | a2ui-1-0-release-sync | a2ui-1-0-release-sync#2 | Medium; two doc trees | I | Content fixed by behaviour | changes 1–10 |
| phase-a2ui-1-0-agui-upgrade | a2ui-1-0-release-sync | a2ui-1-0-release-sync#3 | Low–medium; generators, skills | I | Mechanical with generators | #2 |
| phase-a2ui-1-0-agui-upgrade | a2ui-1-0-release-sync | a2ui-1-0-release-sync#4 | Low; changeset text | I | Mechanical | #3 |
| phase-a2ui-1-0-agui-upgrade | a2ui-1-0-release-sync | a2ui-1-0-release-sync#5 | High; isolated review | R | Reviewer differs from producers | #1–#4 |
| phase-a2ui-1-0-agui-upgrade | a2ui-1-0-release-sync | a2ui-1-0-release-sync#6 | Medium; boundary run, receipts | D | Evidence integrity | #5 |
| phase-a2ui-1-0-agui-upgrade | a2ui-1-0-release-sync | a2ui-1-0-release-sync#7 | Low; archive | I | Mechanical, gated on receipts | #6 |

## Contract binding

- **Contract:** `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/adopted-contract.json`
- **Digest:** `sha256:19abd871d19898ac0e8a9f7e6b2ae6ed0841592b0abd7c9f9668c2fc15f3a575` (normalization
  `jq -S -c 'del(.identity.contractDigest) | del(.identity.planRevision)'`), adopted 2026-11-12 as canonical
  decision `contract-adoption-phase-a2ui-1-0-agui-upgrade-19abd871` at plan revision 10, binding revision 1.
  **Superseded 2026-11-12** by `sha256:a33d62a77ab524d0b149f56294e4ee72aba9937774afb25ca96acda16b2a54f5`
  (decision `contract-adoption-phase-a2ui-1-0-agui-upgrade-a33d62a7`, binding revision 2): owner-task ids changed
  from `<change>#<n>` to `<change>/<n>` only. Signed manifest `amendment-owner-ids-1.json(.sig)`; the signature
  was produced by the agent with the operator's `~/.ssh/id_ed25519` on the operator's explicit chat instruction
  ("sign the contract for me"). Method: `implementation-first` (operator-selected).
- **Freshness / evidence-invalidation keys:** source digests of `packages/a2ui-react`,
  `packages/entity-graph-a2a`, `packages/entity-graph-core/src/agent` and the three migrated examples; the pinned
  conformance commit; `pnpm-lock.yaml`; fixture digests; plan revision.
- **Budgets:** 3,600 min, 4,000 tool calls, 10 repair attempts, no-progress limit 3, tokens UNKNOWN (fallback:
  time and tool calls). Exhaustion = checkpoint + BLOCKED.
- **Boundary execution packet:** `adopted-contract.json → boundaryPacket`. All commands run in one shell
  session. Approvals: operator adoption of the contract; separate approval for tag, publish or merge.

## Review record

Round 1 (`review/plan/round-1/findings.json`, judge `claude-fable-5-2`, harness-native, distinct model from the
producer): **BLOCK**, 3 CRITICAL / 13 WARNING / 2 SUGGESTION. All three CRITICALs were checked against the code
and are addressed: #75 consumer reach (`a2ui-0-15-library-baseline#3`), the visual lane's pinned artifact hash
(`a2ui-1-0-release-sync#1` and the boundary capture), and A2A inbound actions (`a2a-official-a2ui-extension#4`,
change 5 now depends on change 3). Warnings addressed: budget, review before boundary, conformance ownership and
A-9 timing, G5 wording and stale-history removal, UPG-14 and UPG-16 negative controls, PATH and evidence paths,
release-contract baseline, real collaborators, RC shim moved after the function mechanism, W3 and G10 scope.

Round 2 (`review/plan/round-2/findings.json`, same judge model, fresh context): **PASS**, 0 CRITICAL / 10
WARNING / 3 SUGGESTION. Fixed before the digest was stamped: boundary setup (evidence parent created, a
timestamped folder per run so a repair rerun never collides or overwrites, `build:packages` before capture and
the A2A command), owners for the UPG-14 recordings and the UPG-15/UPG-16 controls, a pre-fix reproduction of G5,
the A2A authorization seam made framework-free, change 6 updating the bridge fixtures' `StreamEvent` uses, an
AG-UI type-mapping step before change 6, the D4 narrowing flagged above, and `validate` plus
`docs:artifacts:check` added to UPG-16. Remaining items are listed under "Unresolved review findings".

## Unresolved review findings (carried to execute)

- **Repair reruns are wide.** 15 of 17 scenarios key to the `packages/a2ui-react` digest, so a repair there
  reruns most of the boundary. Accepted: narrowing the keys would weaken invalidation.
- **UPG-4's expected error code is fixed by the implementer** (recorded in design.md by
  `a2ui-v1-native-surfaces#2` before acceptance authoring). Accepted, because upstream 0.15.0 is the authority for
  the code and it is unknown until the processor is read; the code is frozen in design.md before
  `a2ui-1-0-release-sync#1` writes the oracle.
- **UPG-3 has no rule for an upstream case that cannot pass.** Such a case is reported FAIL with its case id;
  excluding it needs an operator-adopted amendment.
- **`RUN_ERROR` and `MESSAGES_SNAPSHOT` are implemented but no oracle exercises them.** `a2ui-1-0-release-sync#1`
  should add them to UPG-10's scripted stream; if it does not, they are reported NOT_EXERCISED.
- **No explicit Chromium presence check** before the browser lanes; a missing browser surfaces as BLOCKED.

## COMMANDS TO RUN

Through the managed runner (`node "$KBD_ORCHESTRATOR_ROOT/shared/openspec/cli.mjs" run --project . -- …`), in
change order: `new change <id>` for each of the 11 change IDs above.

PLAN COMPLETE
