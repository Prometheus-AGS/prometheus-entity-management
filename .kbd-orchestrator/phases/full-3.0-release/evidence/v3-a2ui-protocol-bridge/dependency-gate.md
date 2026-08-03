# Task 1 — dependency and execution-readiness gate

Date: 2026-08-01  
Change: `v3-a2ui-protocol-bridge`  
Verdict: **PASS TO IMPLEMENTATION; CURRENT PACKAGE IS NOT A2UI RELEASE-READY**

## Declared prerequisites

Both declared dependencies are complete, archived, promoted, and strictly valid.

| Dependency | Completion evidence | Promoted contract | Result |
| --- | --- | --- | --- |
| `v3-release-contract` | `openspec/changes/archive/2026-08-01-v3-release-contract`; all six tasks checked | `openspec/specs/v3-release-contract/spec.md` | Pass |
| `v3-package-module-contracts` | `openspec/changes/archive/2026-08-01-v3-package-module-contracts`; all six tasks checked | `openspec/specs/v3-package-module-contracts/spec.md` | Pass |

The release prerequisite freezes `@prometheus-ags/a2ui-react` as the single stable A2UI npm artifact, protocol A2UI v0.9.1, the official rendering engine, and application-owned allowlisted action policy. The package prerequisite requires public exports and packed consumers to work without workspace aliases. Neither prerequisite is evidence that the current alpha implements official A2UI.

## Feynman transfer result

The change-specific explanation and assessment are recorded in:

- `.research/full-3.0-release-execution-readiness/v3-a2ui-protocol-bridge-feynman.md`
- `.research/full-3.0-release-execution-readiness/v3-a2ui-protocol-bridge-grade.json`

The assessment passes at `0.98` against a `0.70` threshold with `misconceptions_absent: 1.0`. Its governing distinction is:

> AG-UI transports agent-run events and shared state. A2UI describes and renders declarative surfaces. The official engine owns protocol interpretation; Prometheus owns the explicit authorization and graph-projection boundary.

## Current package audit

The existing source is useful migration material, not an official A2UI implementation:

- `packages/a2ui-react/src/types.ts` models `MESSAGE_*`, `STATE_SNAPSHOT`, `STATE_DELTA`, and tool-call lifecycle events characteristic of AG-UI.
- `use-chat-session.ts` calls the core `applyAgUiSnapshot` and `applyAgUiDelta` projection helpers.
- The package provides chat, stream, diff, tool, and approval UI but no official surface, catalog, data model, message processor, or renderer integration.
- Its manifest has no dependency on `@a2ui/react` or `@a2ui/web_core`.
- Core already exposes an honestly named AG-UI bridge, confirming that AG-UI transport and A2UI rendering are distinct layers in this repository.
- Existing `a2ui-*` CSS and names are branding only; they are not protocol conformance evidence.

## Current dependency and protocol facts

Official sources and registry declarations were rechecked on 2026-08-01. Exact packages were installed in an isolated pnpm project and their export/type declarations inspected.

| Item | Selected value | Contract consequence |
| --- | --- | --- |
| A2UI wire protocol | `v0.9.1` current production | stable bridge target |
| `@a2ui/react` | `0.10.2` | exact tested distribution; React peer is compatible with repository React `19.2.8` |
| `@a2ui/web_core` | `0.10.5` | exact tested protocol/runtime distribution |
| `@ag-ui/core` / `@ag-ui/client` | `0.0.57` | current stable AG-UI references; do not substitute for A2UI engine |
| zod | A2UI packages require `^3.25.76` | preserve a single compatible major in the package consumer |

Important export detail: `@a2ui/react` package root currently re-exports v0.8, while `@a2ui/react/v0_9` exposes `A2uiSurface` and `basicCatalog`; `@a2ui/web_core/v0_9` exposes `MessageProcessor`, `Catalog`, `SurfaceModel`, schemas, and structured errors. The stable bridge must use explicit `/v0_9` imports and construct `MessageProcessor` with `{ version: "v0.9.1" }`. npm version `0.10.x` and protocol version `v0.9.1` are different axes.

