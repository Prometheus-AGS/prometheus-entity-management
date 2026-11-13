import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * The conformance page runs against the BUILT @prometheus-ags/a2ui-react:
 * the package name resolves to the file its package.json `exports["."]`
 * names (dist/index.mjs), never to src. React, React DOM and Zod are
 * resolved as if imported from that file, so the page shares the exact
 * module instances the built package uses (one React, one zod/v3 for the
 * schemas the bundled official renderer inspects).
 *
 * The workspace root has no `vite` or `@vitejs/*` package to import, so this
 * config imports nothing but Node built-ins and needs no React plugin (the
 * page uses createElement, not JSX).
 */

const harnessRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(harnessRoot, "../../../..");
const packageRoot = resolve(workspaceRoot, "packages/a2ui-react");
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
const builtEntry = resolve(packageRoot, packageJson.exports["."].default);
const SHARED_WITH_PACKAGE = /^(react|react-dom|zod)(\/|$)/;
const port = Number(process.env.A2UI_CONFORMANCE_PORT ?? 4185);

const resolveThroughBuiltPackage = {
  name: "a2ui-conformance-resolve-through-built-package",
  enforce: "pre",
  async resolveId(source, importer, options) {
    if (source === "@prometheus-ags/a2ui-react") return builtEntry;
    if (importer && importer.startsWith(harnessRoot) && SHARED_WITH_PACKAGE.test(source)) {
      return this.resolve(source, builtEntry, { ...options, skipSelf: true });
    }
    return null;
  },
};

export default {
  root: harnessRoot,
  plugins: [resolveThroughBuiltPackage],
  build: {
    outDir: resolve(harnessRoot, "dist"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
  },
  server: { host: "127.0.0.1", port, strictPort: true, fs: { allow: [workspaceRoot] } },
  preview: { host: "127.0.0.1", port, strictPort: true },
};
