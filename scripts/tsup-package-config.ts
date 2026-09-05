import { defineConfig, type Options } from "tsup";

/**
 * Create the build contract shared by every public npm package.
 *
 * Keeping the extension here is deliberate: this file is the physical side of
 * the `exports` contract in each package manifest.
 */
export function definePackageConfig(options: Options = {}) {
  return defineConfig({
    entry: ["src/index.ts"],
    // ESM-only as of 4.0.0 — see PACKAGE_ENTRYPOINT_CONTRACT for why.
    format: ["esm"],
    dts: true,
    outExtension() {
      return { js: ".mjs" };
    },
    treeshake: true,
    sourcemap: true,
    clean: true,
    ...options,
  });
}
