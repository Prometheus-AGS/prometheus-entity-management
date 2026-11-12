import { definePackageConfig } from "../../scripts/tsup-package-config";

export default definePackageConfig({
  entry: {
    index: "src/index.ts",
    "ag-ui": "src/ag-ui/index.ts",
    headless: "src/headless.ts",
  },
  // Bundle the renderer and the sanitized Markdown adapter. Keep core and Zod
  // shared so a consumer's binder works with the runtime's actual schemas.
  noExternal: [/^@a2ui\/(?:react|markdown-it)(?:\/|$)/, "dompurify", "markdown-it"],
  external: [
    "@a2ui/web_core",
    "@prometheus-ags/entity-graph-core",
    "react",
    "react-dom",
    "zustand",
    "zustand/vanilla",
    "immer",
    "zod",
  ],
});
