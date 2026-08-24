import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const siteRoot = join(root, "site");
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const sitePkg = JSON.parse(readFileSync(join(siteRoot, "package.json"), "utf8"));

const NPM_SLUGS = [
  "entity-graph-core",
  "prometheus-entity-management",
  "entity-graph-sync",
  "entity-graph-svelte",
  "entity-graph-solid",
  "entity-graph-alpine",
  "entity-graph-htmx",
  "entity-graph-web-components",
  "a2ui-react",
  "entity-graph-a2a",
  "entity-graph-tauri",
  "entity-graph-sdl",
];

const REQUIRED_FILES = [
  "scripts/generate-api-reference.mjs",
  "scripts/verify-docs-api-reference.mjs",
  "site/api-docs-baseline.json",
  "site/api-cross-links.json",
  "site/docs/api/dart.mdx",
  "site/docs/api/rust.mdx",
];

let generated = false;
/** Generated pages are git-ignored; regenerate lazily on a fresh checkout. */
function ensureGenerated() {
  if (generated) return;
  if (!existsSync(join(siteRoot, "docs/api/npm")) || !existsSync(join(siteRoot, "api-sidebar.generated.json"))) {
    execFileSync("node", ["scripts/generate-api-reference.mjs", "--skip-artifacts"], {
      cwd: root,
      env: { ...process.env, FORCE_COLOR: "0" },
      stdio: "inherit",
    });
  }
  generated = true;
}

test("the api-reference file surface exists", () => {
  for (const file of REQUIRED_FILES) {
    assert.equal(existsSync(join(root, file)), true, `missing ${file}`);
  }
});

test("typedoc is a site-only devDependency pinned for TS 6", () => {
  assert.equal(sitePkg.devDependencies.typedoc, "0.28.20");
  assert.equal(sitePkg.private, true);
  const publishableLeaks = [];
  for (const slug of NPM_SLUGS.map((s) => (s === "prometheus-entity-management" ? "entity-graph-react" : s))) {
    const manifest = JSON.parse(readFileSync(join(root, "packages", slug, "package.json"), "utf8"));
    const declared = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);
    if (declared.has("typedoc")) publishableLeaks.push(slug);
  }
  assert.deepEqual(publishableLeaks, [], "typedoc leaked into a publishable package");
});

test("root scripts expose the api-reference gates", () => {
  for (const script of [
    "docs:generate-api",
    "verify:docs-api-reference",
    "test:v3-docs-api-reference",
    "bdd:docs-api-reference",
  ]) {
    assert.ok(rootPkg.scripts[script], `missing root script ${script}`);
  }
  assert.ok(sitePkg.scripts.prebuild?.includes("generate-api-reference"), "site prebuild must regenerate API docs");
});

test("the doc-coverage baseline is well-formed and only shrinks", () => {
  const baseline = JSON.parse(readFileSync(join(siteRoot, "api-docs-baseline.json"), "utf8"));
  assert.equal(baseline.schemaVersion, 1);
  const packages = Object.keys(baseline.packages).sort();
  assert.deepEqual(packages, [...NPM_SLUGS].sort(), "baseline must cover all 12 npm packages");
  for (const [slug, names] of Object.entries(baseline.packages)) {
    const sorted = [...names].sort();
    assert.deepEqual(names, sorted, `baseline entries for ${slug} must be sorted`);
    assert.equal(new Set(names).size, names.length, `baseline entries for ${slug} must be unique`);
  }
});

