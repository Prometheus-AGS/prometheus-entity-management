import { expect, test } from "@playwright/test";
import { source as axeSource } from "axe-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceDirectory = resolve(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example",
);
const flows = new Map<string, Record<string, unknown>>();
const screenshots: string[] = [];

async function capture(page: import("@playwright/test").Page, name: string) {
  await page.screenshot({ path: resolve(evidenceDirectory, name), fullPage: true });
  screenshots.push(name);
}

test.describe.configure({ mode: "serial" });
test.beforeAll(() => mkdirSync(evidenceDirectory, { recursive: true }));
test.afterAll(() => {
  writeFileSync(
    resolve(evidenceDirectory, "task-3-browser-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        change: "v3-tauri-universal-example",
        status: flows.size === 3 ? "pass" : "fail",
        evidenceKind: "source-workspace-browser-preview",
        countsAsNativeDesktopEvidence: false,
        countsAsMobileDeviceEvidence: false,
        flows: Object.fromEntries(flows),
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
});

test("projects one normalized task graph through list and detail views", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Ship from one reactive graph." })).toBeVisible();
  await expect(page.getByText("browser-preview · online")).toBeVisible();

  const card = page.getByTestId("task-card-task-native-persistence");
  await expect(card).toContainText("Active");
  await page.getByTestId("status-review").click();
  await expect(card).toContainText("Review");
  await expect(page.getByTestId("pending-count")).toHaveText("0");

  flows.set("normalized-cross-view", {
    entity: "task-native-persistence",
    listStatus: "review",
    detailStatus: "review",
    pendingMutations: 0,
  });
  await capture(page, "task-3-browser-desktop-graph.png");
});

test("restores an offline mutation after reload and converges after reconnect", async ({ context, page }) => {
  await context.setOffline(true);
  await page.goto("/");
  await expect(page.getByText("browser-preview · offline")).toBeVisible();

  await page.getByTestId("status-done").click();
  await expect(page.getByTestId("pending-count")).toHaveText("1");
  await expect(page.getByTestId("task-card-task-native-persistence")).toContainText("Queued");

  await page.reload();
  await expect(page.getByTestId("pending-count")).toHaveText("1");
  await expect(page.getByTestId("task-card-task-native-persistence")).toContainText("Done");
  await expect(page.getByTestId("task-card-task-native-persistence")).toContainText("Queued");

  await context.setOffline(false);
  await page.getByTestId("connection-toggle").click();
  await expect(page.getByTestId("pending-count")).toHaveText("0");
  await expect(page.getByTestId("task-card-task-native-persistence")).not.toContainText("Queued");

  await page.reload();
  await expect(page.getByTestId("task-card-task-native-persistence")).toContainText("Done");
  await expect(page.getByTestId("pending-count")).toHaveText("0");

  flows.set("offline-restart-convergence", {
    restoredQueuedMutation: true,
    convergedStatus: "done",
    pendingMutations: 0,
  });
  await capture(page, "task-3-browser-offline-restart.png");
});

test("keeps the mobile projection operable and free of serious accessibility findings", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
  await expect(page.getByTestId("task-card-task-native-persistence")).toBeVisible();
  await expect(page.getByTestId("connection-toggle")).toBeVisible();

  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const result = await (window as unknown as {
      axe: {
        run: () => Promise<{ violations: Array<{ impact: string | null; id: string }> }>;
      };
    }).axe.run();
    return result.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    );
  });
  expect(violations).toEqual([]);

  flows.set("responsive-accessibility", {
    viewport: { width: 390, height: 844 },
    mobileNavigation: true,
    serious: 0,
    critical: 0,
  });
  await capture(page, "task-3-browser-mobile-responsive.png");
});
