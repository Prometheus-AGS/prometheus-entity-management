import type { ReactCatalogComponent } from "@a2ui/react/v0_9" with { "resolution-mode": "import" };

/**
 * An entry of a Prometheus A2UI catalog: an official React component
 * implementation or an official Web Component implementation.
 *
 * From `@a2ui/react` 0.13 the official basic catalog renders as W3C Custom
 * Elements, so a catalog holds both kinds. Custom components built with
 * `createPrometheusA2uiComponent` are React implementations. The published
 * declarations inline the official types (see `tsup.config.ts`), so this alias
 * never sends consumers to the official packages' declarations. Runtime
 * ownership remains entirely with the official implementation.
 */
export type PrometheusA2uiComponentImplementation = ReactCatalogComponent;
