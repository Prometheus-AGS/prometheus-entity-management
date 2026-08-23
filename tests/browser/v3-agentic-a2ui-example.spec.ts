import { expect, test } from "@playwright/test";
import { source as axeSource } from "axe-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceDirectory = resolve(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-agentic-a2ui-example",
);

type FlowId = "happy-policy-approval" | "malformed-artifact" | "cancelled-task";

const receipts = new Map<FlowId, Record<string, unknown>>();
const screenshots: string[] = [];
const accessibilityByFlow = new Map<
  FlowId,
  { serious: number; critical: number }
>();

async function screenshot(page: import("@playwright/test").Page, name: string) {
  await page.screenshot({ path: resolve(evidenceDirectory, name), fullPage: true });
  screenshots.push(name);
}

async function lifecycle(page: import("@playwright/test").Page, value: string) {
  await expect(page.getByTestId("agent-lifecycle")).toHaveText(value);
}

async function auditAccessibility(
  page: import("@playwright/test").Page,
  flow: FlowId,
) {
  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const result = await (window as unknown as {
      axe: {
        run: () => Promise<{
          violations: Array<{ impact: string | null; id: string }>;
        }>;
      };
    }).axe.run();
    return result.violations.filter(
      ({ impact }) => impact === "serious" || impact === "critical",
    );
  });
  expect(violations).toEqual([]);
  accessibilityByFlow.set(flow, {
    serious: violations.filter(({ impact }) => impact === "serious").length,
    critical: violations.filter(({ impact }) => impact === "critical").length,
  });
}

function accessibilityReceipt() {
  const counts = [...accessibilityByFlow.values()].reduce(
    (total, current) => ({
      serious: total.serious + current.serious,
      critical: total.critical + current.critical,
    }),
    { serious: 0, critical: 0 },
  );
  return {
    status: accessibilityByFlow.size === 3 ? "pass" : "pending",
    ...counts,
    flows: Object.fromEntries(accessibilityByFlow),
  };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => mkdirSync(evidenceDirectory, { recursive: true }));

test.afterAll(() => {
  const accessibility = accessibilityReceipt();
  writeFileSync(
    resolve(evidenceDirectory, "browser-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        change: "v3-agentic-a2ui-example",
        status:
          receipts.size === 3 && accessibility.status === "pass" ? "pass" : "fail",
        evidenceKind: "source-workspace-production-browser",
        countsAsPackedPackageEvidence: false,
        flows: Object.fromEntries(receipts),
        accessibility,
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

test("renders the streamed surface and enforces every action boundary", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Agentic UI with an application-owned safety boundary.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("agent-mode")).toHaveText("deterministic");
  await expect(page.getByTestId("detail-status")).toHaveText("todo");

  await page.getByRole("button", { name: "Stream task surface" }).click();
  await lifecycle(page, "completed");
  await expect(page.getByTestId("artifact-count")).toHaveText("1");
  await expect(page.getByRole("button", { name: "Mark task done" })).toBeVisible();

  await page.getByRole("button", { name: "Mark task done" }).click();
  await expect(page.getByTestId("detail-status")).toHaveText("done");
  await expect(page.getByTestId("list-task-sync")).toContainText("done");
  await expect(page.getByTestId("decision-task.update")).toContainText("executed");

  await page.getByRole("button", { name: "Attempt denied delete" }).click();
  await expect(page.getByTestId("decision-task.delete")).toContainText("unauthorized");
  await expect(page.getByTestId("detail-status")).toHaveText("done");

  await page.getByRole("button", { name: "Send invalid update" }).click();
  await expect(page.getByTestId("decision-task.update").first()).toContainText(
    "invalid-context",
  );

  await page.getByRole("button", { name: "Attempt undeclared action" }).click();
  await expect(page.getByTestId("decision-system.run")).toContainText("unknown-action");

  await page.getByRole("button", { name: "Archive with approval" }).click();
  await expect(page.getByRole("dialog", { name: "Review agent action" })).toBeVisible();
  await page.getByRole("button", { name: "Deny" }).click();
  await expect(page.getByTestId("decision-task.archive")).toContainText(
    "approval-denied",
  );
  await expect(page.getByTestId("detail-status")).toHaveText("done");

  await page.getByRole("button", { name: "Archive with approval" }).click();
  await page.getByRole("button", { name: "Approve archive" }).click();
  await expect(page.getByTestId("detail-status")).toHaveText("archived");
  await expect(page.getByTestId("list-task-sync")).toContainText("archived");

  await auditAccessibility(page, "happy-policy-approval");

  receipts.set("happy-policy-approval", {
    lifecycle: "completed",
    surfaceRendered: true,
    normalizedCrossViewStatus: "archived",
    allowedAction: "executed",
    authorizationDenial: "unauthorized",
    invalidContext: "invalid-context",
    undeclaredAction: "unknown-action",
    humanApproval: ["denied", "approved"],
  });
  await screenshot(page, "browser-happy-policy-approval.png");
});

test("rejects a malformed agent component before render", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Test malformed surface" }).click();
  await lifecycle(page, "validation-failed");
  await expect(page.getByTestId("agent-error")).toContainText(
    /not allowlisted|UntrustedShellCommand/i,
  );
  await expect(page.getByTestId("artifact-count")).toHaveText("0");
  await expect(
    page.locator('[data-prometheus-a2ui-surface="surface-malformed"]'),
  ).toHaveCount(0);
  await expect(page.getByTestId("detail-status")).toHaveText("todo");
  await auditAccessibility(page, "malformed-artifact");

  receipts.set("malformed-artifact", {
    lifecycle: "validation-failed",
    surfaceRendered: false,
    graphMutated: false,
  });
  await screenshot(page, "browser-malformed-artifact.png");
});

test("cancels a working task before artifact delivery", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start cancellable task" }).click();
  await lifecycle(page, "working");
  await page.getByRole("button", { name: "Cancel active task" }).click();
  await lifecycle(page, "cancelled");
  await expect(page.getByTestId("artifact-count")).toHaveText("0");
  await expect(page.getByTestId("a2ui-surface-stage")).toContainText(
    "Stream the task surface",
  );
  await auditAccessibility(page, "cancelled-task");

  receipts.set("cancelled-task", {
    lifecycle: "cancelled",
    artifactDelivered: false,
    graphMutated: false,
  });
  await screenshot(page, "browser-cancelled-task.png");
});
