import { createPrometheusA2uiCatalog } from "./catalog.js";
import { PrometheusA2uiRuntimeCore } from "./runtime-core.js";
import type { CreatePrometheusA2uiRuntimeOptions } from "./runtime-types.js";
import type { PrometheusA2uiComponentImplementation } from "./types.js";

export { PrometheusA2uiError } from "./runtime-types.js";
export type {
  CreatePrometheusA2uiRuntimeOptions,
  PrometheusA2uiErrorCode,
  PrometheusA2uiMessageInput,
  PrometheusA2uiRendererMessage,
} from "./runtime-types.js";

/**
 * The React runtime: the shared core with the official React catalog as its
 * default. Behavior is the core's; only the default catalog is added here.
 */
export class PrometheusA2uiRuntime extends PrometheusA2uiRuntimeCore<PrometheusA2uiComponentImplementation> {
  constructor(options: CreatePrometheusA2uiRuntimeOptions = {}) {
    super({ ...options, catalogs: options.catalogs ?? [createPrometheusA2uiCatalog()] });
  }
}

export function createPrometheusA2uiRuntime(
  options: CreatePrometheusA2uiRuntimeOptions = {},
): PrometheusA2uiRuntime {
  return new PrometheusA2uiRuntime(options);
}
