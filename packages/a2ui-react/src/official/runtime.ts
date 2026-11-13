import { createPrometheusA2uiCatalog } from "./catalog.js";
import { PROMETHEUS_A2UI_V1_PROTOCOL_VERSION } from "./catalog-core.js";
import { PrometheusA2uiRuntimeCore } from "./runtime-core.js";
import type { CreatePrometheusA2uiRuntimeOptions } from "./runtime-types.js";
import type { PrometheusA2uiComponentImplementation } from "./types.js";

export { PrometheusA2uiError } from "./runtime-types.js";
export type {
  CreatePrometheusA2uiRuntimeOptions,
  PrometheusA2uiErrorCode,
  PrometheusA2uiMessageInput,
  PrometheusA2uiRendererCapabilities,
  PrometheusA2uiRendererMessage,
  PrometheusA2uiAgentFunctionCall,
  PrometheusA2uiAgentFunctionOptions,
} from "./runtime-types.js";

/**
 * The React runtime: the shared core with the official catalogs as its
 * defaults, one for A2UI v0.9.1 and one for A2UI 1.0. Behavior is the core's;
 * only the default catalogs are added here.
 */
export class PrometheusA2uiRuntime extends PrometheusA2uiRuntimeCore<PrometheusA2uiComponentImplementation> {
  constructor(options: CreatePrometheusA2uiRuntimeOptions = {}) {
    super({
      ...options,
      catalogs: options.catalogs ?? [
        createPrometheusA2uiCatalog(),
        createPrometheusA2uiCatalog({ protocolVersion: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION }),
      ],
    });
  }
}

export function createPrometheusA2uiRuntime(
  options: CreatePrometheusA2uiRuntimeOptions = {},
): PrometheusA2uiRuntime {
  return new PrometheusA2uiRuntime(options);
}
