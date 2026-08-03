import { Catalog as OfficialCatalog } from "@a2ui/web_core/v0_9";
import type { Catalog } from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import {
  basicCatalog,
} from "@a2ui/react/v0_9";
import type { PrometheusA2uiComponentImplementation } from "./types.js";

/** The only stable A2UI wire protocol supported by the 3.0 package. */
export const PROMETHEUS_A2UI_PROTOCOL_VERSION = "v0.9.1" as const;

/** Prometheus-owned catalog identity; it never impersonates the full official catalog. */
export const PROMETHEUS_A2UI_CATALOG_ID = "urn:prometheus-ags:a2ui:catalog:v3";

/** Explicit default component allowlist derived from the official v0.9 catalog. */
export const DEFAULT_PROMETHEUS_A2UI_COMPONENTS = [
  "Text",
  "Image",
  "Icon",
  "Video",
  "AudioPlayer",
  "Row",
  "Column",
  "List",
  "Card",
  "Tabs",
  "Divider",
  "Modal",
  "Button",
  "TextField",
  "CheckBox",
  "ChoicePicker",
  "Slider",
  "DateTimeInput",
] as const;

/**
 * Default pure-function allowlist. `openUrl` is deliberately excluded because
 * navigation is an application-owned side effect and must be opted in.
 */
export const DEFAULT_PROMETHEUS_A2UI_FUNCTIONS = [
  "add",
  "subtract",
  "multiply",
  "divide",
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "and",
  "or",
  "not",
  "contains",
  "starts_with",
  "ends_with",
  "required",
  "regex",
  "length",
  "numeric",
  "email",
  "formatString",
  "formatNumber",
  "formatCurrency",
  "formatDate",
  "pluralize",
] as const;

export type PrometheusA2uiComponentName =
  (typeof DEFAULT_PROMETHEUS_A2UI_COMPONENTS)[number];
export type PrometheusA2uiFunctionName =
  | (typeof DEFAULT_PROMETHEUS_A2UI_FUNCTIONS)[number]
  | "openUrl";

export interface PrometheusA2uiCatalogOptions {
  /** Stable catalog id advertised to agents. */
  id?: string;
  /** Component names allowed from the official basic catalog. */
  components?: readonly PrometheusA2uiComponentName[];
  /** Function names allowed from the official basic catalog. */
  functions?: readonly PrometheusA2uiFunctionName[];
}

/**
 * Create a catalog containing only explicitly allowed official implementations.
 * Unknown names throw during configuration rather than failing during render.
 */
export function createPrometheusA2uiCatalog(
  options: PrometheusA2uiCatalogOptions = {},
): Catalog<PrometheusA2uiComponentImplementation> {
  const componentNames = options.components ?? DEFAULT_PROMETHEUS_A2UI_COMPONENTS;
  const functionNames = options.functions ?? DEFAULT_PROMETHEUS_A2UI_FUNCTIONS;

  const components = componentNames.map((name) => {
    const implementation = basicCatalog.components.get(name);
    if (!implementation) {
      throw new Error(`Official A2UI component is unavailable: ${name}`);
    }
    return implementation;
  });

  const functions = functionNames.map((name) => {
    const implementation = basicCatalog.functions.get(name);
    if (!implementation) {
      throw new Error(`Official A2UI function is unavailable: ${name}`);
    }
    return implementation;
  });

  return new OfficialCatalog<PrometheusA2uiComponentImplementation>(
    options.id ?? PROMETHEUS_A2UI_CATALOG_ID,
    components,
    functions,
    basicCatalog.themeSchema,
  );
}
