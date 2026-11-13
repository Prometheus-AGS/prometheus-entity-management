/**
 * Headless A2UI runtime: the same validation as the React runtime, with no
 * React, no DOM and no renderer.
 *
 * A host (a server mirror, a validator, a compactor) can check agent output
 * exactly as the browser will. Both runtimes share one core (`runtime-core.ts`)
 * and build their catalogs with one function (`createAllowlistedCatalog`) from
 * the same default allowlists, so the allowlist, the limits, the schema checks,
 * the ordering rules and the all-or-nothing batches cannot drift apart. Both
 * take the official `web_core` basic catalog; this entry never renders it and
 * cannot receive React component overrides.
 *
 * Nothing imported from here reaches `@a2ui/react` or React at run time.
 */

// From web_core 0.13 the basic catalog's components are Custom Element
// implementations (Lit). This entry still renders nothing: it uses only their
// schemas and the catalog functions.
import { basicCatalog as officialBasicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";
import { basicCatalog as officialBasicCatalogV1 } from "@a2ui/web_core/catalogs/basic/v1";
import type { Catalog, ComponentApi } from "@a2ui/web_core/v0_9" with {
  "resolution-mode": "import",
};
import {
  PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
  createAllowlistedCatalog,
  type AllowlistedCatalogOptions,
} from "./official/catalog-core.js";
import { PrometheusA2uiRuntimeCore } from "./official/runtime-core.js";
import type { CreatePrometheusA2uiRuntimeOptions } from "./official/runtime-types.js";

export type PrometheusA2uiHeadlessCatalogOptions = Omit<
  AllowlistedCatalogOptions<ComponentApi>,
  "overrides"
>;

/**
 * A catalog with the default (or given) allowlists and no renderers. A
 * component name or function the allowlist names but the official catalog lacks
 * throws here, as it does for the React catalog.
 */
export function createPrometheusA2uiHeadlessCatalog(
  options: PrometheusA2uiHeadlessCatalogOptions = {},
): Catalog<ComponentApi> {
  const source =
    options.protocolVersion === PROMETHEUS_A2UI_V1_PROTOCOL_VERSION
      ? officialBasicCatalogV1
      : officialBasicCatalog;
  return createAllowlistedCatalog<ComponentApi>(source, options);
}

/** The runtime without a renderer; its defaults are the v0.9.1 and 1.0 headless catalogs. */
export class PrometheusA2uiHeadlessRuntime extends PrometheusA2uiRuntimeCore<ComponentApi> {
  constructor(options: CreatePrometheusA2uiRuntimeOptions<ComponentApi> = {}) {
    super({
      ...options,
      catalogs: options.catalogs ?? [
        createPrometheusA2uiHeadlessCatalog(),
        createPrometheusA2uiHeadlessCatalog({ protocolVersion: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION }),
      ],
    });
  }
}

/** Create a React-free A2UI runtime that uses the headless catalog unless `catalogs` is given. */
export function createPrometheusA2uiHeadlessRuntime(
  options: CreatePrometheusA2uiRuntimeOptions<ComponentApi> = {},
): PrometheusA2uiHeadlessRuntime {
  return new PrometheusA2uiHeadlessRuntime(options);
}

export {
  DEFAULT_PROMETHEUS_A2UI_COMPONENTS,
  DEFAULT_PROMETHEUS_A2UI_FUNCTIONS,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  PROMETHEUS_A2UI_V1_CATALOG_ID,
  PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
} from "./official/catalog-core.js";
export type {
  AllowlistedCatalogOptions,
  PrometheusA2uiComponentName,
  PrometheusA2uiFunctionName,
  PrometheusA2uiProtocolVersion,
} from "./official/catalog-core.js";
// Re-exported so the inlined official types and the shared core stay nameable
// in consumers' declarations (see scripts/bundle-declarations.mjs).
export type { Catalog, ComponentApi } from "@a2ui/web_core/v0_9" with {
  "resolution-mode": "import",
};
export type { PrometheusA2uiRuntimeCore } from "./official/runtime-core.js";
export { buildA2uiForwardedProps } from "./official/forwarded-props.js";
export type {
  BuildA2uiForwardedPropsInput,
  PrometheusA2uiActionEnvelope,
  PrometheusA2uiActionProps,
  PrometheusA2uiForwardedProps,
  PrometheusA2uiHeldVersion,
  PrometheusA2uiHeldVersions,
  PrometheusA2uiResyncReason,
  PrometheusA2uiResyncRequest,
  PrometheusA2uiResyncSurface,
  PrometheusA2uiUserAction,
} from "./official/forwarded-props.js";
export { DEFAULT_PROMETHEUS_A2UI_LIMITS } from "./official/limits.js";
export type {
  PrometheusA2uiBatchRefusedFault,
  PrometheusA2uiLimitFault,
  PrometheusA2uiLimitName,
  PrometheusA2uiLimits,
  PrometheusA2uiLimitUsage,
  PrometheusA2uiLimitUsageEntry,
  PrometheusA2uiProducerFault,
  PrometheusA2uiSurfaceMismatchFault,
  PrometheusA2uiVersionConflictFault,
} from "./official/limits.js";
export type { PrometheusA2uiDataConflict } from "./official/data-reconcile.js";
export { PrometheusA2uiError } from "./official/runtime-types.js";
export type {
  CreatePrometheusA2uiRuntimeOptions,
  PrometheusA2uiErrorCode,
  PrometheusA2uiMessageInput,
  PrometheusA2uiRendererCapabilities,
  PrometheusA2uiRendererMessage,
  PrometheusA2uiAgentFunctionCall,
  PrometheusA2uiAgentFunctionOptions,
} from "./official/runtime-types.js";
export type { PrometheusA2uiV1Message } from "./official/v1-messages.js";
export { PROMETHEUS_A2UI_RC_PROTOCOL_VERSION } from "./official/rc-shim.js";
