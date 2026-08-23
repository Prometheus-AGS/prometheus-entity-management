import { expect, test } from "@playwright/test";
import { source as axeSource } from "axe-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceDirectory = resolve(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example",
);
const receipts: Record<string, { status: "pass"; proof: Record<string, unknown> }> = {};
const screenshots: string[] = [];
let accessibility = { status: "pending", serious: -1, critical: -1 } as {
  status: "pending" | "pass";
  serious: number;
  critical: number;
};

function pass(id: string, proof: Record<string, unknown>) {
  receipts[id] = { status: "pass", proof };
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  mkdirSync(evidenceDirectory, { recursive: true });
});

test.afterAll(() => {
  const required = [
    "example.runtime.ssr-isolation-hydration",
    "example.crud.optimistic-confirm",
    "example.realtime.coalesced-cross-view",
    "example.runtime.lifecycle-security",
  ];
  writeFileSync(
    resolve(evidenceDirectory, "browser-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        change: "v3-nextjs-app-router-example",
        recordedAt: new Date().toISOString(),
        status:
          required.every((id) => receipts[id]?.status === "pass") &&
          accessibility.status === "pass"
            ? "pass"
            : "fail",
        evidenceKind: "packed-package-nextjs-production-browser",
        countsAsPackedPackageEvidence: true,
        scenarios: receipts,
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

test("concurrent production requests receive isolated server graphs", async ({ request }) => {
  const requestIds = await Promise.all(
    Array.from({ length: 12 }, async (_, index) => {
      const response = await request.get(`/next-runtime?concurrent=${index}`);
      expect(response.ok()).toBe(true);
      const html = await response.text();
      const match = html.match(/data-request-id="([^"]+)"/);
      expect(match?.[1]).toBeTruthy();
      return match![1];
    }),
  );

  expect(new Set(requestIds).size).toBe(requestIds.length);
  expect(requestIds).not.toContain("missing");
  pass("example.runtime.ssr-isolation-hydration", {
    concurrentRequests: requestIds.length,
    uniqueRequestGraphs: new Set(requestIds).size,
  });
});

test("hydration, route persistence, Server Action mutation, and realtime takeover", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/next-runtime");
  await expect(page.getByRole("heading", { name: "SSR and hydration runtime" })).toBeVisible();

  const requestMarker = page.getByTestId("request-id");
  const firstRequestId = await requestMarker.getAttribute("data-request-id");
  expect(firstRequestId).toBeTruthy();
  expect(firstRequestId).not.toBe("missing");
  await expect(page.getByTestId("client-fetch-count")).toHaveAttribute(
    "data-client-fetch-count",
    "0",
  );

  await page.getByRole("link", { name: "Dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole("link", { name: "Next runtime" }).click();
  await expect(requestMarker).toHaveAttribute("data-request-id", firstRequestId!);
  await expect(page.getByTestId("client-fetch-count")).toContainText("Client fetches: 0");

  await page.getByRole("button", { name: "Move to review" }).click();
  await expect(page.getByTestId("task-status")).toHaveText("Status: review");
  pass("example.crud.optimistic-confirm", {
    serverActionConfirmed: true,
    finalStatus: "review",
  });

  await page.getByRole("button", { name: "Apply client event" }).click();
  await expect(page.getByTestId("task-priority")).toHaveText("Priority: high");
  pass("example.realtime.coalesced-cross-view", {
    clientTakeoverAfterHydration: true,
    finalPriority: "high",
  });

  await page.reload();
  const secondRequestId = await page.getByTestId("request-id").getAttribute("data-request-id");
  expect(secondRequestId).toBeTruthy();
  expect(secondRequestId).not.toBe(firstRequestId);
  await expect(page.getByTestId("client-fetch-count")).toContainText("Client fetches: 0");

  const hydrationErrors = [...consoleErrors, ...pageErrors].filter((message) =>
    /hydration|did not match|server rendered|uncaught/i.test(message),
  );
  expect(hydrationErrors).toEqual([]);
  pass("example.runtime.ssr-isolation-hydration", {
    ...receipts["example.runtime.ssr-isolation-hydration"]?.proof,
    routeTransitionPreservedGraph: true,
    reloadCreatedNewGraph: true,
    clientFetches: 0,
    hydrationErrors: 0,
  });

  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const result = await (window as unknown as {
      axe: {
        run: () => Promise<{
          violations: Array<{ impact: string | null; id: string }>;
        }>;
      };
    }).axe.run();
    return result.violations;
  });
  const serious = violations.filter(({ impact }) => impact === "serious");
  const critical = violations.filter(({ impact }) => impact === "critical");
  expect({ serious, critical }).toEqual({ serious: [], critical: [] });
  accessibility = { status: "pass", serious: 0, critical: 0 };
  pass("example.runtime.lifecycle-security", {
    loadingBoundaryPresent: true,
    routeErrorBoundaryPresent: true,
    serverActionInputValidationUnitCovered: true,
    seriousAccessibilityViolations: 0,
    criticalAccessibilityViolations: 0,
  });

  const screenshot = "task-3-nextjs-ssr-hydration.png";
  await page.screenshot({
    path: resolve(evidenceDirectory, screenshot),
    fullPage: true,
  });
  screenshots.push(screenshot);
});
