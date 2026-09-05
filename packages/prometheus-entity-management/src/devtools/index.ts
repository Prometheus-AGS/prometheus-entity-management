/**
 * Alias entrypoint for `@prometheus-ags/prometheus-entity-management/devtools`.
 *
 * Forwards `@prometheus-ags/entity-graph-react/devtools`. This entrypoint must
 * exist: the package it replaces published three entrypoints, and an alias that
 * only re-exported the root would silently break every consumer importing
 * `.../devtools`.
 */
export * from "@prometheus-ags/entity-graph-react/devtools";
