import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const workflowPath = join(root, ".github/workflows/docs-pages.yml");
const workflow = readFileSync(workflowPath, "utf8");
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const siteConfig = readFileSync(join(root, "site/docusaurus.config.js"), "utf8");

test("the docs-pages workflow exists with PR and main triggers", () => {
  assert.equal(existsSync(workflowPath), true);
  assert.match(workflow, /pull_request:/, "workflow must trigger on pull requests");
  assert.match(workflow, /push:\s*\n\s*branches: \[main\]/, "workflow must trigger on main pushes");
  assert.match(workflow, /workflow_dispatch:/, "workflow must allow manual dispatch");
});

test("pull requests can never deploy; only protected main publishes", () => {
  const deployJob = workflow.split("deploy:")[1] ?? "";
  assert.match(deployJob, /if:.*refs\/heads\/main/, "deploy job must be restricted to main");
  assert.match(deployJob, /github\.event_name != 'pull_request'/, "deploy job must exclude PRs");
  assert.match(deployJob, /environment:\s*\n\s*name: github-pages/, "deploy job must use the github-pages environment");
  // The artifact upload is also main-only, so PRs leave no deployable artifact.
  assert.match(workflow, /Upload the Pages artifact\n\s*if: github\.ref == 'refs\/heads\/main' && github\.event_name != 'pull_request'/,
    "artifact upload must be main-only");
});

test("checkout, configure, upload, and deploy actions are SHA-pinned", () => {
  for (const action of ["actions/checkout", "actions/configure-pages", "actions/upload-pages-artifact", "actions/deploy-pages"]) {
    assert.match(workflow, new RegExp(`uses: ${action.replace("/", "\\/")}@[0-9a-f]{40}\\b`),
      `${action} must be pinned to a 40-char SHA`);
  }
});

test("permissions are least-privilege and deployment is serialized", () => {
  assert.match(workflow, /permissions:\s*\n\s*contents: read/, "top-level permissions must be read-only");
  const deployJob = workflow.split("deploy:")[1] ?? "";
  assert.match(deployJob, /pages: write/, "deploy job must carry pages: write");
  assert.match(deployJob, /id-token: write/, "deploy job must carry id-token: write");
  assert.match(workflow, /concurrency:\s*\n\s*group: pages-deploy\s*\n\s*cancel-in-progress: false/,
    "deployment must be serialized without cancel-in-progress");
});

test("production is gated on build, links, snippets, and quality gates", () => {
  assert.match(workflow, /pnpm install --frozen-lockfile/, "workflow must install with the frozen lockfile");
  assert.match(workflow, /entity-graph-docs-site build/, "workflow must build the docs site (broken links throw)");
  assert.match(workflow, /verify:docs-snippets/, "workflow must verify docs snippets against packed packages");
  assert.match(workflow, /verify:docs-pages-quality/, "workflow must run the production quality gates");
});

test("route probes cover representative deep routes under the Pages base path", () => {
  const quality = readFileSync(join(root, "scripts/verify-docs-pages-quality.mjs"), "utf8");
  assert.ok(quality.includes('"/prometheus-entity-management/"'), "quality script must probe under the base path");
  for (const route of [
    "docs/guides/quickstart-react/",
    "docs/migration/v2-to-v3/",
    "docs/operations/release-runbook/",
    "docs/examples/vite-react19/",
    "docs/api/",
  ]) {
    assert.ok(quality.includes(`"${route}"`), `probe routes missing ${route}`);
  }
  assert.ok(quality.includes("search-index.json"), "quality script must check the search index");
  assert.ok(quality.includes("axe.run"), "quality script must run axe accessibility checks");
  assert.ok(quality.includes("lighthouse"), "quality script must run Lighthouse");
});

test("Lighthouse budgets are declared and enforced", () => {
  const budgetsPath = join(root, "site/lighthouse-budgets.json");
  assert.equal(existsSync(budgetsPath), true, "site/lighthouse-budgets.json missing");
  const budgets = JSON.parse(readFileSync(budgetsPath, "utf8"));
  assert.ok(Array.isArray(budgets) && budgets.length > 0, "budgets must be a non-empty array");
  const sizes = budgets.flatMap((b) => b.resourceSizes ?? []);
  assert.ok(sizes.some((r) => r.resourceType === "total" && r.budget > 0), "budgets must bound total transfer size");
  const counts = budgets.flatMap((b) => b.resourceCounts ?? []);
  assert.ok(counts.some((r) => r.resourceType === "third-party" && r.budget === 0),
    "budgets must forbid third-party origins");
  const quality = readFileSync(join(root, "scripts/verify-docs-pages-quality.mjs"), "utf8");
  assert.ok(quality.includes("lighthouse-budgets.json"), "quality script must read the budgets file");
  assert.ok(quality.includes("resource-summary"), "budgets must be enforced from Lighthouse resource measurements");
});

test("the deployment URL is recorded and the 3.0 release points to it", () => {
  const recordPath = join(root, "release/docs-site.json");
  assert.equal(existsSync(recordPath), true, "release/docs-site.json missing");
  const record = JSON.parse(readFileSync(recordPath, "utf8"));
  assert.equal(record.url, "https://prometheus-ags.github.io/prometheus-entity-management/");
  assert.equal(record.basePath, "/prometheus-entity-management/");
  assert.equal(record.environment, "github-pages");
  assert.equal(record.workflow, ".github/workflows/docs-pages.yml");
  assert.ok(record.url.endsWith(record.basePath), "recorded URL must end with the base path");
  assert.ok(siteConfig.includes("baseUrl: process.env.BASE_URL || '/prometheus-entity-management/'"),
    "site config base path must match the recorded base path");
  const releasing = readFileSync(join(root, "RELEASING.md"), "utf8");
  assert.ok(releasing.includes("release/docs-site.json"),
    "RELEASING.md must point the 3.0 release at the recorded deployment URL");
});

test("release-aware 3.x docs labeling is wired", () => {
  assert.ok(siteConfig.includes("DOCS_VERSION_LABEL"), "site config must read DOCS_VERSION_LABEL");
  assert.match(workflow, /DOCS_VERSION_LABEL: '3\.0'/, "workflow must set the 3.0 docs label");
  const record = JSON.parse(readFileSync(join(root, "release/docs-site.json"), "utf8"));
  assert.equal(record.docsVersionLabel, "3.0");
});

test("root scripts expose the github-pages gates", () => {
  for (const script of [
    "verify:docs-pages",
    "verify:docs-pages-quality",
    "test:v3-docs-github-pages",
    "bdd:docs-pages",
  ]) {
    assert.ok(rootPkg.scripts[script], `missing root script ${script}`);
  }
});