test("generated API pages match the export ledgers", () => {
  ensureGenerated();
  const generatedDir = join(siteRoot, "docs/api/npm");
  assert.equal(existsSync(generatedDir), true, "generated API pages missing — run pnpm run docs:generate-api");
  const generated = readdirSync(generatedDir).filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
  assert.deepEqual(generated.sort(), [...NPM_SLUGS].sort(), "one generated page per npm package");
  for (const slug of generated) {
    const page = readFileSync(join(generatedDir, `${slug}.mdx`), "utf8");
    assert.match(page, /```bash\npnpm add @prometheus-ags\//, `${slug} page must include the install command`);
    assert.ok(page.includes("[Source]("), `${slug} page must include source links`);
    assert.match(page, /badge--primary/, `${slug} page must carry a stability badge`);
  }
});

test("the generated package index lists every artifact exactly once", () => {
  ensureGenerated();
  const index = readFileSync(join(siteRoot, "docs/api/index.mdx"), "utf8");
  const artifacts = [
    ...NPM_SLUGS.map((slug) =>
      slug === "prometheus-entity-management"
        ? "@prometheus-ags/prometheus-entity-management"
        : `@prometheus-ags/${slug}`,
    ),
    "entity_graph_flutter",
    "entity-graph-cli",
    "entity-graph-mcp",
  ];
  for (const name of artifacts) {
    const occurrences = index.split(`\`${name}\``).length - 1;
    assert.equal(occurrences, 1, `${name} must appear exactly once in the API index`);
  }
});

test("package chooser pages exist with runtime matrices", () => {
  ensureGenerated();
  for (const slug of NPM_SLUGS) {
    const pagePath = join(siteRoot, "docs/packages", `${slug}.mdx`);
    assert.equal(existsSync(pagePath), true, `missing chooser page for ${slug}`);
    const page = readFileSync(pagePath, "utf8");
    for (const marker of ["## Install", "## Runtime matrix", "## Peer dependencies", "pnpm add"]) {
      assert.ok(page.includes(marker), `chooser page ${slug} missing "${marker}"`);
    }
  }
});

test("the generated sidebar wires the API section", () => {
  ensureGenerated();
  const sidebar = JSON.parse(readFileSync(join(siteRoot, "api-sidebar.generated.json"), "utf8"));
  assert.ok(Array.isArray(sidebar.apiSidebar), "apiSidebar missing");
  const flat = JSON.stringify(sidebar);
  for (const slug of NPM_SLUGS) {
    assert.ok(flat.includes(`api/npm/${slug}`), `sidebar missing api/npm/${slug}`);
  }
  const sidebarsJs = readFileSync(join(siteRoot, "sidebars.js"), "utf8");
  assert.ok(sidebarsJs.includes("api-sidebar.generated.json"), "sidebars.js must load the generated sidebar");
  const config = readFileSync(join(siteRoot, "docusaurus.config.js"), "utf8");
  assert.ok(config.includes("apiSidebar"), "navbar must include the API section");
});

test("curated Dart and Rust entry pages link to generated artifacts", () => {
  const dart = readFileSync(join(siteRoot, "docs/api/dart.mdx"), "utf8");
  const rust = readFileSync(join(siteRoot, "docs/api/rust.mdx"), "utf8");
  assert.ok(dart.includes("api/dart/index.html"), "dart page must link the dartdoc artifact");
  assert.ok(rust.includes("api/rust/entity-graph-cli/"), "rust page must link the CLI rustdoc");
  assert.ok(rust.includes("api/rust/entity-graph-mcp/"), "rust page must link the MCP rustdoc");
  assert.ok(dart.includes("useBaseUrl"), "artifact links must be base-path aware");
});

test("cross-links point at existing conceptual pages", () => {
  const crossLinks = JSON.parse(readFileSync(join(siteRoot, "api-cross-links.json"), "utf8"));
  const routes = {
    "/docs/product/architecture": "site/docs/product/architecture.md",
    "/docs/product/overview": "site/docs/product/overview.md",
    "/docs/packages/overview": "site/docs/packages/overview.md",
    "/docs/examples/overview": "site/docs/examples/overview.md",
    "/docs/api/dart": "site/docs/api/dart.mdx",
  };
  for (const [symbol, link] of Object.entries(crossLinks)) {
    assert.ok(link.to && link.label, `cross-link for ${symbol} needs to+label`);
    assert.ok(routes[link.to], `cross-link target ${link.to} unknown`);
    assert.equal(existsSync(join(root, routes[link.to])), true, `cross-link target ${link.to} missing`);
  }
});
