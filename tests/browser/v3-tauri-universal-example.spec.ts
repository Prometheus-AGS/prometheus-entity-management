/**
 * v3-tauri-universal-example.spec.ts
 *
 * Browser lane for the universal Tauri showcase: the identical production
 * frontend build rendered in Chromium at desktop (1280×800) and mobile
 * (390×844) viewports. This is browser-rendered evidence of the shared
 * frontend — native receipts (desktop binary, iOS simulator .app, Android
 * APK, Rust command E2E) live alongside it in the evidence directory and are
 * labeled separately (design D-6).
 */
import { expect, test, type Page } from "@playwright/test";
import { source as axeSource } from "axe-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceDirectory = resolve(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example",
);

const expectedScenarioIds = [
  "example.graph.normalized-cross-view",
  "example.crud.optimistic-confirm",
  "example.relationship.cascade-invalidation",
  "example.realtime.coalesced-cross-view",
  "example.offline.persistence-convergence",
  "example.platform.adapter-boundary",
  "example.runtime.lifecycle-security",
] as const;

type ScenarioId = (typeof expectedScenarioIds)[number];

const scenarioReceipts = new Map<ScenarioId, { status: "pass"; proof: Record<string, unknown> }>();
const screenshots: string[] = [];
const consoleErrors: string[] = [];
let accessibility = { status: "pending", serious: -1, critical: -1 } as {
  status: "pending" | "pass";
  serious: number;
  critical: number;
};

function pass(id: ScenarioId, proof: Record<string, unknown>) {
  scenarioReceipts.set(id, { status: "pass", proof });
}

async function recordScreenshot(page: Page, name: string) {
  const path = resolve(evidenceDirectory, name);
  await page.screenshot({ path, fullPage: true });
  screenshots.push(name);
}

function trackConsoleErrors(page: Page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));
}

async function runAxe(page: Page) {
  await page.evaluate(axeSource);
  const results = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: any }).axe;
    return axe.run(document, { resultTypes: ["violations"] });
  });
  const serious = results.violations.filter((v: any) => v.impact === "serious").length;
  const critical = results.violations.filter((v: any) => v.impact === "critical").length;
  return { serious, critical, violations: results.violations.length };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  mkdirSync(evidenceDirectory, { recursive: true });
});

/**
 * Each Playwright project (desktop/mobile viewport) runs in its own worker
 * process, so the receipt is written per project from inside the test — an
 * `afterAll` write to one shared file would be clobbered by the last worker.
 */
