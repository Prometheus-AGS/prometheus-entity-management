# ASSESSMENT: phase-a2ui-1-0-agui-upgrade

- **Project:** prometheus-entity-management (packages at 4.4.0)
- **Date:** 2026-11-11
- **Codebase baseline:** `@prometheus-ags/a2ui-react` 4.4.0 accepts A2UI **1.0 release-candidate** envelopes
  (`version: "v1.0"`) and rewrites every message to **v0.9.1** before handing it to the official
  `@a2ui/web_core@0.12.0` `v0_9` processor. A2UI 1.0 final changed the wire format after that bridge
  was written, so the bridge no longer speaks A2UI 1.0.
- **Cross-tool progress:** none. The phase was created this session; `progress.json` has 0 changes.

## How to read the evidence tags

Every claim carries one tag.

| Tag | Meaning |
| --- | --- |
| `[code]` | I read it in this repository at `a8f543dc`. Not executed. |
| `[checked]` | I confirmed it myself in a downloaded upstream copy (A2UI clone at `0d2fcf3`, `@a2ui/web_core@0.15.0` tarball). |
| `[research]` | Reported by a web-research subagent with a primary-source citation. I did not re-check it. |
| `[prior]` | Recorded by the previous phase (`phase-v4-a2ui-runtime-hardening`). |
| `[review]` | Raised by the isolated adversarial reviewer (round 1) with evidence. Tagged `[checked]` instead where I re-confirmed it. |
| `UNKNOWN` | Not established. Needs a probe or an operator answer. |

**Revision note.** Two isolated review rounds ran; both returned BLOCK with one CRITICAL each, and
both CRITICALs held up when I checked them. Round 1: the first draft compared wire formats only and
never checked the `@a2ui/*` 0.12.0 → 0.15.0 library API changes (now G13). Round 2: the corrected D2
still ignored the processor's catalog-version gate (now in D2). Two rounds is the skill's cap, so
the findings not fully closed are listed in the **Unresolved review findings** section at the end
for planning to see. Both judges were the same model as the producer (`same-model-collision`):
no distinct judge model is configured, so this is not a cross-model review.

Nothing in this assessment was established by running a build or a test. Assess is a fact-finding
stage and the project rule (A-9) forbids running test suites as development gates.

## Recalled lessons that apply

- *"Reproduce an issue's own condition in the acceptance harness before calling it fixed"* [prior].
  This shapes the acceptance design: a v1.0 conformance claim must be backed by the upstream
  `conformance/` YAML suite run against our renderer, not by our own hand-written fixtures.
