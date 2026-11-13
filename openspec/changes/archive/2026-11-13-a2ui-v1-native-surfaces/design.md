## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: G1, G10, G11, G12 (v3-a2ui-protocol-bridge, v3-release-contract).

## Decisions

Adopted operator decisions that bind this change: D1 (@-key translation), D2 (processor 1.0 adapter, catalog split by protocol), D3 (5.0.0).

## Open design records

Recorded here during execution, before dependent code: Build-on versus alongside upstream catalogs/basic/v1 with evidence; the catalog-mismatch error code (frozen here before acceptance authoring); runtime-core split boundaries.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Record: the 1.0 catalog (task 2.2, 2026-11-12)

**Build on upstream, not alongside it.** `@a2ui/web_core@0.15.0` exports `catalogs/basic/v1`, a `Catalog` with id
`https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json`, `protocolVersion: "1.0"`, the same 18 component
names as our default allowlist and all 13 allowlisted functions (plus `openUrl` and the system `@index`, which
belongs to no catalog). Evidence: imported in Node 26 and listed (2026-11-12). Reimplementing it would duplicate
upstream; so the Prometheus 1.0 catalog is `createAllowlistedCatalog(basicCatalogV1, { protocolVersion: "1.0" })`.

- New public constants `PROMETHEUS_A2UI_V1_PROTOCOL_VERSION = "1.0"` and
  `PROMETHEUS_A2UI_V1_CATALOG_ID = "urn:prometheus-ags:a2ui:catalog:a2ui-1.0"`, type
  `PrometheusA2uiProtocolVersion = "v0.9.1" | "1.0"`, and a `protocolVersion` option on
  `createPrometheusA2uiCatalog`, `createPrometheusA2uiHeadlessCatalog` and `getPrometheusA2uiOfficialComponent`
  (default `v0.9.1`, so existing callers are unchanged).
- Both runtimes now default to **two catalogs**: v0.9.1 (`urn:prometheus-ags:a2ui:catalog:v3`) and 1.0. A caller
  passing `catalogs` gets exactly what it passes.
- **Catalog-mismatch error code (frozen here for UPG-4):** a 1.0 surface naming a catalog declared for another
  protocol is refused by the official processor with `A2uiCatalogError`, code `CATALOG_ERROR`
  (`processing/message-processor.js:744`, "does not match"). How the runtime surfaces it is settled by task 2.3.

## Record: native 1.0 routing (task 2.3, 2026-11-12)

- New `official/v1-messages.ts`: `isV1Envelope` (`version === "1.0"`), `parseV1Message` (structured clone,
  `@catalogId`/`@metadata`/`@accessibility`/`@checks` → bare keys on `createSurface` and `updateComponents`
  components, a component with both forms rejected as `invalid-message`, then the official
  `AgentToRendererMessageSchema` from `@a2ui/web_core/v1_0`), and `isV1FunctionMessage`.
- `processMessages` sends 1.0 envelopes to the official processor unchanged (its own `1.0` adapter); the RC
  downgrade (`normalizeA2uiV1Message`), and the RC-only state it needed (`surfaceCatalogs`, `v1Surfaces`,
  `v1Actions`, `pendingActions`, `forwardV1Action`, `handleV1ProtocolMessage`), are removed from the core.
- **Finding that reshapes change 3:** `@a2ui/web_core@0.15.0`'s processor handles 1.0 function messages itself:
  `callRendererFunction` runs through `rpc.handleCallRendererFunction` (catalog functions, `allowedCallers`, user
  activation) and `agentFunctionResponse` resolves pending `callAgentFunction` promises; replies leave through the
  `outboundListener` option. So function messages go to the processor too, after the state messages, and never
  into the shadow preflight (where a call would execute).
- `assertAllowedComponents` now also covers 1.0 inline `createSurface` components and resolves a component's
  catalog as the 1.0 rule says (its own `catalogId`, else the surface default).
- Sequencing: `v1-compat.ts` is no longer used by the core; `runtime-types.ts`, `surface-export.ts` and the public
  RC exports in `index.ts` still reference it until change 3 (function/action types, opt-in RC shim) replaces them.

