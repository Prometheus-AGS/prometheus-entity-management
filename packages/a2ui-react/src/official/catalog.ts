import type {
  Catalog,
  ComponentApi,
  ComponentContext,
} from "@a2ui/web_core/v0_9" with { "resolution-mode": "import" };
// @a2ui/react 0.13 moved the basic catalog to web_core, where its components
// render as W3C Custom Elements; @a2ui/react supplies only the React adapter.
import { createComponentImplementation } from "@a2ui/react/v0_9";
import { basicCatalog } from "@a2ui/web_core/v0_9/basic_catalog";
import { basicCatalog as basicCatalogV1 } from "@a2ui/web_core/catalogs/basic/v1";
import type { FC, ReactNode } from "react";
import {
  DEFAULT_PROMETHEUS_A2UI_COMPONENTS,
  DEFAULT_PROMETHEUS_A2UI_FUNCTIONS,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  PROMETHEUS_A2UI_V1_CATALOG_ID,
  PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
  createAllowlistedCatalog,
  type PrometheusA2uiComponentName,
  type PrometheusA2uiFunctionName,
  type PrometheusA2uiProtocolVersion,
} from "./catalog-core.js";
import { withAccessibility } from "./accessibility.js";
import type { PrometheusA2uiComponentImplementation } from "./types.js";

// The constants and name types keep their public home in this module.
export {
  DEFAULT_PROMETHEUS_A2UI_COMPONENTS,
  DEFAULT_PROMETHEUS_A2UI_FUNCTIONS,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  PROMETHEUS_A2UI_V1_CATALOG_ID,
  PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
};
export type {
  PrometheusA2uiComponentName,
  PrometheusA2uiFunctionName,
  PrometheusA2uiProtocolVersion,
};

/** The official basic catalog for a protocol version. */
function officialBasicCatalog(protocolVersion: PrometheusA2uiProtocolVersion) {
  return protocolVersion === PROMETHEUS_A2UI_V1_PROTOCOL_VERSION ? basicCatalogV1 : basicCatalog;
}

export interface PrometheusA2uiCatalogOptions {
  /** Stable catalog id advertised to agents; defaults to the id for `protocolVersion`. */
  id?: string;
  /**
   * Wire protocol version of the catalog: `v0.9.1` (default) or `1.0`. A 1.0
   * surface renders only against a 1.0 catalog, so a runtime that accepts both
   * holds one catalog of each.
   */
  protocolVersion?: PrometheusA2uiProtocolVersion;
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
  protocolVersion: PrometheusA2uiProtocolVersion = PROMETHEUS_A2UI_PROTOCOL_VERSION,
): PrometheusA2uiComponentImplementation {
  const implementation = officialBasicCatalog(protocolVersion).components.get(name);
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
  // A2UI 1.0 accessibility (`@accessibility` → ARIA), which @a2ui/react 0.15.0
  // does not apply to React implementations; see accessibility.ts.
  return createComponentImplementation(
    api,
    withAccessibility(render) as never,
  ) as PrometheusA2uiComponentImplementation;
}

/**
 * Create a catalog containing only explicitly allowed official implementations.
 * Unknown names throw during configuration rather than failing during render.
 */
export function createPrometheusA2uiCatalog(
  options: PrometheusA2uiCatalogOptions = {},
): Catalog<PrometheusA2uiComponentImplementation> {
  const protocolVersion = options.protocolVersion ?? PROMETHEUS_A2UI_PROTOCOL_VERSION;
  return createAllowlistedCatalog<PrometheusA2uiComponentImplementation>(officialBasicCatalog(protocolVersion), {
    protocolVersion,
    ...(options.id === undefined ? {} : { id: options.id }),
    ...(options.components === undefined ? {} : { components: options.components }),
    ...(options.functions === undefined ? {} : { functions: options.functions }),
    ...(options.implementations === undefined ? {} : { overrides: options.implementations }),
  });
}
