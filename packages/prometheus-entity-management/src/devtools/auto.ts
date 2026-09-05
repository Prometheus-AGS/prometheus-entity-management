/**
 * Alias entrypoint for
 * `@prometheus-ags/prometheus-entity-management/devtools/auto`.
 *
 * This entrypoint is a SIDE EFFECT — importing it mounts the devtools host.
 * The bare `import` below is therefore load-bearing and must not be replaced
 * with a type-only re-export; `sideEffects` in package.json marks the built
 * output so a bundler does not drop it.
 */
import "@prometheus-ags/entity-graph-react/devtools/auto";

export * from "@prometheus-ags/entity-graph-react/devtools/auto";
