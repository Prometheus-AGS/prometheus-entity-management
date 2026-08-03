import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const root = new URL("../..", import.meta.url);

function files(directory, basename) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", "node_modules", "dist", ".next", ".turbo", "target"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return files(path, basename);
    return entry.isFile() && entry.name === basename ? [path] : [];
  });
}

function json(path) {
  return JSON.parse(readFileSync(new URL(path, root), "utf8"));
}

test("the root pnpm lockfile is the only workspace lock and has no external link importers", () => {
  const rootPath = root.pathname;
  const locks = files(rootPath, "pnpm-lock.yaml").map((path) => relative(rootPath, path));
  assert.deepEqual(locks, ["pnpm-lock.yaml"]);
  const lock = readFileSync(new URL("pnpm-lock.yaml", root), "utf8");
  assert.doesNotMatch(lock, /specifier:\s+(?:link|file):/);
  assert.match(lock, /overrides:\n\s+postcss: 8\.5\.25\n\s+sharp: 0\.35\.0/);
});

test("workspace manifests contain no external link or file dependency", () => {
  const rootPath = root.pathname;
  const manifests = [
    join(rootPath, "package.json"),
    ...files(join(rootPath, "packages"), "package.json"),
    ...files(join(rootPath, "examples"), "package.json"),
  ];
  for (const path of manifests) {
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    const specs = [manifest.dependencies, manifest.devDependencies, manifest.optionalDependencies]
      .flatMap((section) => Object.values(section ?? {}));
    for (const spec of specs) assert.doesNotMatch(spec, /^(?:link|file):/, relative(rootPath, path));
  }
});

test("CI uses a frozen install and covers every supported Node line and named gate", () => {
  const workflow = readFileSync(new URL(".github/workflows/ci.yml", root), "utf8");
  assert.match(workflow, /node: \[22, 24, 26\]/);
  assert.match(workflow, /pnpm install --frozen-lockfile/);
  for (const gate of ["validate", "lint", "typecheck", "build", "test", "skills", "security"]) {
    assert.match(workflow, new RegExp(`pnpm run ci:${gate}`));
  }
});

test("intentional dependency holds are explicit and assigned a revisit change", () => {
  const policy = json("release/dependency-policy.json");
  assert.deepEqual(policy.intentionalHolds.map(({ package: name }) => name).sort(), [
    "@types/node",
    "react-day-picker",
    "typescript",
  ]);
  for (const hold of policy.intentionalHolds) {
    assert.ok(hold.rationale.length >= 40, hold.package);
    assert.match(hold.revisitChange, /^v3-/);
  }
});

test("example build configuration is self-contained and native-loader compatible", () => {
  const nextConfig = readFileSync(new URL("examples/nextjs-app/next.config.ts", root), "utf8");
  const viteConfig = readFileSync(new URL("examples/vite-app/vite.config.ts", root), "utf8");
  assert.match(nextConfig, /new URL\("\.\.\/\.\.", import\.meta\.url\)/);
  assert.match(nextConfig, /turbopack:\s*\{\s*root: workspaceRoot/s);
  assert.match(viteConfig, /import\.meta\.dirname/);
  assert.doesNotMatch(viteConfig, /\b__dirname\b/);
  for (const path of ["examples/vite-app/package.json", "examples/nextjs-app/package.json"]) {
    const manifest = json(path);
    assert.equal(manifest.dependencies.shadcn, undefined);
    assert.ok(manifest.scripts.build);
    assert.ok(manifest.scripts.typecheck);
  }
});

test("React workspaces pin one test renderer while preserving a compatible v3 peer range", () => {
  for (const path of ["packages/entity-graph-react/package.json", "packages/a2ui-react/package.json"]) {
    const manifest = json(path);
    assert.equal(manifest.peerDependencies.react, ">=19.0.0 <20.0.0", path);
    assert.equal(manifest.peerDependencies["react-dom"], ">=19.0.0 <20.0.0", path);
    assert.equal(manifest.devDependencies.react, "19.2.8", path);
    assert.equal(manifest.devDependencies["react-dom"], "19.2.8", path);
  }
});
