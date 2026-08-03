import { defineConfig, type Options } from "tsup";

/**
 * Create the build contract shared by every public npm package.
 *
 * Keeping the extensions here is deliberate: these files are the physical
 * side of the conditional `exports` contract in each package manifest.
 */
export function definePackageConfig(options: Options = {}) {
  return defineConfig({
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outExtension({ format }) {
      return { js: format === "esm" ? ".mjs" : ".cjs" };
    },
    treeshake: true,
    sourcemap: true,
    clean: true,
    ...options,
  });
}
