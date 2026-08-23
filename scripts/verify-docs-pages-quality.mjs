#!/usr/bin/env node
/**
 * verify-docs-pages-quality.mjs — production quality gates for the GitHub
 * Pages documentation deployment (v3-docs-github-pages).
 *
 * Runs against the already-built static site in site/build (base path
 * /prometheus-entity-management/). Shared by the docs-pages workflow and the
 * local certification verifier so CI and local gates are the same code.
 *
 * Lanes:
 *   1. search-index   — the local search index exists, parses, is non-empty
 *   2. route-probes   — representative deep routes return non-empty 200 under
 *                       the /prometheus-entity-management/ base path
 *   3. secrets-scan   — build output contains no tokens/keys/private material
 *   4. abs-path-scan  — build output contains no internal absolute paths
 *   5. a11y           — axe-core over probe routes; no serious/critical
 *                       violations (playwright chromium)
 *   6. lighthouse     — category score floors + resource budgets
 *                       (site/lighthouse-budgets.json) on key routes
 *
 * Usage: node scripts/verify-docs-pages-quality.mjs [--report <path>]
 * Prereq: pnpm --filter @prometheus-ags/entity-graph-docs-site build
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const buildDir = join(workspaceRoot, "site/build");
const BASE_PATH = "/prometheus-entity-management/";

const reportFlag = process.argv.indexOf("--report");
const reportPath = reportFlag >= 0 ? process.argv[reportFlag + 1] : null;
if (reportFlag >= 0 && !reportPath) throw new Error("--report requires a file path");

// Representative deep routes, relative to the base path. Mirrors the contract
// asserted by tests/release/v3-docs-github-pages.test.mjs.
const PROBE_ROUTES = [
  "",
  "docs/product/overview/",
  "docs/guides/quickstart-react/",
  "docs/packages/overview/",
  "docs/examples/vite-react19/",
  "docs/integrations/supabase/",
  "docs/migration/v2-to-v3/",
  "docs/operations/release-runbook/",
  "docs/api/",
];

// Lighthouse runs are heavier; a representative subset keeps the gate bounded.
const LIGHTHOUSE_ROUTES = ["", "docs/guides/quickstart-react/", "docs/migration/v2-to-v3/"];

const LIGHTHOUSE_FLOORS = {
  // Performance floors are calibrated for a local static serve (runner
  // variance is high); the hard performance bound is the resource budgets
  // below, enforced from Lighthouse's resource-summary measurements.
  performance: 0.7,
  accessibility: 0.95,
  "best-practices": 0.95,
  seo: 0.95,
};

const SECRET_PATTERNS = [
  /npm_[A-Za-z0-9]{36}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /gho_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /xox[baprs]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /sk-[A-Za-z0-9]{20,}/,
];

const ABS_PATH_PATTERNS = [
  /\/Users\/[A-Za-z0-9._-]+\//,
  /\/home\/[A-Za-z0-9._-]+\//,
  /file:\/\/\//,
  /[A-Z]:\\Users\\/,
];

// Generated third-party API documentation (dartdoc/rustdoc source viewers)
// legitimately contains file:/// references inside documented source text.
// They are content, not leaks, so the abs-path lane skips those subtrees.
const ABS_PATH_SCAN_EXCLUDES = /^api\/(dart\/static-assets|rust)\//;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

const report = {
  schemaVersion: 1,
  change: "v3-docs-github-pages",
  generatedAt: new Date().toISOString(),
  basePath: BASE_PATH,
  probeRoutes: PROBE_ROUTES.map((r) => `${BASE_PATH}${r}`),
  lanes: {
    searchIndex: "pending",
    routeProbes: "pending",
    secretsScan: "pending",
    absPathScan: "pending",
    a11y: "pending",
    lighthouse: "pending",
  },
  lighthouse: {},
  failures: [],
};

function fail(lane, message) {
  report.lanes[lane] = "fail";
  report.failures.push({ lane, message });
}

// ── Static server over site/build, base-path aware ──────────────────────────
async function serve() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.startsWith(BASE_PATH)) pathname = pathname.slice(BASE_PATH.length);
      else if (pathname === "/") pathname = "";
      else {
        res.writeHead(404).end("outside base path");
        return;
      }
      let file = join(buildDir, pathname);
      if (pathname === "" || pathname.endsWith("/")) file = join(file, "index.html");
      const data = await readFile(file);
      res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
      res.end(data);
    } catch {
      res.writeHead(404).end("not found");
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function* walkFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walkFiles(full);
    else if (/\.(html|js|mjs|css|json|xml|txt|svg)$/.test(entry.name)) yield full;
  }
}

// ── Lane 1: search index ────────────────────────────────────────────────────
{
  try {
    const raw = await readFile(join(buildDir, "search-index.json"), "utf8");
    const index = JSON.parse(raw);
    const entries = Array.isArray(index) ? index : Object.values(index).flat();
    if (!entries.length) throw new Error("search index is empty");
    report.lanes.searchIndex = "pass";
    report.searchIndexEntries = entries.length;
  } catch (error) {
    fail("searchIndex", `search-index.json missing/invalid: ${error.message}`);
  }
}

// ── Lane 2: route probes ────────────────────────────────────────────────────
const { server, origin } = await serve();
try {
  const bad = [];
  for (const route of PROBE_ROUTES) {
    const url = `${origin}${BASE_PATH}${route}`;
    const res = await fetch(url);
    const body = await res.text();
    if (res.status !== 200 || body.length < 512) {
      bad.push(`${route || "(home)"} → ${res.status}, ${body.length} bytes`);
    }
  }
  if (bad.length) fail("routeProbes", `non-empty 200 probe failures: ${bad.join("; ")}`);
  else report.lanes.routeProbes = "pass";
} catch (error) {
  fail("routeProbes", error.message);
}

// ── Lanes 3+4: secrets and internal absolute paths in build output ──────────
{
  const secretHits = [];
  const pathHits = [];
  for await (const file of walkFiles(buildDir)) {
    const text = await readFile(file, "utf8");
    const rel = file.slice(buildDir.length + 1);
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(text)) secretHits.push(`${rel}: ${pattern}`);
    }
    for (const pattern of ABS_PATH_PATTERNS) {
      if (!ABS_PATH_SCAN_EXCLUDES.test(rel) && pattern.test(text)) {
        pathHits.push(`${rel}: ${pattern}`);
      }
    }
  }
  if (secretHits.length) fail("secretsScan", `secret-like material in build: ${secretHits.join("; ")}`);
  else report.lanes.secretsScan = "pass";
  if (pathHits.length) fail("absPathScan", `internal absolute paths in build: ${pathHits.join("; ")}`);
  else report.lanes.absPathScan = "pass";
}

// ── Lane 5: accessibility (axe-core, real browser) ──────────────────────────
{
  try {
    const { chromium } = await import("@playwright/test");
    const axePath = fileURLToPath(import.meta.resolve("axe-core"));
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      const violations = [];
      // Docusaurus renders both brand themes; probe each route in light and dark.
      for (const theme of ["light", "dark"]) {
        await page.addInitScript((t) => {
          window.localStorage.setItem("theme", t);
        }, theme);
        for (const route of PROBE_ROUTES) {
          await page.goto(`${origin}${BASE_PATH}${route}`, { waitUntil: "networkidle" });
          await page.addScriptTag({ path: axePath });
          const result = await page.evaluate(async () => {
            // eslint-disable-next-line no-undef
            return await axe.run({ resultTypes: ["violations"] });
          });
          for (const v of result.violations) {
            if (v.impact === "critical" || v.impact === "serious") {
              violations.push(`${route || "(home)"} [${theme}]: ${v.id} (${v.impact}, ${v.nodes.length} nodes)`);
            }
          }
        }
      }
      if (violations.length) fail("a11y", `axe serious/critical violations: ${violations.join("; ")}`);
      else report.lanes.a11y = "pass";
    } finally {
      await browser.close();
    }
  } catch (error) {
    fail("a11y", `axe lane error: ${error.message}`);
  }
}

// ── Lane 6: Lighthouse budgets + category floors ────────────────────────────
{
  let chrome;
  try {
    const { chromium } = await import("@playwright/test");
    const { default: lighthouse } = await import("lighthouse");
    const budgets = JSON.parse(
      await readFile(join(workspaceRoot, "site/lighthouse-budgets.json"), "utf8"),
    );
    const port = 9333;
    chrome = spawn(
      chromium.executablePath(),
      ["--headless=new", `--remote-debugging-port=${port}`, "--no-sandbox", "--disable-gpu", "about:blank"],
      { stdio: "ignore" },
    );
    // Wait for the debugging endpoint.
    let up = false;
    for (let i = 0; i < 50 && !up; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/json/version`);
        up = res.ok;
      } catch {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    if (!up) throw new Error("chromium remote debugging endpoint did not come up");

    const problems = [];
    for (const route of LIGHTHOUSE_ROUTES) {
      const url = `${origin}${BASE_PATH}${route}`;
      // Lighthouse 13 removed the built-in performance-budget audit, so the
      // declared budgets are enforced here from the resource-summary and
      // third-party-summary measurements of the real Lighthouse run.
      const run = await lighthouse(url, { port, output: "json", logLevel: "error" });
      const { lhr } = run;
      const scores = Object.fromEntries(
        Object.entries(lhr.categories).map(([k, c]) => [k, c.score]),
      );
      const usage = Object.fromEntries(
        (lhr.audits["resource-summary"]?.details?.items ?? []).map((item) => [
          item.resourceType,
          item.transferSize ?? 0,
        ]),
      );
      const thirdPartyCount = lhr.audits["third-party-summary"]?.details?.items?.length ?? 0;
      const budgetChecks = [];
      for (const group of budgets) {
        for (const { resourceType, budget } of group.resourceSizes ?? []) {
          const actual = Math.ceil((usage[resourceType] ?? 0) / 1024);
          budgetChecks.push({ resourceType, actualKiB: actual, budgetKiB: budget });
          if (actual > budget) {
            problems.push(`${route || "(home)"}: ${resourceType} ${actual} KiB > ${budget} KiB budget`);
          }
        }
        for (const { resourceType, budget } of group.resourceCounts ?? []) {
          if (resourceType === "third-party" && thirdPartyCount > budget) {
            problems.push(`${route || "(home)"}: ${thirdPartyCount} third-party origins > ${budget} budget`);
          }
        }
      }
      report.lighthouse[route || "(home)"] = { scores, budgetChecks, thirdPartyCount };
      for (const [category, floor] of Object.entries(LIGHTHOUSE_FLOORS)) {
        if ((scores[category] ?? 0) < floor) {
          problems.push(`${route || "(home)"}: ${category} ${scores[category]} < ${floor}`);
        }
      }
    }
    if (problems.length) fail("lighthouse", problems.join("; "));
    else report.lanes.lighthouse = "pass";
  } catch (error) {
    fail("lighthouse", `lighthouse lane error: ${error.message}`);
  } finally {
    if (chrome) chrome.kill("SIGKILL");
  }
}

await new Promise((ok) => server.close(ok));

report.result = Object.values(report.lanes).every((lane) => lane === "pass") ? "pass" : "fail";

if (reportPath) {
  await mkdir(dirname(resolve(reportPath)), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`quality report written to ${reportPath}\n`);
}

for (const [lane, status] of Object.entries(report.lanes)) {
  process.stdout.write(`  ${lane}: ${status}\n`);
}
process.stdout.write(`verify:docs-pages-quality ${report.result.toUpperCase()}\n`);
process.exit(report.result === "pass" ? 0 : 1);
