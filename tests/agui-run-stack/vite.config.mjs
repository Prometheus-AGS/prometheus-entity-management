import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * The UPG-10/11/12 page runs against the BUILT packages: the
 * `@prometheus-ags/a2ui-react` specifiers resolve to the files its
 * package.json `exports` names (dist/), never to src. React, React DOM, Zod
 * and @prometheus-ags/entity-graph-core are resolved as if imported from the
 * built entry, so the page shares the exact module instances the package uses
 * (one React, one graph module). @ag-ui/client resolves normally from the
 * workspace root (the 1.0.x the root devDependencies pin).
 *
 * At the end of the build the plugin writes every resolved module id to
 * AGUI_RUN_STACK_RESOLUTION, so the verifier can prove nothing came from a
 * package's src/ directory.
 */

const pageRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(pageRoot, "../..");
const packageRoot = resolve(workspaceRoot, "packages/a2ui-react");
const packageJson = JSON.parse(readFileSync(resolve(packageRoot, "package.json"), "utf8"));
const builtEntries = {
  "@prometheus-ags/a2ui-react": resolve(packageRoot, packageJson.exports["."].default),
  "@prometheus-ags/a2ui-react/ag-ui": resolve(packageRoot, packageJson.exports["./ag-ui"].default),
};
const SHARED_WITH_PACKAGE = /^(react|react-dom|zod|@prometheus-ags\/entity-graph-core)(\/|$)/;
const port = Number(process.env.AGUI_RUN_STACK_PORT ?? 4211);
const resolutionPath = process.env.AGUI_RUN_STACK_RESOLUTION;

const resolved = {};

const resolveThroughBuiltPackage = {
  name: "agui-run-stack-resolve-through-built-package",
  enforce: "pre",
  async resolveId(source, importer, options) {
    if (source in builtEntries) {
      resolved[source] = builtEntries[source];
      return builtEntries[source];
    }
    if (importer && importer.startsWith(pageRoot) && SHARED_WITH_PACKAGE.test(source)) {
      const hit = await this.resolve(source, builtEntries["@prometheus-ags/a2ui-react/ag-ui"], { ...options, skipSelf: true });
      if (hit) resolved[source] = hit.id;
      return hit;
    }
    if (importer && importer.startsWith(pageRoot) && source.startsWith("@ag-ui/")) {
      const hit = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (hit) resolved[source] = hit.id;
      return hit;
    }
    return null;
  },
  buildEnd() {
    if (!resolutionPath) return;
    const moduleIds = [...this.getModuleIds()].map((id) => {
      const path = id.split("?")[0];
      return path.startsWith(workspaceRoot) ? relative(workspaceRoot, path) : path;
    });
    mkdirSync(dirname(resolutionPath), { recursive: true });
    writeFileSync(
      resolutionPath,
      `${JSON.stringify({
        builtEntries: Object.fromEntries(Object.entries(builtEntries).map(([key, path]) => [key, relative(workspaceRoot, path)])),
        resolved: Object.fromEntries(Object.entries(resolved).map(([key, path]) => [key, path.startsWith(workspaceRoot) ? relative(workspaceRoot, path.split("?")[0]) : path])),
        moduleIds: moduleIds.sort(),
      }, null, 2)}\n`,
    );
  },
};

export default {
  root: pageRoot,
  plugins: [resolveThroughBuiltPackage],
  build: {
    outDir: resolve(pageRoot, "dist"),
    emptyOutDir: true,
    target: "es2022",
    sourcemap: true,
  },
  server: { host: "127.0.0.1", port, strictPort: true, fs: { allow: [workspaceRoot] } },
  preview: { host: "127.0.0.1", port, strictPort: true },
};