## Record: capabilities, 1.0 error codes, limits (task 2.4, 2026-11-12)

- `getClientCapabilities()` asks the official processor for every protocol version the runtime's catalogs declare
  (both by default), so the 1.0 entry carries `supportedCatalogIds` and, with `includeInlineCatalogs`, the inline
  catalogs; the return type is the official renderer-capabilities record (`PrometheusA2uiRendererCapabilities`,
  new public type) instead of the v0.9 `A2uiClientCapabilities` (**public type change**).
- `getClientDataModel(version = "v0.9.1")` returns the 1.0 `a2uiRendererDataModel` when asked for `"1.0"`.
- Errors the official processor throws during a call (`A2ui*Error` with a string `code`) are rethrown as
  `PrometheusA2uiError` with the new code `protocol-error` and the A2UI code in `protocolCode`
  (`VALIDATION_ERROR`, `CATALOG_ERROR`, `INVALID_FUNCTION_CALL`, `EXPRESSION_ERROR`, …). This package's own codes
  (`invalid-message`, `component-not-allowed`, `limit-exceeded`, …) are unchanged. **Behaviour change**: callers
  that caught the raw upstream error now get the wrapper (raw error in `cause`).
- Limits: the call caps (`maxOperationsPerCall`, `maxCallBytes`) run on every raw message before parsing, so they
  cover `callRendererFunction` and `agentFunctionResponse`; state caps run on the shadow for state messages; 1.0
  function messages cannot change surface state themselves. Function responses written into a data model (the RC
  shim in change 3) go back through `processMessages`, so the same caps apply.

## Record: `theme` and catalog by protocol version (task 2.5, 2026-11-12)

- `v1-messages.ts` gains `isV1Surface` (the official model stores `v1.0`) and `defaultCatalogIdOf` (a 1.0 surface
  may have no default catalog; the deprecated `catalog` getter is typed non-optional but can be `undefined` there).
- `shadow-seed.ts` replays each surface in its own version: v0.9.1 with `theme`; 1.0 without `theme`, with
  `catalogId` only when a default exists, and with per-component `catalogId` where it differs.
- `surface-export.ts`: a 1.0 surface exports as one inline 1.0 `createSurface` (plus an `updateDataModel` when the
  root value is not an object), no `theme`, no RC action metadata (`wantResponse`/`responsePath` no longer exist in
  1.0; their replacement is change 3's function calls). `ExportSurfaceInput.actions` removed. v0.9.1 export
  unchanged.
- `agui-activity.ts` `liveView` reports `catalogId` from the default catalog and no `theme` for 1.0 surfaces;
  `activity-plan.ts` `SurfaceConfig.catalogId` is optional. A v0.9.1 restatement still compares `theme`.

## Record: accessibility and specs (tasks 2.6, 2.7, 2026-11-12)

- 2.6: the official 1.0 Custom Element basic catalog already maps `accessibility` (`label`, `description`,
  `live`, `hidden`) to ARIA on its host elements (web_core `applyAccessibilityAttributes`), as the 1.0 protocol
  doc requires ("Plumb Accessibility Attributes"). `@a2ui/react` 0.15.0 does not for React implementations
  (its fix is unreleased), so `createPrometheusA2uiComponent` now wraps the render in `withAccessibility`
  (`official/accessibility.ts`): a `role="group"`, `display: contents` element with the ARIA attributes, only when
  the component sets any. Applies to both protocol versions.
- 2.7: spec deltas finalized (`v3-a2ui-protocol-bridge`: native 1.0 bridge, envelope keys and RC input,
  processor errors keep their A2UI code; `v3-release-contract`: baseline 1.0). `release/v3-release-contract.json`
  `protocols.a2ui` → version `1.0`, stability `stable`, renderer `official-processor-native-1.0-and-v0.9.1`;
  `protocols.agui.version` → `1.0`; `scripts/validate-v3-release-contract.mjs` checks the same values. Flutter
  entries unchanged (D7).
