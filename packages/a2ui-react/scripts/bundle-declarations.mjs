// Re-bundles the declarations tsup emitted so that the official `@a2ui/*`
// types are inlined and the published `.d.ts` never imports `@a2ui/*`.
//
// Why: consumers install the registry `@a2ui/web_core`, whose v0.8
// declarations use extension-less relative imports. Importing any of its type
// entry points loads them, which fails with TS2835 under NodeNext with
// `skipLibCheck: false` (issue #75). The repository's pnpm patch fixes only this
// workspace. tsup's own `dts.resolve` cannot do this: its resolver ignores
// package `exports` maps, so `@a2ui/web_core/v0_9` stays external.
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";
import { dts } from "rollup-plugin-dts";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const dist = join(packageRoot, "dist");
const staging = join(dist, ".declarations-source");
const ENTRIES = ["index", "ag-ui", "headless"];
const INLINED = /^@a2ui\//;

const declarationFiles = (await readdir(dist)).filter((name) => name.endsWith(".d.ts"));
if (!ENTRIES.every((entry) => declarationFiles.includes(`${entry}.d.ts`))) {
  throw new Error(`bundle-declarations: tsup did not emit every entry (${ENTRIES.join(", ")})`);
}

await rm(staging, { recursive: true, force: true });
await mkdir(staging);
for (const name of declarationFiles) await cp(join(dist, name), join(staging, name));
for (const name of declarationFiles) await rm(join(dist, name));

try {
  const bundle = await rollup({
    input: Object.fromEntries(ENTRIES.map((entry) => [entry, join(staging, `${entry}.d.ts`)])),
    // Only `@a2ui/*` is inlined; every other bare specifier stays an import.
    external: (id) => !INLINED.test(id) && !id.startsWith(".") && !id.startsWith("/") && !id.startsWith("\0"),
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: { module: 199 /* NodeNext */, moduleResolution: 99 /* NodeNext */ },
      }),
    ],
  });
  await bundle.write({
    dir: dist,
    format: "es",
    entryFileNames: "[name].d.ts",
    chunkFileNames: "types-[hash].d.ts",
  });
  await bundle.close();
} finally {
  await rm(staging, { recursive: true, force: true });
}
