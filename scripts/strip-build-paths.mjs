#!/usr/bin/env node
/**
 * strip-build-paths.mjs — remove internal absolute paths from the built site.
 *
 * Docusaurus serializes resolved config values (sidebarPath, customCss via
 * require.resolve) into the client bundle, leaking the build machine's
 * absolute workspace path into deployed assets. This postbuild step rewrites
 * every occurrence of the workspace-root absolute path in text build output
 * to a stable placeholder. Runs as part of the docs site `build` script so
 * local builds and CI artifacts are always safe to publish.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = join(workspaceRoot, "site/build");
const PLACEHOLDER = "<workspace-root>";

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (/\.(html|js|mjs|css|json|xml|txt|svg)$/.test(entry.name)) yield full;
  }
}

let rewritten = 0;
for await (const file of walk(buildDir)) {
  const text = await readFile(file, "utf8");
  if (!text.includes(workspaceRoot)) continue;
  await writeFile(file, text.split(workspaceRoot).join(PLACEHOLDER));
  rewritten += 1;
}

process.stdout.write(`strip-build-paths: rewrote ${rewritten} file(s)\n`);
