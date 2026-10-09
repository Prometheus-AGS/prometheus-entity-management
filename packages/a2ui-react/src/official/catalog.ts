import { Catalog as OfficialCatalog } from "@a2ui/web_core/v0_9";
import type {
  Catalog,
  ComponentApi,
  ComponentContext,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
import {
  basicCatalog,
  createComponentImplementation,
} from "@a2ui/react/v0_9";
import type { FC, ReactNode } from "react";
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

export interface PrometheusA2uiCatalogOptions {
  /** Stable catalog id advertised to agents. */
  id?: string;
  /** Component names allowed from the official basic catalog. */
  components?: readonly PrometheusA2uiComponentName[];
  /** Function names allowed from the official basic catalog. */
  functions?: readonly PrometheusA2uiFunctionName[];
  /**
   * Application implementations that replace the official one of the same
   * `name`. Each must be built with `createPrometheusA2uiComponent`, and its
   * name must be listed in `components`.
   */
  implementations?: readonly PrometheusA2uiComponentImplementation[];
}

/** What a custom component's render function receives. */
export interface PrometheusA2uiComponentRenderProps {
  /** Resolved properties; data bindings come with a `set<Name>` writer. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
  buildChild: (id: string, basePath?: string) => ReactNode;
  context: ComponentContext;
}

/**
 * The official implementation of a basic component, for use as the `api` of
 * `createPrometheusA2uiComponent`, which reuses its schema and so keeps the
 * property names and bindings of the pinned official version.
 */
export function getPrometheusA2uiOfficialComponent(
  name: PrometheusA2uiComponentName,
): PrometheusA2uiComponentImplementation {
  const implementation = basicCatalog.components.get(name);
  if (!implementation) {
    throw new Error(`Official A2UI component is unavailable: ${name}`);
  }
  return implementation;
}

/**
 * Build a component on the official renderer bundled in this package.
 *
 * This package bundles the official `@a2ui/react` so that CommonJS and ESM
 * builds agree. A component created with an application's own copy of
 * `@a2ui/react` therefore cannot share its surface context. Create custom
 * components here so they run on the same instance as the surface.
 */
export function createPrometheusA2uiComponent(
  api: ComponentApi,
  render: FC<PrometheusA2uiComponentRenderProps>,
): PrometheusA2uiComponentImplementation {
  return createComponentImplementation(
    api,
    render as never,
  ) as PrometheusA2uiComponentImplementation;
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

  const overrides = new Map<string, PrometheusA2uiComponentImplementation>();
  for (const implementation of options.implementations ?? []) {
    if (!(componentNames as readonly string[]).includes(implementation.name)) {
      throw new Error(
        `Custom A2UI component is not in the allowlist: ${implementation.name}`,
      );
    }
    overrides.set(implementation.name, implementation);
  }

  const components = componentNames.map((name) => {
    const custom = overrides.get(name);
    if (custom) return custom;
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
    PROMETHEUS_A2UI_PROTOCOL_VERSION,
    components,
    functions,
    basicCatalog.themeSchema,
  );
}