- *"A red gate can hide stale assertions behind it"* [prior]. `verify:a2ui-bridge` and
  `verify:package-contracts` have been red since the 0.12.0 bump (#75). Everything behind them, the
  packed ESM consumer typecheck and the visual lane, is UNKNOWN, not passing. Moving to 0.15.0 does
  **not** fix #75 (see Gap G8).
- *"Do not tag or commit a version that has consumers in the wild; ask which version the work belongs
  to before preparing a release"* [prior]. This phase contains wire-breaking changes, so the release
  line is put to the operator as decision D3 rather than assumed.
- *"State needs from the operator as one concrete decision with a recommendation"* [prior]. The
  decisions section below follows that form.
- The two session lessons in `prior-context.md` (OpenSpec 2.0 migration, phase creation) are
  session records, not design lessons. They have no bearing on this assessment.

## Knowledge gaps

`prior-context.md` records none.

---

## 1. Target versions (research, spot-checked)

### A2UI

- **1.0 is the current protocol version.** `specification/versions.json` lists v1.0 `current`,
  v0.9.1 and v0.9 `previous`, v0.8 `deprecated` [checked]. It was marked current on 2026-11-06
  (PR #3999) [research]. The spec README says it is stable and that 1.0 was previously called 0.10
  [research].
- **There is no git tag or GitHub release for 1.0** [research]. The repository moved from
  `google/A2UI` to `a2ui-project/a2ui` [research].
- **Latest npm release:** `@a2ui/web_core`, `@a2ui/react` and `@a2ui/lit` at **0.15.0** (2026-11-02);
  `@a2ui/angular` 0.14.0; `@a2ui/markdown-it` 0.2.2; `@a2ui/agent` 0.1.0; `@a2ui/catalog-mcp` 0.0.3
  [research].
- `@a2ui/web_core@0.15.0` exports `./v1_0`, and still exports `./v0_8` and `./v0_9` [checked]. Its
  schemas pin `"const": "1.0"` [checked].
- **There is one multi-version processor, not a separate 1.0 path.** `src/v1_0/index.d.ts` re-exports
  the same `../processing/index.js` and `../state/index.js` that the `v0_9` entry uses, and the adapter
  factory registers `['1.0', new V1Point0Adapter()]` alongside the 0.9 adapters [checked]. The
  `MessageProcessor` this repo already imports from `@a2ui/web_core/v0_9` can therefore take 1.0
  messages directly. 0.12.0 already shipped a 1.0 adapter: this repo's own 0.12.0 patch touches
  `src/processing/adapters/v1_0.d.ts` and `src/v1_0/**` [review]. Why the RC bridge downgraded to
  v0.9.1 anyway is not documented in the code; a likely reason is that the React basic catalog was
  v0.9-only, but that is an inference.
- `@a2ui/react@0.15.0` has no `./v1_0` subpath [research], but its `A2uiSurface` consumes the shared
  `SurfaceModel` and its unit tests run upstream `conformance/core/adapter_conformance.yaml`
  (protocolVersion `"1.0"`, 13 adapter cases) [review]. End-to-end rendering of v1.0 through our
  wrapper is still unproven until our own flows run it.
- **The target is still moving.** PR #4044 (merged 2026-11-11) renames component envelope keys to
  `@catalogId`, `@metadata`, `@accessibility`, `@checks`. It is in no npm release yet; 0.15.0 still
  uses the bare keys [research]. During the transition SDKs accept bare legacy keys and reject a
  component that carries both forms [research].

### AG-UI

- `@ag-ui/core`, `client`, `encoder`, `proto`: **1.0.4** (2026-11-05). 1.0.0 shipped 2026-09-17; the
  last 0.x was 0.0.59 (2026-08-27) [research].
- 1.0 removed the five `THINKING_*` events in favour of `REASONING_*`; `@ag-ui/client` translates the
  old names until 2027-09-17 [research].
- Interrupts: `RUN_FINISHED.outcome` can be `{type:"interrupt", interrupts[]}`, resumed through
  `RunAgentInput.resume[]` [research]. The outcome fields are still marked **Draft** in the docs
  [research].
- 1.0 is stricter: the client drops unknown events and strips unknown properties; optional fields
  must be omitted rather than `null` [research].
- Whether `zod` is a required peer of `@ag-ui/core@1.0.4` is UNKNOWN: the changelog, `package.json`
  and docs disagree [research].
- `@ag-ui/a2ui-middleware` 0.0.15 (2026-11-10) carries A2UI as activity type `"a2ui-surface"`, with
  recovery activities typed `"a2ui_recovery"`, and its toolkit still emits **A2UI v0.9**
  [research].

### A2A

- A2A spec v1.0.1 (2026-05-28); `@a2a-js/sdk` latest **1.3.0** (2026-09-29). This repo pins **1.0.1**
  [research, code].
- Official A2UI extension URI: `https://a2ui.org/a2a-extension/a2ui/v1.0`. Payloads are DataParts
  with media type `application/a2ui+json`. Renderer capabilities travel per turn in
  `message.metadata["a2uiRendererCapabilities"]` [research].

### Flutter

- The Flutter example pins `genui: 0.10.2` [code]. Which A2UI version that renders is UNKNOWN. The
  research found a latest `genui` git tag of v0.9.2, which is lower than the pinned 0.10.2, so the
  research result is itself unreliable here.
- Upstream now also ships an official Flutter renderer, `a2ui_flutter` 0.3.0, beside `a2ui_core`
  0.7.0 (`dart/` in the A2UI repo) [review]. That is an alternative to `genui` for D7.

---

## 2. Implementation status

| Area | Status | Detail |
| --- | --- | --- |
| A2UI 1.0 wire format (React runtime) | **PARTIAL** | Speaks the RC dialect; mismatches 1.0 final on version string, function messages, binding syntax and more (G1). |
| A2UI v0.9 / v0.9.1 input | DONE | Native through the official `v0_9` processor [code]. Needed long-term because AG-UI's own A2UI middleware emits v0.9 [research]. |
| 1.0 messages through the processor's own 1.0 adapter | **MISSING** | Every v1.0 message is downgraded to v0.9.1 (`normalizeA2uiV1Message`) [code], although the processor already imported has a `'1.0'` adapter [checked]. |
| `@a2ui/*` library API at 0.15.0 | **MISSING** | 0.12.0 → 0.15.0 removes APIs this repo imports (G13). |
| A2A transport of A2UI | **PARTIAL** | Carries v0.9.1 under a Prometheus-owned extension URI, not the official v1.0 extension (G2). |
| AG-UI A2UI activity delivery | DONE for `a2ui-surface` | Idempotent redelivery, versioned deltas, resync [prior, code]. `a2ui_recovery` is ignored (G3). |
| AG-UI event coverage (chat stack) | **PARTIAL** | Bespoke event names; no run lifecycle, interrupts, reasoning, subagents or tool results (G4). |
| AG-UI state ingestion into the graph | DONE | `STATE_SNAPSHOT` / `STATE_DELTA` (RFC 6902) through `entity-graph-core/agent` [code]. |
| Stream cancellation | **DEFECT** | Abort is a no-op (G5). |
| Action policy / authorization | DONE | Application-owned action policy and entity-graph policy [code, prior]. |
| Resource limits | DONE | Enforced by default; defaults are estimates, not measurements [prior]. |
| Headless runtime + surface export | DONE | [prior]. Export and shadow seed still carry `theme`, which v1.0 removed (G11). |
| Release gates | **FAIL (known)** | `verify:a2ui-bridge`, `verify:package-contracts` red on #75 [prior]; unchanged by 0.15.0 (G8). |

## 3. Gaps

### G1. The "v1.0" bridge does not speak A2UI 1.0 final `[code]` + `[checked]`/`[research]`

`packages/a2ui-react/src/official/v1-compat.ts` was written against the RC.

| Concern | This repo (RC bridge) | A2UI 1.0 final |
| --- | --- | --- |
| Version string | `"v1.0"` (`PROMETHEUS_A2UI_RC_PROTOCOL_VERSION`) | `"1.0"` [checked] |
| Agent → renderer function call | `callFunction` + `functionCallId` | `callRendererFunction` [checked] |
| Agent → renderer function result | `actionResponse` + `actionId` | `agentFunctionResponse` [checked] |
| Renderer → agent messages | `action` envelope with Prometheus action ids | `action`, `callAgentFunction`, `rendererFunctionResponse`, `error` [research] |
| Response request on actions | `action.event.wantResponse` / `responsePath`, stripped before processing | **Not allowed.** 1.0 `Action.event` permits only `name`, `userMessage`, `context`, with `additionalProperties: false`; `wantResponse` appears nowhere in `specification/v1_0` [checked]. The RC response-aware action has no 1.0 equivalent; the nearest 1.0 mechanism is `callAgentFunction` / `rendererFunctionResponse`. |
| Data binding | bare `path` / `call` objects (v0.9 semantics) | `{"@path"}` / `{"@call"}`; bare objects are literal data [research] |
| Theme | tracked and compared (G11) | removed; strict validation rejects it [research] |
| Catalogs | single catalog per surface, per-component `catalogId` must match | mixable: component `@catalogId` → surface `catalogId` → error; catalogs carry `protocolVersion: "1.0"` [research] |
| Capabilities | not modelled | `supportedCatalogIds` (required), `inlineCatalogs`, `a2uiRendererDataModel` [research] |
| Error codes | own error strings | new codes incl. `INVALID_FUNCTION_CALL`, `EXPRESSION_ERROR`, `UNALLOWED_PARENT/CHILD` [research] |
| Media type | `application/json+a2ui` (`entity-graph-a2a/src/types.ts:12`) | `application/a2ui+json` [research] |

Consequence: a conformant A2UI 1.0 producer is rejected (`z.literal("v1.0")` fails on `"1.0"`), and
our RC producers' output would be rejected by conformant 1.0 renderers.

### G2. A2A carries A2UI v0.9.1 under a private extension URI `[code]`

`packages/entity-graph-a2a/src/types.ts` defines `PROMETHEUS_A2UI_EXTENSION_URI =
".../extensions/a2ui/v0.9.1"`. The React path speaks RC 1.0 while the A2A path speaks v0.9.1, so the
two transports already disagree. The official extension is `https://a2ui.org/a2a-extension/a2ui/v1.0`
with per-turn capability negotiation [research]. `@a2a-js/sdk` is pinned at 1.0.1; latest is 1.3.0
[research].

### G3. AG-UI A2UI middleware interop `[research]` + `[code]`

`@ag-ui/a2ui-middleware` emits activity type `a2ui-surface` (matches ours) with A2UI **v0.9**
operations under `a2ui_operations`, plus `a2ui_recovery` activities. The runtime skips any activity
type other than `a2ui-surface` [code], which satisfies the AG-UI rule that consumers tolerate unknown
types, but recovery is never acted on. Whether our `a2ui-surface` payload shape matches the
middleware's `a2ui_operations` shape is UNKNOWN and must be probed against the real middleware.

### G4. The chat stack does not speak AG-UI `[code]`

`use-chat-session.ts` consumes a bespoke `StreamEvent` union: `MESSAGE_START/DELTA/END`,
`TOOL_CALL_START/DELTA/END`, `STATE_SNAPSHOT/DELTA`, `ERROR`, `DONE`. AG-UI 1.0 names are
`TEXT_MESSAGE_*`, `TOOL_CALL_ARGS`, `TOOL_CALL_RESULT`, `RUN_STARTED/FINISHED/ERROR` [research].
Missing entirely: run lifecycle, interrupts and resume, `REASONING_*`, `SUBAGENT_*`,
`TOOL_CALL_RESULT`, `MESSAGES_SNAPSHOT`, multimodal content parts. Consumers of `EntityChat` /
`EntityCopilot` must translate a real AG-UI stream themselves. `entity-stream.tsx` consumes the same
bespoke `StreamEvent` set (`entity-stream.tsx:21,25`) [checked] and belongs in the same scope (W3).

### G5. Stream cancellation is a no-op `[code]` — defect, not reproduced

`use-chat-session.ts:67,270,312` create and abort an `AbortController`, but its `signal` is never
read and never passed to `streamFactory` (signature `(messages) => …`). Consequence when it occurs:
a second `sendMessage`, or `clearMessages`, does not stop the earlier stream; it keeps appending to
message state and writing agent state into the graph through `applyAgUiSnapshot/Delta`. Observed by
reading only; a full-integration flow must reproduce it before it is called fixed.

A related risk, PLAUSIBLE only: `sendMessage` reads `currentMessages` from inside a `setMessages`
updater after `await Promise.resolve()`. React does not guarantee the updater has run by then, so the
stream factory may receive a stale history. Needs reproduction.

### G6. Chat messages live in React state, not the graph `[code]` — design question

The hook says so deliberately ("React state, not the entity graph"). The project's core rule is that
the graph is the single source of truth. Consequence: messages are not visible across views, not
persisted, and not covered by local-first sync. Whether this is intended scope is an operator call
(D4), not a defect.

### G7. AG-UI peer floors admit versions that lack required features `[code]` + `[research]`

`entity-graph-core` and `entity-graph-react` declare `@ag-ui/core >=0.0.30` (optional peer).
`ACTIVITY_*` arrived in 0.0.40 and interrupts in 0.0.55 [research]. `a2ui-react` declares
`>=0.0.59 <0.1.0 || ^1.0.0`. Note the core and react packages import nothing from `@ag-ui/*`; they
consume plain event objects [code], so the floor documents compatibility rather than linking code.
The lockfile actually resolves `@ag-ui/core` to **0.0.57** for `entity-graph-core` and
`entity-graph-react` (`pnpm-lock.yaml:1117`) [checked], below `a2ui-react`'s own `>=0.0.59` floor
and before 1.0.

### G8. #75 survives the upgrade `[checked]`

`@a2ui/web_core@0.15.0/src/v0_8/types/types.d.ts` line 3 still imports `'./components'` without an
extension, so TS2835 under NodeNext with `skipLibCheck: false` persists. Options are unchanged: a
pnpm patch of the declaration, an upstream fix, or the least-preferred `skipLibCheck`.

### G9. The 4.4.0 zod security fix must be redone `[checked]`

The current patch (`patches/@a2ui__web_core@0.12.0.patch`, keyed to 0.12.0) rewrites upstream
imports to `zod/v3` so the package runs on this repo's `zod@4.6.7` (GHSA-mrhx-c7xc-m3w5). 0.15.0
depends on `zod ^3.25.76` and imports bare `'zod'` in 53 `.js` files and 41 `.d.ts` imports, plus
2,160 `import("zod")` type references in `.d.ts` files [checked; corrected in round 2, the first
draft's "161" counted source-map text]. A new patch has to cover the type references too. A new 0.15.0 patch is needed,
or the advisory reopens. Correction from round 1: `lit`, `@preact/signals-core` and `validate-color`
were already dependencies of 0.12.0 [review]; `redos-detector` and `@lit/context` are the additions
to check. `packages/a2ui-react/tsup.config.ts` bundles `@a2ui/*` (`noExternal: [/^@a2ui\//]`)
[review], so the effect to measure is **bundle size** of `@prometheus-ags/a2ui-react`, not consumer
install size.

### G10. Carried debt from the previous phase `[prior]` + `[code]`

- Review findings 6 to 10 unfixed (`v1Actions` key collisions on `:`, `keysOf` vs official
  `parsePath`, shadow seed dropping per-component `catalogId`, unpruned `pendingActions`, `dispose()`
  leaving v1 promises live). Findings that touch the v1 bridge are absorbed by rewriting it.
- `runtime-core.ts` is now **925** lines [code], over the 800-line ceiling and up from about 870.
- AUI-16 and AUI-18 not discrimination-checked. Published without npm provenance.

### G11. `theme` handling must split by version `[code]` + `[research]`

`surface-export.ts`, `shadow-seed.ts` and `activity-plan.ts` store, export and compare `theme`. v1.0
removed it. v1.0 surfaces must not carry or require it; v0.9 surfaces may.

### G12. Documentation and skills drift `[code]`

About 90 files outside node_modules reference the RC or v0.9 (`a2ui-react` 19, skills 9, `site/docs`
8, `tests/release` 7, `website/docs` 6, `entity-graph-a2a` 5, `openspec/specs` 5, Flutter example 5,
examples 9). Two separate documentation trees exist (`site/docs`, `website/docs`).

Three specs write RC behaviour as SHALL requirements and need deltas [review]:
- `v3-a2ui-protocol-bridge`: "strict A2UI 1.0 release-candidate envelopes" and AG-UI 0.0.59 [code].
- `a2ui-action-envelope` (lines 30–35): the v1.0 correlation `actionId` and the `wantResponse` →
  `actionResponse` scenario.
- `a2ui-headless-runtime` (lines 24, 33): a v1.0 surface "SHALL export … with `wantResponse` and
  `responsePath` restored".
- `a2ui-resource-limits` (line 47): "A v1.0 `actionResponse` value written to a surface's
  `responsePath` SHALL be checked against the same limits" [checked].
- `v3-flutter-riverpod-a2ui-example` (line 13): "The Flutter showcase SHALL accept and validate A2UI
  1.0 release-candidate …" [checked]. This conflicts with keeping Flutter out of scope (D7): either
  the spec is amended or Flutter comes in.

Because 1.0 forbids `wantResponse` (G1), these are behaviour changes, not wording fixes.

**Example inventory** (goal 1 says "every example that uses it") [review]:

| Workspace | Uses | Emits | Other pins |
| --- | --- | --- | --- |
| `examples/agui-activity-lab` | `a2ui-react`, `@ag-ui/core` 1.0.3 | RC/v0.9.1 envelopes (`server/events.ts`) | — |
| `examples/agentic-a2ui-app` | `a2ui-react` | RC/v0.9.1 (`src/features/agentic/{reference-agent,agent-server,reference-surfaces,a2a-client-service,runtime}.ts`, `fixtures/*.v0.9.1.json`) | `@a2a-js/sdk` 1.0.1 |
| `examples/agentic-a2ui` | `a2ui-react` | RC/v0.9.1 (`src/agent/{agent-client,surface-messages}.ts`) | `@a2a-js/sdk` 1.0.1 |
| `examples/flutter-riverpod` | `genui` 0.10.2 | — | D7 |
| root `package.json` | `a2ui-react` (acceptance steps) | — | `tests/steps/v3-a2ui-protocol-bridge.steps.ts:54-55` asserts `"0.12.0"` |

### G13. `@a2ui/*` 0.12.0 → 0.15.0 removes library APIs this repo uses `[checked]` + `[review]` — CRITICAL in round 1

The first draft missed this entirely. The upstream changelogs mark many changes after 0.12.0 as
BREAKING (the reviewer counts 18 for `web_core` and 8 for `@a2ui/react` [review]). The ones that hit
this repository:

- **`basicCatalog` is gone from `@a2ui/react/v0_9`** (0.13.0, #2630) [checked]. It moved to
  `@a2ui/web_core/v0_9/basic_catalog`. `packages/a2ui-react/src/official/catalog.ts:6-9` imports
  `{ basicCatalog, createComponentImplementation }` from `@a2ui/react/v0_9` [checked], so the build
  breaks on upgrade.
- **The basic catalog now renders as W3C custom elements and no longer server-renders** (0.13.0)
  [checked]. That changes what the visual lane (`verify:a2ui-visual`) sees and removes server
  rendering of those components for any SSR consumer of this package. (Correction from round 2:
  `examples/nextjs-app` does not use `a2ui-react`, so no example in the repo is affected; external
  SSR consumers are.)
- Further 0.13–0.15 changes that touch our wrapper [review]: 0.15.0 enforces
  `allowedParents`/`allowedChildren` inside `createComponentImplementation`, which our
  `createPrometheusA2uiComponent` wraps; `A2uiSurface` no longer renders debug placeholders;
  basic-catalog element classes now carry an `a2ui-` prefix. `react/a2ui-provider.tsx` has not been
  mapped against the changelog.
- **`SurfaceModel.catalog` may return `undefined`** (web_core) [review]. `catalog.id` is dereferenced
  in 8 places in `packages/a2ui-react/src` [checked], including `surface-export.ts`,
  `shadow-seed.ts` and `runtime-core.ts`.
- The catalog invoker now refuses `allowedCallers: 'agentOnly'` functions; `CatalogInterface` requires
  `toJson()` and `validationSchema`; peer-catalog APIs are removed [review]. Whether our catalog code
  depends on each of these is not yet mapped.
- Acceptance steps pin the old versions (`tests/steps/v3-a2ui-protocol-bridge.steps.ts:54-55`)
  [review].

Planning must start from a line-by-line read of both changelogs from 0.12.0 to 0.15.0, mapped to call
sites, before any design decision.

## 4. World-class analysis

The benchmark covered CopilotKit, the official A2UI renderers, assistant-ui, the Vercel AI SDK, MCP
Apps / MCP-UI, LangGraph and json-render [research]. Two findings frame it.

- **A2UI 1.0 is table stakes now.** CopilotKit 1.87.0 shipped A2UI 1.0 rendering on 2026-11-11
  [research].
- **The differentiator is unclaimed.** None of the surveyed libraries documents binding generated UI
  to a normalized entity graph, optimistic updates with rollback, local-first persistence, conflict
  resolution, or authorizing agent actions against specific entities [research]. This library has
  the graph, optimistic patches, local-first sync and an entity action policy [code]. That position
  is defensible only if the protocol layer is current and correct.

Improvements, ranked by how far each moves the library toward leader parity or past it. Each names
the capability, who has it [research], and what we have [code].

| # | Improvement | Leaders with it | Here today |
| --- | --- | --- | --- |
| W1 | **Native A2UI 1.0**: 1.0 messages through the processor's own 1.0 adapter, v0.9 input kept, library at 0.15.0 | CopilotKit, official renderers | RC bridge (G1, G13) |
| W2 | **Upstream conformance suite** (`conformance/` YAML, `specification/v1_0/test`) run against our renderer | Official renderers (React, Lit, Angular, Flutter, SwiftUI) | Own fixtures only |
| W3 | **AG-UI 1.0 native chat/run stack**: `RUN_*`, `TEXT_MESSAGE_*`, `TOOL_CALL_RESULT`, reasoning, subagents | CopilotKit, assistant-ui | Bespoke events (G4) |
| W4 | **Interrupt / resume with approvals** (`RUN_FINISHED.outcome`, `resume[]`, edit-before-approve), tied to the entity action policy | AG-UI, CopilotKit, AI SDK 7, assistant-ui | Action policy exists; no interrupt model |
| W5 | **Governed, replay-safe actions**: stable action ids (have), signed or attested approvals via `action.metadata.extensions` | CopilotKit governed actions, AI SDK HMAC approvals | Ids yes; attestation no |
| W6 | **Entity-graph-bound generated UI** as the headline: A2UI `updateDataModel` and `sendDataModel` reconciled with graph entities, conflict policy explicit | Nobody | Partial (`data-reconcile.ts`) |
| W7 | **Correct cancellation and run ownership** | Table stakes | Defect (G5) |
| W8 | **Inspector / devtools for AG-UI and A2UI streams** | CopilotKit Inspector, assistant-ui devtools | `useGraphDevTools` covers the graph only |
| W9 | **OpenTelemetry GenAI spans** for runs, tool calls and actions, with redaction | AI SDK 7 | None found |
| W10 | **Accessibility per the v1.0 MUST rules** (`@accessibility` → ARIA, live/hidden) | A2UI v1.0 spec | UNKNOWN; not inspected |
| W11 | **Progressive rendering** of incomplete component trees with placeholders and pending function state | A2UI spec, assistant-ui, AI SDK | UNKNOWN; not inspected |
| W12 | **MCP Apps / `@a2ui/catalog-mcp` interop** | CopilotKit, AI SDK 7 | None |

Open criticism no library answers: prompt injection through generated UI (for example UI that
impersonates system dialogs) [research]. The entity action policy is the natural place to answer it;
that is a design proposal, not an observed problem.

## 5. Build health

- **Typecheck / build:** UNKNOWN. Workspace dependencies are not installed after the pull (no root
  `node_modules`; `packages/a2ui-react/node_modules/@a2ui/web_core` is a dangling link) [code]. No
  build was run, per A-9.
- **Known red gates:** `verify:a2ui-bridge`, `verify:package-contracts` (#75) [prior].
- **Test coverage of the new surface:** NONE yet. Evidence for this phase must come from full
  integration flows: the upstream conformance suite, real `@ag-ui/a2ui-middleware` and AG-UI client
  streams, the packed-consumer check, and the browser flows.
- **Conformance harness is new work, not a free check** [review]. Upstream's
  `conformance/conformance_harness_implementation_guide.md` describes a thin adapter built tier by
  tier inside the package. Of the suites, the **framework adapter** tier applies to us
  (`core/adapter_conformance.yaml`, `core/accessibility.yaml`). The Core SDK tier is already run by
  `web_core`'s own `test:conformance`, and the inference/agent tier does not apply to a renderer. The
  repository has no harness today, so planning must count building one.

## 6. Constraint check

- **CLAUDE.md layering:** `use-chat-session` calls a caller-supplied `streamFactory`; the hook does not
  open connections itself, so the "hooks never talk to APIs" rule is met in letter. Messages kept in
  hook state sit against the "graph is the single source of truth" principle (G6).
- **File size:** `runtime-core.ts` 925 lines, over the 800 maximum (G10).
- **Skills ↔ code sync:** any public export change (new 1.0 types, renamed constants such as
  `PROMETHEUS_A2UI_RC_PROTOCOL_VERSION`) requires `pnpm run refresh:exports` and `verify:skills`.
- **CI never runs tests** (project policy). All verification below is local.
- **constraints.md:** none present.

## 7. Goal progress

| Goal | Status | Reason |
| --- | --- | --- |
| Upgrade A2UI packages to the 1.0 release and adopt the 1.0 protocol | NOT MET | 0.12.0 + RC bridge; target web_core/react 0.15.0 (G1, G8, G9, G11, G13); three examples emit RC/v0.9.1 (G12 inventory) |
| Bring AG-UI deps current and replace pre-1.0 ranges | PARTIAL | `a2ui-react` dev-pins 1.0.3 and allows `^1.0.0`; core/react floors `>=0.0.30` and the lockfile resolves **0.0.57** for them; latest is 1.0.4 (G7) |
| Include related protocol updates (AG-UI events, A2A, …) | NOT MET | A2A on v0.9.1 private URI, `@a2a-js/sdk` 1.0.1 in the package and two examples (G2, G12); chat stack not AG-UI (G4) |
| Confirm target versions and breaking changes against release notes before planning | **PARTIAL** | Target versions and wire changes established (section 1, G1). The 0.12.0 → 0.15.0 library breaking changes are identified at the headline level (G13) but not yet mapped line by line to call sites. |
| Verify through full local integration; sync changesets, docs, skills | NOT MET | Nothing implemented yet; #75 still blocks two gates |

---

## 8. Adopted-outcome contract inputs

Operator instructions so far (counted as adoption): the phase request "update the use of the A2UI to
the new version 1.0 release and include all other updates to AG-UI, etc.", and the assess
instruction to analyse "improvements … to ensure it is a world class implementation for agentic
application development". Everything else below is a **proposal** until the operator confirms it.

| Input | Proposal |
| --- | --- |
| **User operation** | An application developer connects a conformant A2UI 1.0 agent (over AG-UI or A2A) to `@prometheus-ags/a2ui-react`, and its surfaces render, bind to graph entities, and send policy-authorized actions back, with no translation layer of their own. |
| **Observed baseline** | RC dialect only; 1.0 final input rejected (G1); A2A on v0.9.1 (G2); chat stack not AG-UI (G4); abort no-op (G5); two gates red (G8). UNKNOWN: whether `@a2ui/react` 0.15.0 renders 1.0, middleware payload shape (G3), genui's A2UI version, install-size effect (G9), current a11y and progressive rendering (W10, W11). |
| **Desired observable result** | The upstream A2UI 1.0 conformance cases pass against our renderer; a real `@ag-ui/a2ui-middleware` stream and a real A2A 1.0 exchange with the official extension render and round-trip actions; `verify:a2ui-bridge` and `verify:package-contracts` pass with `skipLibCheck: false`. |
| **Supported environments** | React 19; Node 22/24 for headless; browsers already covered by the browser flows; Flutter only if D7 brings it in. |
| **Required safety checks** | Catalog allow-listing and action policy unchanged or stronger; `callRendererFunction` restricted to agent-callable functions; `requiresUserActivation` honoured; regex safety; zod advisory not reopened (G9); resource limits applied to the new message types. These trace to real trust boundaries (agent input, action execution). |
| **Exclusions (proposed)** | MCP Apps (W12), OpenTelemetry (W9), devtools inspector (W8) deferred unless the operator pulls them in. |
| **Risk acceptance** | Needed for: building on a spec that changed again today (#4044); shipping a wire-breaking release. |
| **Decision owner** | The operator (repository owner). |

## 9. Decisions the operator needs to make before planning

> **ADOPTED 2026-11-12.** The operator adopted D1–D8 (including D1/D2 interaction and D2a) exactly
> as recommended below ("Adopt all"). With that, the section 8 proposals are adopted as written:
> the user operation, desired observable result, supported environments (Flutter excluded per D7),
> safety checks, exclusions (W8–W12 deferred per D4) and risk acceptance (building on a spec still
> changing; a wire-breaking 5.0.0 that moves all 13 fixed packages). Tagging 5.0.0 still needs an
> explicit operator go-ahead at release time (D3). The section 10 value scenarios remain proposals
> for planning to calibrate.

Each has a recommendation.

- **D1. Which A2UI package version to target.** *Recommend `@a2ui/web_core` 0.15.0 now*, accept both
  bare and `@`-prefixed envelope keys as the spec's transition rules allow, and re-pin when the
  release containing #4044 ships. Waiting blocks the phase on an unscheduled upstream release.
- **D2. Bridge strategy.** *Recommend passing 1.0 messages to the multi-version `MessageProcessor`
  the runtime already uses*, which has its own `'1.0'` adapter, and deleting the RC downgrade in
  `v1-compat.ts`. v0.9/v0.9.1 input keeps flowing through the same processor (AG-UI's middleware
  still emits v0.9). **Correction from round 2:** this is not a drop-in. The processor only pairs a
  1.0 message with a catalog whose protocol version is `1.0` (`DEFAULT_CATALOG_COMPATIBILITY`:
  `'1.0' → {'1.0'}`, in `processing/adapters/base.js:35-39`) [checked]. Our only catalog declares
  `"v0.9.1"` (`catalog-core.ts:16,133`), and `runtime-core.ts:119` rejects duplicate catalog ids
  [checked]. So the catalog layer and its public API must split by protocol version: a 1.0 catalog
  (built on, or alongside, upstream's `@a2ui/web_core/catalogs/basic/v1`) with its own id, next to
  the v0.9.1 catalog. That split is the real design work in D2. It also retires most of findings 6
  to 10.
- **D1/D2 interaction.** web_core 0.15.0 does not understand the `@`-prefixed envelope keys from #4044
  [review]. Accepting them (D1) therefore needs a small key-translation step in front of the
  processor, which D2 must keep even after deleting the rest of the normalization layer.
- **D2a. Response-aware actions.** 1.0 forbids `wantResponse`/`responsePath` (G1), and two specs
  require them (G12). *Recommend re-expressing them as 1.0 function calls* (`callAgentFunction` →
  `rendererFunctionResponse`) and amending `a2ui-action-envelope` and `a2ui-headless-runtime`;
  RC-shaped actions survive only inside the optional RC-input shim in D3.
- **D3. Release line.** The wire format changes (`"v1.0"` → `"1.0"`, renamed messages, binding
  syntax, no response-aware actions) and the basic catalog no longer server-renders (G13).
  *Recommend 5.0.0* with a documented migration, plus an opt-in RC-input shim for one minor line if
  existing producers need it. Note that `.changeset/config.json` puts **all 13 npm packages** in one
  `fixed` group [checked], so 5.0.0 moves every package, including ones this phase does not touch.
  Ask before tagging, per the recalled lesson.
- **D4. How much of the world-class list is in this phase.** *Recommend W1, W2, W3, W4, W7 and the
  A2A move (G2) in scope*; W5, W6 as design work with a spike; W8 to W12 deferred to a follow-up
  phase. G6 (messages in the graph) is folded into W3 if the operator agrees.
- **D5. AG-UI floors.** *Recommend `^1.0.0` everywhere*, which is breaking for consumers still on
  0.0.x; fits the 5.0.0 line in D3.
- **D6. #75.** *Recommend a pnpm patch of the 0.15.0 declaration* (and an upstream PR), keeping
  `skipLibCheck: false`.
- **D7. Flutter.** *Recommend out of scope for this phase* unless the operator wants cross-platform
  1.0 parity now. If it comes in, choose between `genui` (A2UI version UNKNOWN) and upstream's
  official `a2ui_flutter` 0.3.0.
- **D8. SSR.** The basic catalog stops server-rendering at 0.13.0 (G13). *Recommend accepting
  client-only rendering for basic-catalog components* and documenting it, rather than keeping a
  React re-implementation of the catalog. If SSR of generated UI matters to consumers, this becomes a
  larger change and should be decided before planning.

## 10. Value scenarios (proposals, not adopted)

| Actor → outcome | Source | Why now | Likelihood | Constraint |
| --- | --- | --- | --- | --- |
| App developer → plugs a CopilotKit/ADK agent emitting A2UI 1.0 into the graph UI | Operator request; CopilotKit 1.0 shipped today | Producers are moving to 1.0 | High | Policy gates unchanged |
| App developer → receives v0.9 surfaces from `@ag-ui/a2ui-middleware` unchanged | Middleware still emits v0.9 | Middleware is the common path | High | v0.9 path must not regress |
| End user → approves or edits an agent action before it runs (interrupt/resume) | AG-UI 1.0 interrupts | Leaders all have it | Medium | Interrupt outcome still Draft upstream |
| Agent → receives a well-formed `error` with a 1.0 code when its UI is invalid | A2UI 1.0 error model | Needed for agent self-repair | Medium | — |
| Remote A2A agent → negotiates A2UI per turn with the official extension | A2UI A2A extension v1.0 | Private URI blocks interop | Medium | Per-turn capability rule |
| (Rare, critical) Agent UI → tries to call a renderer-only function or open a URL without a gesture | A2UI 1.0 security rules | Trust boundary | Low | Must be refused |

Calibration inputs still open: none of these is owner-reviewed yet.

## 11. Remaining UNKNOWNs (consolidated)

- v1.0 rendering through **our** wrapper end to end (upstream's React adapter runs the 1.0 adapter
  conformance cases [review], but our catalog and runtime sit in between).
- Which of the remaining 0.12.0 → 0.15.0 breaking changes reach our call sites (G13 headline items
  are mapped; the rest are not).
- Exact shape of `@ag-ui/a2ui-middleware` `a2ui_operations` versus our `a2ui-surface` payload.
- Why the RC bridge downgraded to v0.9.1 instead of using the 0.12.0 1.0 adapter.
- When #4044 reaches npm.
- `zod` peer status for `@ag-ui/core@1.0.4`.
- `genui` 0.10.2's A2UI version.
- Bundle-size effect on `@prometheus-ags/a2ui-react` of moving the bundled `@a2ui/*` to 0.15.0.
- Current accessibility and progressive-rendering behaviour of our renderer.
- Build and typecheck health (dependencies not installed).

## Unresolved review findings

Accepted after the two-round cap. Each must be closed in analyze or plan before design is fixed.

1. **Full changelog-to-call-site map not done** (round 1 CRITICAL, partially resolved; round 2
   WARNING). G13 maps the headline breaks only. Goal 4 asks for this during assess, which is why it
   stays PARTIAL. Owner: first task of planning, before D2 is designed.
2. **D2's catalog split is identified, not designed** (round 2 CRITICAL, resolved as a finding, open
   as design). Open questions: one catalog id per protocol version or a versioned registry; whether
   to build on upstream's `catalogs/basic/v1`; how the public catalog API (`catalog.ts`,
   `catalog-core.ts`) changes.
3. **AG-UI and A2A breaking-change claims are unverified** (round 2 WARNING). Every AG-UI claim in
   section 1 is `[research]`. The `@a2a-js/sdk` 1.0.1 → 1.3.0 changes were not assessed at all. On
   the zod peer, the reviewer reports the lockfile shows `@ag-ui/core@1.0.3` with an optional zod
   peer [review]; 1.0.4 is still UNKNOWN.
4. **The anti-theater screen did not run** (`check-findings-sycophancy.sh`: shared sycophancy library
   not installed). Both reports were BLOCK verdicts with line-level evidence, which is not the
   pattern that screen targets, but the screen itself is unrun.

Review records: `review/assess/round-1/{packet,findings}.json`, `review/assess/{packet,findings}.json`
(round 2).

ASSESSMENT COMPLETE
