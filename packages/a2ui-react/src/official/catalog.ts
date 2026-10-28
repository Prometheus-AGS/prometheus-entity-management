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
import {
  DEFAULT_PROMETHEUS_A2UI_COMPONENTS,
  DEFAULT_PROMETHEUS_A2UI_FUNCTIONS,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  createAllowlistedCatalog,
  type PrometheusA2uiComponentName,
  type PrometheusA2uiFunctionName,
} from "./catalog-core.js";
import type { PrometheusA2uiComponentImplementation } from "./types.js";

// The constants and name types keep their public home in this module.
export {
  DEFAULT_PROMETHEUS_A2UI_COMPONENTS,
  DEFAULT_PROMETHEUS_A2UI_FUNCTIONS,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
};
export type { PrometheusA2uiComponentName, PrometheusA2uiFunctionName };

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
  return createAllowlistedCatalog<PrometheusA2uiComponentImplementation>(basicCatalog, {
    ...(options.id === undefined ? {} : { id: options.id }),
    ...(options.components === undefined ? {} : { components: options.components }),
    ...(options.functions === undefined ? {} : { functions: options.functions }),
    ...(options.implementations === undefined ? {} : { overrides: options.implementations }),
  });
}
