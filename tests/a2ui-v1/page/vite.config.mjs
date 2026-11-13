import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * The A2UI 1.0 acceptance page (scripts/verify-a2ui-v1.mjs) runs against the
 * BUILT @prometheus-ags/a2ui-react: the package name resolves to the file its
 * package.json `exports["."]` names (dist/index.mjs), never to src. React, React
 * DOM, Zod and @prometheus-ags/entity-graph-core are resolved as if imported
 * from that file, so the page shares the exact module instances the built
 * package uses. Imports nothing but Node built-ins (the workspace root has no
 * `vite` package to import) and needs no React plugin (no JSX).
 *
 * The build goes to the run's scratch directory (A2UI_V1_OUT_DIR), not the tree.
 */

const pageRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(pageRoot, "../../..");
const packageRoot = resolve(workspaceRoot, "packages/a2ui-react");
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
const builtEntry = resolve(packageRoot, packageJson.exports["."].default);
const SHARED_WITH_PACKAGE = /^(react|react-dom|zod|@prometheus-ags\/entity-graph-core)(\/|$)/;
const port = Number(process.env.A2UI_V1_PORT ?? 4191);
const outDir = resolve(process.env.A2UI_V1_OUT_DIR ?? resolve(tmpdir(), "a2ui-v1-verify"), "page-dist");

const resolveThroughBuiltPackage = {
  name: "a2ui-v1-resolve-through-built-package",
  enforce: "pre",
  async resolveId(source, importer, options) {
    if (source === "@prometheus-ags/a2ui-react") return builtEntry;
    if (importer && importer.startsWith(pageRoot) && SHARED_WITH_PACKAGE.test(source)) {
      return this.resolve(source, builtEntry, { ...options, skipSelf: true });
    }
    return null;
  },
};

export default {
  root: pageRoot,
  plugins: [resolveThroughBuiltPackage],
  build: { outDir, emptyOutDir: true, target: "es2022", sourcemap: true },
  server: { host: "127.0.0.1", port, strictPort: true, fs: { allow: [workspaceRoot] } },
  preview: { host: "127.0.0.1", port, strictPort: true },
};
