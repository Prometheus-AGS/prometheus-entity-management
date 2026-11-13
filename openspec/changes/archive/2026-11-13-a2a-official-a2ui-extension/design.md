## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: G2.

## Decisions

Adopted operator decisions that bind this change: D4 (A2A move in scope).

## Open design records

Recorded here during execution, before dependent code: @a2a-js/sdk 1.0.1→1.3.0 change map; the framework-free authorization callback shape for inbound actions.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Record: implementation (tasks 5.1–5.5, 2026-11-12)

- **5.1** `@a2a-js/sdk` 1.0.1 → 1.3.0 in `entity-graph-a2a` (and the pins in `verify-a2a-conformance.mjs`,
  `run-a2a-tck.mjs`). Release notes 1.1.0–1.3.0 (gh releases, a2aproject/a2a-js) list features and fixes only, none
  marked breaking; notable: JSON-RPC errors returned as HTTP 200 and dispatch on `A2A-Version` (1.2.1), optional
  media-type validation against `defaultInputModes` (1.2.1). The proto-style `Part` (`content.$case`, `mediaType`,
  `metadata`) is unchanged in 1.3.0. The examples' own pins move in change 9.
- **5.2** Constants keep their export names with official values: `PROMETHEUS_A2UI_EXTENSION_URI =
  https://a2ui.org/a2a-extension/a2ui/v1.0`, `PROMETHEUS_A2UI_PROTOCOL_VERSION = "1.0"`, `PROMETHEUS_A2UI_MEDIA_TYPE
  = application/a2ui+json`, `PROMETHEUS_A2UI_CATALOG_ID = urn:prometheus-ags:a2ui:catalog:a2ui-1.0`. Artifacts carry
  one DataPart whose `data` is the A2UI message list (the spec's encoding; the old `{ protocol, extensionUri,
  messages }` wrapper is gone, `PrometheusA2UIArtifactPayload` is a deprecated alias of the list) with both the A2A
  `mediaType` and `metadata.mimeType` set. The reference fixture uses 1.0 `@path` bindings. Agent card params follow
  the spec (`supportedCatalogIds`, `acceptsInlineCatalogs: false`).
- **5.3 Correction to the plan:** the extension spec makes activation optional and states the MUST rule as
  capability scoping: no A2UI in reply to a message without `a2uiRendererCapabilities["1.0"]`. So the reference
  agent sends A2UI only when the turn offers 1.0 for its catalog (`offersA2UICatalog`), and still activates the
  extension when the client requested it. Helpers: `rendererCapabilitiesOf`, `offersA2UICatalog`,
  `A2UI_RENDERER_CAPABILITIES_KEY`, `A2UI_RENDERER_DATA_MODEL_KEY`.
- **5.4** Inbound A2UI DataParts (renderer-to-agent messages) go to the new `a2uiInbound` option
  (`A2UIInboundHandler { authorize, handle }`), framework-free, no dependency on the React package. Each message is
  decided on its own (the spec's list is not transactional); no handler, or every message refused, refuses the
  request as a whole (`TASK_STATE_REJECTED`). Replies the handler returns are sent only under the same capability
  rule. New exports: `createA2UIDataPart`, `extractA2UIMessages`, `isA2UIDataPart`, the inbound types.
- **5.5** Spec delta for `v3-a2a-conformance-agent` is in place (validated). The verifier's protocol pin is
  updated to `"1.0"`. **Moved to `a2ui-1-0-release-sync#1`:** rewriting `verify-a2a-conformance.mjs` to build
  surfaces from received parts with the packed headless runtime and to exercise an inbound action. That is
  acceptance authoring, which CLAUDE.md (A-9) places after all production work.
