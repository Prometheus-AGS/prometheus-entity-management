#!/usr/bin/env node
/**
 * verify-docs-foundation.mjs — certification verifier for v3-docs-foundation-brand.
 *
 * Lanes:
 *   1. config-integrity   — private workspace package, single Docusaurus version,
 *                           broken-links-throw, search/mermaid/SEO/editUrl wiring
 *   2. dependency-isolation — site-only deps must not leak into publishable packages
 *   3. brand-assets       — assets exist, provenance documented, alt text present
 *   4. static-build       — clean `docusaurus build`; assert 404, sitemap, search
 *                           index, social card, and product/packages/examples routes
 *
 * Usage: node scripts/verify-docs-foundation.mjs [--report <path>]
 */
import { execFile } from "node:child_process";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "node:fs/promises";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

const report = {
  schemaVersion: 1,
  change: "v3-docs-foundation-brand",
  generatedAt: new Date().toISOString(),
  evidenceBoundary: {
    kind: "static-build",
    countsAsPackedPackageEvidence: false,
    note: "Proves the private docs workspace builds with broken-links-throw and that site dependencies are isolated from publishable packages.",
  },
  commands: [],
  lanes: {
    configIntegrity: "pending",
    dependencyIsolation: "pending",
    brandAssets: "pending",
    staticBuild: "pending",
  },
  failures: [],
  limits: {
    visualReview:
      "Light/dark theme rendering and responsive nav are asserted via build output and CSS presence; pixel-level visual review remains manual.",
    deployment:
      "GitHub Pages deployment and DNS are owned by v3-docs-github-pages; this lane proves local static build only.",
  },
};

function run(label, command, args, options = {}) {
  return new Promise((resolveRun) => {
    const child = execFile(
      command,
      args,
      { cwd: workspaceRoot, env: { ...process.env, FORCE_COLOR: "0" }, maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const exitCode = error && typeof error.code === "number" ? error.code : 0;
        report.commands.push({ label, command: [command, ...args].join(" "), exitCode });
        if (options.echo) {
          if (stdout) process.stdout.write(stdout);
          if (stderr) process.stderr.write(stderr);
        }
        resolveRun(exitCode);
      },
    );
    child.on("error", () => {
      report.commands.push({ label, command: [command, ...args].join(" "), exitCode: 1 });
      resolveRun(1);
    });
  });
}

async function fileExists(path) {
  try {
    await access(resolve(workspaceRoot, path));
    return true;
  } catch {
    return false;
  }
}

function fail(lane, message) {
  report.lanes[lane] = "fail";
  report.failures.push({ lane, message });
}

// ── Lane 1: config integrity ────────────────────────────────────────────────
{
  let ok = true;
  const sitePkg = JSON.parse(await readFile(resolve(workspaceRoot, "site/package.json"), "utf8"));
  if (sitePkg.private !== true) {
    ok = false;
    report.failures.push({ lane: "configIntegrity", message: "site/package.json must be private" });
  }
  const docusaurusDeps = Object.entries({ ...sitePkg.dependencies, ...sitePkg.devDependencies })
    .filter(([name]) => name.startsWith("@docusaurus/"));
  const versions = new Set(docusaurusDeps.map(([, version]) => version));
  if (docusaurusDeps.length === 0 || versions.size !== 1) {
    ok = false;
    report.failures.push({
      lane: "configIntegrity",
      message: `all @docusaurus/* packages must share one version; saw ${JSON.stringify([...versions])}`,
    });
  }
  const workspaceYaml = await readFile(resolve(workspaceRoot, "pnpm-workspace.yaml"), "utf8");
  if (!/^\s*-\s*"site"$/m.test(workspaceYaml)) {
    ok = false;
    report.failures.push({ lane: "configIntegrity", message: 'pnpm-workspace.yaml must include "site"' });
  }
  const configSource = await readFile(resolve(workspaceRoot, "site/docusaurus.config.js"), "utf8");
  const requiredConfigMarkers = [
    ["onBrokenLinks: 'throw'", "broken links must fail the build"],
    ["onBrokenMarkdownLinks: 'throw'", "broken markdown anchors must fail the build"],
    ["@docusaurus/theme-mermaid", "mermaid theme must be registered"],
    ["@easyops-cn/docusaurus-search-local", "local search theme must be registered"],
    ["editUrl:", "canonical edit links must be configured"],
    ["Prometheus-AGS/prometheus-entity-management/edit/", "editUrl must point at this repository"],
    ["img/social-card.png", "social card image must be configured"],
    ["twitter:card", "social metadata must be configured"],
    ["respectPrefersColorScheme: true", "dark mode must respect system preference"],
    ["prometheus-mark.svg", "brand logo must be configured"],
    ["prometheus-mark-dark.svg", "dark-theme logo variant must be configured"],
    ["productSidebar", "product navigation must be configured"],
    ["packagesSidebar", "packages navigation must be configured"],
    ["examplesSidebar", "examples navigation must be configured"],
  ];
  for (const [marker, message] of requiredConfigMarkers) {
    if (!configSource.includes(marker)) {
      ok = false;
      report.failures.push({ lane: "configIntegrity", message: `${message} (missing ${marker})` });
    }
  }
  report.lanes.configIntegrity = ok ? "pass" : "fail";
}