Primary references:

- https://a2ui.org/guides/renderer-development/
- https://a2ui.org/roadmap/
- https://a2ui.org/specification/v0.9-a2ui/
- https://docs.ag-ui.com/concepts/events
- https://docs.ag-ui.com/concepts/architecture

## Sycophancy correction

The requested 3.0 feature is not close to complete merely because an alpha package with the desired name exists. The package implements a different protocol layer. Stable work requires a root-surface rewrite, an authorization boundary, migration compatibility, packed consumers, and rendered evidence. Rebranding the current README or adding a message-type alias would be a false conformance claim.

Likewise, adding a new `@prometheus-ags/ag-ui-react` package in this change would exceed the completed twelve-package release inventory. Task 2 must preserve legacy behavior through an explicit `./ag-ui` compatibility subpath under the existing artifact unless the release contract is separately amended.

## Authoritative implementation contract for task 2

Task 2 may proceed only within these boundaries:

1. Make the package root a thin official A2UI integration using exact tested `@a2ui/react@0.10.2` and `@a2ui/web_core@0.10.5` distributions, with a frozen lockfile.
2. Import the explicit `/v0_9` entry points and target wire protocol `v0.9.1`; do not rely on the packages' v0.8 root defaults.
3. Reuse `MessageProcessor`, official schemas/errors, `SurfaceModel`, `Catalog`, `basicCatalog`, and `A2uiSurface`. Do not implement a second JSONL parser, schema model, data-binding engine, or component-tree runtime.
4. Treat v1.0 as candidate/experimental. Reject unsupported versions structurally or route them through an explicit version adapter; never accept them silently as stable v0.9.1.
5. Provide a Prometheus catalog derived from an explicit allowlist. Unknown catalog IDs, components, functions, and actions fail closed.
6. Treat every A2UI action as an untrusted request. Validate action name, payload, entity type, fields, tenant/scope, and policy before graph or external I/O; require an explicit approval transition for destructive actions.
7. Preserve components -> hooks -> stores/policy bridge -> graph/APIs. No renderer component may import `useGraphStore`, mutate graph internals, or perform transport I/O directly.
8. Preserve one canonical normalized graph, ID-only lists, and separate UI patches. Do not create an A2UI-owned entity cache that becomes a second canonical store.
9. Move current AG-UI chat/state exports to an explicit `@prometheus-ags/a2ui-react/ag-ui` compatibility subpath with stable migration aliases/deprecations. Do not publish a thirteenth package in this change.
10. Explain composition honestly: AG-UI may transport or coordinate an agent run while A2UI renders surfaces, but neither protocol is renamed as the other.
11. Add BDD first for official v0.9.1 surface rendering, data updates, action forwarding, unknown catalog/component denial, invalid payload denial, destructive approval, unsupported version rejection, legacy AG-UI migration, architecture guardrails, and packed ESM/type consumption.
12. Synchronize package exports, API ledgers, skills, README/migration docs, example coverage, and downstream Docusaurus route requirements whenever the public surface changes.
13. Keep registry publication and GitHub Pages deployment out of this change; those retain their manual/downstream gates.

## Visual and documentation evidence boundary

This task only establishes dependencies and the implementation contract, so it makes no rendered-success claim. Because the completed bridge is visual and interactive, later tasks must provide real browser evidence for an official v0.9.1 fixture, accessible catalog components, keyboard actions, light/dark Prometheus styling where applicable, and visible allowed/denied/approval outcomes. Automated protocol traces and assertions must accompany images; screenshots cannot prove authorization or protocol conformance by themselves.

The full Docusaurus site is already represented by changes 21–26. Its A2UI pages must consume the final API ledger and agentic example, show the AG-UI/A2UI distinction, include migration imports, link official protocol sources, embed truthful visual evidence with alt text, and avoid calling the compatibility subpath an A2UI renderer.

No registry, GitHub Pages environment, remote service, sibling repository, or publication state was mutated by this task.
