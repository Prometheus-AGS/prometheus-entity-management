/**
 * @prometheus-ags/prometheus-entity-management
 *
 * Compatibility alias. The React bindings now publish as
 * `@prometheus-ags/entity-graph-react`, matching every other framework binding
 * in this workspace (`entity-graph-solid`, `entity-graph-svelte`,
 * `entity-graph-alpine`, …).
 *
 * This package re-exports that one so existing installs keep resolving. New
 * code should depend on `@prometheus-ags/entity-graph-react` directly.
 *
 * Nothing is added or removed here — the export surface is whatever the React
 * binding exports, forwarded verbatim.
 */
export * from "@prometheus-ags/entity-graph-react";