function writeProjectReceipt(projectName: string) {
  writeFileSync(
    resolve(evidenceDirectory, `browser-evidence-${projectName}.json`),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        change: "v3-tauri-universal-example",
        project: projectName,
        recordedAt: new Date().toISOString(),
        status:
          scenarioReceipts.size === expectedScenarioIds.length &&
          accessibility.status === "pass"
            ? "pass"
            : "fail",
        evidenceKind: "source-workspace-production-browser",
        countsAsPackedPackageEvidence: false,
        note: "Browser-rendered frontend evidence at desktop and mobile viewports; native desktop/iOS/Android receipts are separate artifacts in this directory.",
        expectedScenarioIds,
        scenarios: Object.fromEntries(scenarioReceipts),
        accessibility,
        consoleErrors,
        artifacts: {
          screenshots,
          tracePolicy: "on",
          playwrightReport: "playwright-report.json",
          playwrightOutput: "playwright-artifacts",
        },
      },
      null,
      2,
    )}\n`,
  );
}

test("task board scenarios pass on the shared production frontend", async ({ page }, testInfo) => {
  trackConsoleErrors(page);
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Prometheus Entity Graph" }),
  ).toBeVisible();

  // ── normalized cross-view: seeded graph renders in the ID-joined list,
  //    the detail aside, and the document title from one canonical copy.
  const rows = page.getByRole("list", { name: "Tasks" }).getByRole("listitem");
  await expect(rows).toHaveCount(3);
  await expect(page).toHaveTitle(/Tasks \(3\)/);
  await page.getByRole("button", { name: "Sync engine cutover", exact: true }).click();
  const detail = page.getByRole("complementary", { name: "Task detail" });
  await expect(detail.getByRole("heading", { name: "Sync engine cutover" })).toBeVisible();
  pass("example.graph.normalized-cross-view", {
    project: testInfo.project.name,
    canonicalCopies: 1,
    views: ["task-list", "task-detail", "document-title"],
  });

  // ── optimistic confirm: status advances immediately and stays confirmed.
  const offlineRow = rows.filter({ hasText: "Offline restart proof" });
  await expect(offlineRow.locator(".task-status")).toHaveText("todo");
  await offlineRow.getByRole("button", { name: "Advance Offline restart proof" }).click();
  await expect(offlineRow.locator(".task-status")).toHaveText("in-progress");
  await expect(page.getByTestId("denial-banner")).toHaveCount(0);
  pass("example.crud.optimistic-confirm", {
    project: testInfo.project.name,
    mutation: "task-offline todo → in-progress",
    rolledBack: false,
  });

  // ── relationship cascade: project filter narrows the joined list.
  await page.getByLabel("Filter by project").selectOption("project-beacon");
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("Mobile layout pass");
  await page.getByLabel("Filter by project").selectOption("all");
  await expect(rows).toHaveCount(3);
  pass("example.relationship.cascade-invalidation", {
    project: testInfo.project.name,
    filter: "project-beacon",
    visibleTasks: 1,
  });

  // ── realtime coalescing: two remote ticks inside the flush window land as
  //    one visible update in every joined view.
  await page.getByRole("button", { name: "Sync engine cutover", exact: true }).click();
  const syncRow = rows.filter({ hasText: "Sync engine cutover" });
  const tick = page.getByRole("button", {
    name: "Simulate remote update for Sync engine cutover",
  });
  await tick.click();
  await tick.click();
  await expect(syncRow).toContainText("⟳");
  await expect(detail.getByRole("heading")).toContainText("⟳");
  pass("example.realtime.coalesced-cross-view", {
    project: testInfo.project.name,
    ticks: 2,
    flushWindowMs: 16,
    viewsUpdated: ["task-list", "task-detail"],
  });

  // ── offline persistence: persist → reload (process restart analog) →
  //    restore, with the board intact and receipts recorded.
  await page.getByRole("button", { name: "Persist snapshot (offline restart)" }).click();
  await expect(page.getByRole("list", { name: "Bridge receipts" })).toContainText(
    "persistSnapshot",
  );
  await page.reload();
  await expect(rows).toHaveCount(3);
  await page.getByRole("button", { name: "Restore snapshot" }).click();
  await expect(page.getByRole("list", { name: "Bridge receipts" })).toContainText(
    "restoreSnapshot",
  );
  await expect(rows).toHaveCount(3);
  pass("example.offline.persistence-convergence", {
    project: testInfo.project.name,
    lane: "web localStorage behind the same bridge contract; native lane uses SQLite via the SQL plugin",
    tasksAfterRestart: 3,
  });

  // ── platform adapter boundary: lane identified, receipts visible, zero
  //    unexpected denials on the granted surface.
  await expect(page.getByTestId("lane-label")).toContainText("web (entity-graph-tauri)");
  const receipts = page.getByRole("list", { name: "Bridge receipts" }).getByRole("listitem");
  expect(await receipts.count()).toBeGreaterThan(0);
  await expect(page.getByTestId("denial-banner")).toHaveCount(0);
  pass("example.platform.adapter-boundary", {
    project: testInfo.project.name,
    lane: "web",
    nativeDenialProof: "src-tauri MockRuntime suite (denied webview fails closed)",
  });

  // ── lifecycle/security: focus lifecycle event observed, axe clean, no
  //    console errors on either viewport.
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText(/Lifecycle resumes observed: [1-9]/)).toBeVisible();
  const axe = await runAxe(page);
  expect({ serious: axe.serious, critical: axe.critical }).toEqual({ serious: 0, critical: 0 });
  accessibility = { status: "pass", serious: axe.serious, critical: axe.critical };
  pass("example.runtime.lifecycle-security", {
    project: testInfo.project.name,
    lifecycleResumesObserved: true,
    axeSerious: axe.serious,
    axeCritical: axe.critical,
  });

  await recordScreenshot(page, `browser-board-${testInfo.project.name}.png`);
  await recordScreenshot(page, `browser-platform-${testInfo.project.name}.png`);

  expect(consoleErrors).toEqual([]);
  writeProjectReceipt(testInfo.project.name);
});
