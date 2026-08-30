export const PUBLIC_PACKAGES = Object.freeze([
  { directory: "packages/a2ui-react", name: "@prometheus-ags/a2ui-react" },
  { directory: "packages/entity-graph-a2a", name: "@prometheus-ags/entity-graph-a2a" },
  { directory: "packages/entity-graph-alpine", name: "@prometheus-ags/entity-graph-alpine" },
  {
    directory: "packages/entity-graph-core",
    name: "@prometheus-ags/entity-graph-core",
    attwExcludeEntrypoints: [
      "devtools/fixtures/entity-inspection-v1.json",
      "devtools/fixtures/time-travel-v1.json",
    ],
  },
  { directory: "packages/entity-graph-htmx", name: "@prometheus-ags/entity-graph-htmx" },
  {
    directory: "packages/entity-graph-react",
    name: "@prometheus-ags/prometheus-entity-management",
  },
  { directory: "packages/entity-graph-sdl", name: "@prometheus-ags/entity-graph-sdl" },
  { directory: "packages/entity-graph-solid", name: "@prometheus-ags/entity-graph-solid" },
  { directory: "packages/entity-graph-svelte", name: "@prometheus-ags/entity-graph-svelte" },
  { directory: "packages/entity-graph-sync", name: "@prometheus-ags/entity-graph-sync" },
  { directory: "packages/entity-graph-tauri", name: "@prometheus-ags/entity-graph-tauri" },
  {
    directory: "packages/entity-graph-web-components",
    name: "@prometheus-ags/entity-graph-web-components",
  },
]);

export const PACKAGE_NODE_ENGINE = "^22.14.0 || ^24.0.0 || >=26.0.0";
export const PACKAGE_REPOSITORY_URL =
  "https://github.com/Prometheus-AGS/prometheus-entity-management";
export const PACKAGE_BUGS_URL =
  "https://github.com/prometheus-ags/prometheus-entity-management/issues";

export const PACKAGE_ENTRYPOINT_CONTRACT = Object.freeze({
  main: "./dist/index.cjs",
  module: "./dist/index.mjs",
  types: "./dist/index.d.ts",
  exports: {
    import: {
      types: "./dist/index.d.ts",
      default: "./dist/index.mjs",
    },
    require: {
      types: "./dist/index.d.cts",
      default: "./dist/index.cjs",
    },
  },
});