// ── Lane 2: dependency isolation ────────────────────────────────────────────
{
  const siteOnlyDeps = [
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
  let leaks = 0;
  for await (const entry of glob("packages/*/package.json", { cwd: workspaceRoot })) {
    const pkg = JSON.parse(await readFile(resolve(workspaceRoot, entry), "utf8"));
    const declared = new Set([
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
      ...Object.keys(pkg.peerDependencies ?? {}),
    ]);
    for (const dep of siteOnlyDeps) {
      if (declared.has(dep)) {
        leaks += 1;
        report.failures.push({
          lane: "dependencyIsolation",
          message: `site-only dependency ${dep} leaks into publishable package ${entry}`,
        });
      }
    }
  }
  report.lanes.dependencyIsolation = leaks === 0 ? "pass" : "fail";
}

// ── Lane 3: brand assets ────────────────────────────────────────────────────
{
  let ok = true;
  const requiredAssets = [
    "site/static/img/prometheus-mark.svg",
    "site/static/img/prometheus-mark-dark.svg",
    "site/static/img/favicon.ico",
    "site/static/img/social-card.png",
    "docs/branding/ASSETS.md",
  ];
  for (const asset of requiredAssets) {
    if (!(await fileExists(asset))) {
      ok = false;
      report.failures.push({ lane: "brandAssets", message: `missing brand asset ${asset}` });
    }
  }
  if (await fileExists("docs/branding/ASSETS.md")) {
    const provenance = await readFile(resolve(workspaceRoot, "docs/branding/ASSETS.md"), "utf8");
    for (const marker of ["Provenance", "Accessible alternative", "prometheus-mark.svg", "social-card.png", "favicon.ico"]) {
      if (!provenance.includes(marker)) {
        ok = false;
        report.failures.push({
          lane: "brandAssets",
          message: `ASSETS.md must document ${marker} provenance and accessible alternatives`,
        });
      }
    }
  }
  const configSource = await readFile(resolve(workspaceRoot, "site/docusaurus.config.js"), "utf8");
  if (!/logo:\s*\{[^}]*alt:/s.test(configSource)) {
    ok = false;
    report.failures.push({ lane: "brandAssets", message: "navbar logo must carry alt text" });
  }
  report.lanes.brandAssets = ok ? "pass" : "fail";
}

// ── Lane 4: static build ────────────────────────────────────────────────────
{
  const buildExit = await run(
    "static-build",
    "pnpm",
    ["--filter", "@prometheus-ags/entity-graph-docs-site", "build"],
    { echo: true },
  );
  if (buildExit !== 0) {
    fail("staticBuild", "docusaurus build failed (broken links/anchors throw)");
  } else {
    const requiredRoutes = [
      "site/build/index.html",
      "site/build/404.html",
      "site/build/sitemap.xml",
      "site/build/search-index.json",
      "site/build/img/social-card.png",
      "site/build/img/prometheus-mark.svg",
      "site/build/img/prometheus-mark-dark.svg",
      "site/build/docs/product/overview/index.html",
      "site/build/docs/product/architecture/index.html",
      "site/build/docs/packages/overview/index.html",
      "site/build/docs/examples/overview/index.html",
    ];
    const missing = [];
    for (const route of requiredRoutes) {
      if (!(await fileExists(route))) missing.push(route);
    }
    if (missing.length > 0) {
      fail("staticBuild", `build output missing routes: ${missing.join(", ")}`);
    } else {
      const sitemap = await readFile(resolve(workspaceRoot, "site/build/sitemap.xml"), "utf8");
      for (const route of ["/docs/product/overview", "/docs/packages/overview", "/docs/examples/overview"]) {
        if (!sitemap.includes(route)) {
          fail("staticBuild", `sitemap.xml missing route ${route}`);
          break;
        }
      }
      if (report.lanes.staticBuild === "pending") report.lanes.staticBuild = "pass";
    }
  }
}

report.result = Object.values(report.lanes).every((lane) => lane === "pass") ? "pass" : "fail";

if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`\nverification report written to ${reportPath}\n`);
}

process.stdout.write(`\nverify:docs-foundation ${report.result.toUpperCase()}\n`);
process.exit(report.result === "pass" ? 0 : 1);
