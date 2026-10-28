import { Catalog as OfficialCatalog } from "@a2ui/web_core/v0_9";
import type {
  Catalog,
  ComponentApi,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };

/*
 * The React-free half of the catalog: protocol constants, the default
 * allowlists and the one function that builds an allowlisted catalog. Nothing
 * here imports `@a2ui/react` or React, so a headless entry can use it without
 * pulling a renderer into its bundle. The React catalog and the headless
 * catalog both call `createAllowlistedCatalog`, so the two cannot drift apart.
 */

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
 *
 * Official `@a2ui/web_core@0.12.0` removed the non-spec math and comparison
 * functions (`add`, `subtract`, `multiply`, `divide`, `equals`, `not_equals`,
 * `greater_than`, `less_than`, `contains`, `starts_with`, `ends_with`) from the
 * v0.9 basic catalog, so they are no longer allowlisted here.
 */
export const DEFAULT_PROMETHEUS_A2UI_FUNCTIONS = [
  "and",
  "or",
  "not",
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

/** Where a catalog takes its implementations from: any official basic catalog. */
export type CatalogSource<Implementation extends ComponentApi> = Pick<
  Catalog<Implementation>,
  "components" | "functions" | "themeSchema"
>;

export interface AllowlistedCatalogOptions<Implementation extends ComponentApi> {
  /** Stable catalog id advertised to agents. */
  id?: string;
  /** Component names allowed from the source catalog. */
  components?: readonly string[];
  /** Function names allowed from the source catalog. */
  functions?: readonly string[];
  /** Implementations that replace the source's one of the same `name`. */
  overrides?: readonly Implementation[];
}

/**
 * Create a catalog containing only explicitly allowed implementations of
 * `source`. Unknown names throw during configuration rather than failing later.
 */
export function createAllowlistedCatalog<Implementation extends ComponentApi>(
  source: CatalogSource<Implementation>,
  options: AllowlistedCatalogOptions<Implementation> = {},
): Catalog<Implementation> {
  const componentNames = options.components ?? DEFAULT_PROMETHEUS_A2UI_COMPONENTS;
  const functionNames = options.functions ?? DEFAULT_PROMETHEUS_A2UI_FUNCTIONS;

  const overrides = new Map<string, Implementation>();
  for (const implementation of options.overrides ?? []) {
    if (!componentNames.includes(implementation.name as never)) {
      throw new Error(
        `Custom A2UI component is not in the allowlist: ${implementation.name}`,
      );
    }
    overrides.set(implementation.name, implementation);
  }

  const components = componentNames.map((name) => {
    const custom = overrides.get(name);
    if (custom) return custom;
    const implementation = source.components.get(name);
    if (!implementation) {
      throw new Error(`Official A2UI component is unavailable: ${name}`);
    }
    return implementation;
  });

  const functions = functionNames.map((name) => {
    const implementation = source.functions.get(name);
    if (!implementation) {
      throw new Error(`Official A2UI function is unavailable: ${name}`);
    }
    return implementation;
  });

  return new OfficialCatalog<Implementation>(
    options.id ?? PROMETHEUS_A2UI_CATALOG_ID,
    PROMETHEUS_A2UI_PROTOCOL_VERSION,
    components,
    functions,
    source.themeSchema,
  );
}
