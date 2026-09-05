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
    name: "@prometheus-ags/entity-graph-react",
  },
  {
    directory: "packages/prometheus-entity-management",
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

// ESM-only as of 4.0.0.
//
// The dual-format contract ended when @tanstack/react-table v9 shipped
// ESM-only ("type": "module", a single exports entry, no CJS build). A CJS
// declaration file cannot `require` an ESM dependency's types — TS1479 — so
// the React binding could not both re-export v9's types and ship a .d.cts.
//
// Rather than special-case one package, every package is ESM. That is a
// breaking change for CommonJS consumers and is why 4.0.0 is a major.
export const PACKAGE_ENTRYPOINT_CONTRACT = Object.freeze({
  type: "module",
  main: "./dist/index.mjs",
  module: "./dist/index.mjs",
  types: "./dist/index.d.ts",
  exports: {
    types: "./dist/index.d.ts",
    default: "./dist/index.mjs",
  },
});
