import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const siteRoot = join(root, "site");
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const sitePkg = JSON.parse(readFileSync(join(siteRoot, "package.json"), "utf8"));

const REQUIRED_FILES = [
  "site/package.json",
  "site/docusaurus.config.js",
  "site/sidebars.js",
  "site/README.md",
  "site/src/css/custom.css",
  "site/src/pages/index.js",
  "site/src/pages/index.module.css",
  "site/static/img/prometheus-mark.svg",
  "site/static/img/prometheus-mark-dark.svg",
  "site/static/img/favicon.ico",
  "site/static/img/social-card.png",
  "site/docs/product/overview.md",
  "site/docs/product/architecture.md",
  "site/docs/packages/overview.md",
  "site/docs/examples/overview.md",
  "docs/branding/ASSETS.md",
  "scripts/verify-docs-foundation.mjs",
];

const SITE_ONLY_DEPS = [
  "@docusaurus/core",
  "@docusaurus/preset-classic",
  "@docusaurus/theme-mermaid",
  "@docusaurus/module-type-aliases",
  "@docusaurus/types",
  "@easyops-cn/docusaurus-search-local",
  "@mdx-js/react",
  "prism-react-renderer",
  "mermaid",
  "@prometheus-ags/entity-graph-docs-site",
];

function* walkPublishableManifests(dir) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith(".") || entry === "node_modules") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* walkPublishableManifests(full);
    else if (entry === "package.json") yield full;
  }
}

test("the docs-foundation file surface exists", () => {
  for (const file of REQUIRED_FILES) {
    assert.equal(existsSync(join(root, file)), true, `missing ${file}`);
  }
});

test("the site is a private pnpm workspace package", () => {
  assert.equal(sitePkg.private, true, "site must be private");
  assert.equal(sitePkg.name, "@prometheus-ags/entity-graph-docs-site");
  const workspaceYaml = readFileSync(join(root, "pnpm-workspace.yaml"), "utf8");
  assert.match(workspaceYaml, /^\s*-\s*"site"$/m, 'pnpm-workspace.yaml must include "site"');
});

test("all @docusaurus/* packages are pinned to one version", () => {
  const docusaurusDeps = Object.entries({ ...sitePkg.dependencies, ...sitePkg.devDependencies })
    .filter(([name]) => name.startsWith("@docusaurus/"));
  assert.ok(docusaurusDeps.length >= 3, "expected core, preset-classic, theme-mermaid at minimum");
  const versions = new Set(docusaurusDeps.map(([, version]) => version));
  assert.deepEqual([...versions], ["3.10.2"], "every @docusaurus/* dep must be exactly 3.10.2");
});

test("root scripts expose the docs gates", () => {
  for (const script of [
    "docs:start",
    "docs:build",
    "verify:docs-foundation",
    "test:v3-docs-foundation-brand",
    "bdd:docs-foundation",
  ]) {
    assert.ok(rootPkg.scripts[script], `missing root script ${script}`);
  }
});

test("site-only dependencies never leak into publishable packages", () => {
  const leaks = [];
  for (const manifest of walkPublishableManifests(join(root, "packages"))) {
    const pkg = JSON.parse(readFileSync(manifest, "utf8"));
    const declared = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ]);
    for (const dep of SITE_ONLY_DEPS) {
      if (declared.has(dep)) leaks.push(`${dep} in ${manifest}`);
    }
  }
  assert.deepEqual(leaks, [], "site-only dependencies leaked into publishable packages");
});

test("broken links and anchors fail the build", () => {
  const config = readFileSync(join(siteRoot, "docusaurus.config.js"), "utf8");
  assert.ok(config.includes("onBrokenLinks: 'throw'"), "onBrokenLinks must throw");
  assert.ok(config.includes("onBrokenMarkdownLinks: 'throw'"), "onBrokenMarkdownLinks must throw");
});

test("brand assets have documented provenance and accessible alternatives", () => {
  const assets = readFileSync(join(root, "docs/branding/ASSETS.md"), "utf8");
  for (const asset of [
    "prometheus-mark.svg",
    "prometheus-mark-dark.svg",
    "favicon.ico",
    "social-card.png",
  ]) {
    assert.ok(assets.includes(asset), `ASSETS.md must document ${asset}`);
  }
  assert.ok(assets.includes("Provenance"), "ASSETS.md must record provenance");
  assert.ok(assets.includes("Accessible alternative"), "ASSETS.md must record accessible alternatives");
  const config = readFileSync(join(siteRoot, "docusaurus.config.js"), "utf8");
  assert.match(config, /logo:\s*\{[^}]*alt:/s, "navbar logo must carry alt text");
});

test("light and dark brand themes are defined", () => {
  const css = readFileSync(join(siteRoot, "src/css/custom.css"), "utf8");
  assert.ok(css.includes(":root"), "light theme tokens missing");
  assert.ok(css.includes("[data-theme='dark']"), "dark theme tokens missing");
  assert.ok(css.includes("--prometheus-ember"), "prometheus brand tokens missing");
  assert.ok(css.includes(":focus-visible"), "focus-visible accessibility rule missing");
});

test("every doc page follows the content contract", () => {
  const docsRoot = join(siteRoot, "docs");
  const pages = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith(".md")) pages.push(full);
    }
  })(docsRoot);
  assert.ok(pages.length >= 4, "expected product/packages/examples pages");
  const sidebars = readFileSync(join(siteRoot, "sidebars.js"), "utf8");
  for (const page of pages) {
    const source = readFileSync(page, "utf8");
    assert.match(source, /^---\n[\s\S]*?title:/, `${page} must declare a title`);
    assert.match(source, /^---\n[\s\S]*?description:/, `${page} must declare a description`);
    const docId = page.slice(docsRoot.length + 1, -".md".length);
    assert.ok(sidebars.includes(docId), `${docId} must be reachable from a sidebar (no orphans)`);
  }
});

test("navigation, search, mermaid, SEO, and edit links are wired", () => {
  const config = readFileSync(join(siteRoot, "docusaurus.config.js"), "utf8");
  for (const marker of [
    "productSidebar",
    "packagesSidebar",
    "examplesSidebar",
    "@easyops-cn/docusaurus-search-local",
    "@docusaurus/theme-mermaid",
    "mermaid: true",
    "img/social-card.png",
    "twitter:card",
    "editUrl:",
    "Prometheus-AGS/prometheus-entity-management/edit/",
    "respectPrefersColorScheme: true",
  ]) {
    assert.ok(config.includes(marker), `docusaurus.config.js missing ${marker}`);
  }
});
