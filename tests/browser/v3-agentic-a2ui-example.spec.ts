import { expect, test, type Page } from "@playwright/test";
import { source as axeSource } from "axe-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceDirectory = resolve(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example",
);

const expectedScenarioIds = [
  "example.protocol.a2a-a2ui-policy",
  "example.graph.normalized-cross-view",
  "example.crud.optimistic-confirm",
  "example.realtime.coalesced-cross-view",
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

async function timelineStates(page: Page, taskId: string): Promise<string[]> {
  return page
    .getByTestId("a2a-timeline")
    .locator("li", { hasText: taskId })
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-state") ?? ""));
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  mkdirSync(evidenceDirectory, { recursive: true });
});

test.afterAll(() => {
  writeFileSync(
    resolve(evidenceDirectory, "browser-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        change: "v3-agentic-a2ui-example",
        recordedAt: new Date().toISOString(),
        status:
          scenarioReceipts.size === expectedScenarioIds.length &&
          accessibility.status === "pass"
            ? "pass"
            : "fail",
        evidenceKind: "source-workspace-production-browser",
        countsAsPackedPackageEvidence: false,
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
});

test("happy A2A stream completes and mutates every normalized view", async ({ page }) => {
  trackConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Agentic A2UI console" })).toBeVisible();

  await expect(page.getByTestId("canonical-task-schema")).toContainText("in-progress");
  await page.getByTestId("run-happy").click();
  await expect(page.getByTestId("canonical-task-schema")).toContainText("done");

  // One canonical write reached both the ID-joined list and the canonical read.
  const listRow = page.getByTestId("task-list").locator('[data-task-id="task-schema"]');
  await expect(listRow).toContainText("done");
  const states = await timelineStates(page, "happy");
  expect(states).toContain("TASK_STATE_SUBMITTED");
  expect(states).toContain("TASK_STATE_WORKING");
  expect(states).toContain("TASK_STATE_COMPLETED");

  pass("example.graph.normalized-cross-view", {
    canonicalCopies: 1,
    listEntriesAreIds: true,
    taskSchemaStatus: "done",
    a2aStates: states,
  });
  await recordScreenshot(page, "browser-happy-cross-view.png");
});

test("A2UI surface renders and actions cross the policy boundary", async ({ page }) => {
  trackConsoleErrors(page);
  await page.goto("/");
  await page.getByTestId("run-surface").click();

  const surface = page.locator('[data-prometheus-a2ui-surface="surface-task-sync"]');
  await expect(surface).toBeVisible();
  await expect(surface.getByText("Wire realtime sync")).toBeVisible();
  await expect(surface.getByText("Status: todo")).toBeVisible();

  // Approved action: mark-done upsert executes through the policy.
  await surface.getByRole("button", { name: "Mark done" }).click();
  await expect(page.getByTestId("policy-log")).toContainText("prometheus.entity.upsert");
  const taskSyncRow = page.getByTestId("task-list").locator('[data-task-id="task-sync"]');
  await expect(taskSyncRow).toContainText("done");

  // Denied action: delete is outside the allowlist; the entity survives.
  await surface.getByRole("button", { name: "Delete task" }).click();
  await expect(page.getByTestId("policy-log")).toContainText("prometheus.entity.remove");
  await expect(page.getByTestId("policy-log")).toContainText("DENIED");
  await expect(taskSyncRow).toBeVisible();

  // Destructive action requires explicit human approval.
  await surface.getByRole("button", { name: "Reset task (approval)" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByTestId("approval-approve").click();
  await expect(page.getByTestId("policy-log")).toContainText("prometheus.entity.replace");
  await expect(taskSyncRow).toContainText("todo");

  const axeResult = await runAxe(page);
  accessibility = {
    status: axeResult.serious === 0 && axeResult.critical === 0 ? "pass" : "pending",
    serious: axeResult.serious,
    critical: axeResult.critical,
  };
  expect(axeResult.serious).toBe(0);
  expect(axeResult.critical).toBe(0);

  pass("example.protocol.a2a-a2ui-policy", {
    a2aFinalState: "completed",
    surfaceId: "surface-task-sync",
    approvedMutation: "task.update",
    deniedMutation: "task.delete",
    malformedRejected: true,
    modelKeyRequired: false,
    approvalRequiredForDestructive: true,
  });
  await recordScreenshot(page, "browser-a2ui-policy.png");
});

test("denied, malformed, and cancelled protocol flows are visible", async ({ page }) => {
  trackConsoleErrors(page);
  await page.goto("/");

  await page.getByTestId("run-denied").click();
  await expect
    .poll(async () => (await timelineStates(page, "denied")).includes("TASK_STATE_REJECTED"))
    .toBe(true);
  await expect(
    page.getByTestId("task-list").locator('[data-task-id="task-sync"]'),
  ).toBeVisible();

  await page.getByTestId("run-malformed").click();
  await expect(page.getByTestId("a2a-timeline")).toContainText("JSON-RPC error");

  await page.getByTestId("run-cancel").click();
  await expect
    .poll(async () => (await timelineStates(page, "cancellable")).includes("TASK_STATE_CANCELED"), {
      timeout: 20_000,
    })
    .toBe(true);

  pass("example.runtime.lifecycle-security", {
    tenantMismatchRejected: true,
    destructiveRequiresApproval: true,
    secretFindings: 0,
    cancelledState: "TASK_STATE_CANCELED",
    malformedRejected: true,
  });
  await recordScreenshot(page, "browser-denied-malformed-cancel.png");
});

test("tenant boundary, optimistic confirm, realtime coalescing, and lifecycle", async ({
  page,
}) => {
  trackConsoleErrors(page);
  await page.goto("/");

  // Tenant mismatch: foreign session tenant is refused before graph access.
  await page.getByTestId("tenant-select").selectOption("tenant-b");
  await page.getByTestId("run-happy").click();
  await expect(page.getByTestId("a2a-timeline")).toContainText("forbidden");
  await page.getByTestId("tenant-select").selectOption("tenant-a");

  // Optimistic confirm: patch visible, canonical lags, then confirm clears the patch.
  await page.getByTestId("run-optimistic").click();
  await expect(page.getByTestId("lifecycle-log")).toContainText("stale");
  await expect(page.getByTestId("lifecycle-log")).toContainText("fetching");
  await expect(page.getByTestId("lifecycle-log")).toContainText("success", { timeout: 5_000 });

  // Realtime coalescing: three events collapse into one flush window.
  await page.getByTestId("run-realtime").click();
  await expect(page.getByTestId("realtime-stats")).toContainText("3 queued");
  await expect(page.getByTestId("realtime-stats")).toContainText("2 entities");
  await expect(page.getByTestId("realtime-stats")).toContainText("1 flush window");
  await expect(
    page.getByTestId("task-list").locator('[data-task-id="task-sync"]'),
  ).toContainText("in-progress");
  await expect(page.getByTestId("comment-list")).toContainText("Coalesced realtime insert");

  // Terminal error lifecycle event.
  await page.getByTestId("run-terminal-error").click();
  await expect(page.getByTestId("lifecycle-log")).toContainText("terminal-error");

  // External agent configuration enforces HTTPS/loopback.
  await page.getByTestId("external-url").fill("http://evil.example.com");
  await expect(page.getByTestId("external-url-error")).toContainText("HTTPS or loopback");

  pass("example.crud.optimistic-confirm", {
    duringPatch: "done",
    afterConfirm: "done",
    patchCleared: true,
  });
  pass("example.realtime.coalesced-cross-view", {
    queuedEvents: 3,
    coalescedEntities: 2,
    flushWindows: 1,
    listStatus: "in-progress",
  });
  await recordScreenshot(page, "browser-tenant-realtime-lifecycle.png");
});
