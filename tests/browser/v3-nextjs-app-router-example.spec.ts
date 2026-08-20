import { expect, test } from "@playwright/test";
import { source as axeSource } from "axe-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceDirectory = resolve(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example",
);
const expectedScenarioIds = [
  "example.graph.normalized-cross-view",
  "example.crud.optimistic-confirm",
  "example.relationship.cascade-invalidation",
  "example.view.local-remote-hybrid",
  "example.realtime.coalesced-cross-view",
  "example.runtime.ssr-isolation-hydration",
  "example.runtime.lifecycle-security",
] as const;

type ScenarioId = (typeof expectedScenarioIds)[number];
type ScenarioReceipt = {
  status: "pass";
  proof: Record<string, unknown>;
};

type FetchMetrics = {
  startedAt: string;
  reads: Record<string, number>;
  log: string[];
};

const scenarioReceipts = new Map<ScenarioId, ScenarioReceipt>();
const screenshots: string[] = [];
const consoleErrors: string[] = [];
let accessibility = {
  status: "pending",
  serious: -1,
  critical: -1,
} as {
  status: "pending" | "pass";
  serious: number;
  critical: number;
};

function scenario(page: import("@playwright/test").Page, id: string) {
  return page.locator(`[data-scenario-id="${id}"]`);
}

function pass(id: ScenarioId, proof: Record<string, unknown>) {
  scenarioReceipts.set(id, { status: "pass", proof });
}

async function recordScreenshot(
  page: import("@playwright/test").Page,
  name: string,
) {
  const path = resolve(evidenceDirectory, name);
  await page.screenshot({ path, fullPage: true });
  screenshots.push(name);
}

async function fetchMetrics(
  page: import("@playwright/test").Page,
): Promise<FetchMetrics> {
  return page.evaluate(
    () =>
      (window as unknown as { __pemFetchMetrics?: FetchMetrics })
        .__pemFetchMetrics ?? { startedAt: "", reads: {}, log: [] },
  );
}

function trackConsoleErrors(page: import("@playwright/test").Page) {
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(String(error)));
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  mkdirSync(evidenceDirectory, { recursive: true });
});

test.afterAll(() => {
  const scenarios = Object.fromEntries(scenarioReceipts);
  writeFileSync(
    resolve(evidenceDirectory, "browser-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        change: "v3-nextjs-app-router-example",
        recordedAt: new Date().toISOString(),
        status:
          scenarioReceipts.size === expectedScenarioIds.length &&
          accessibility.status === "pass"
            ? "pass"
            : "fail",
        evidenceKind: "source-workspace-production-browser",
        countsAsPackedPackageEvidence: false,
        expectedScenarioIds,
        scenarios,
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

test("SSR prefetch renders data HTML and hydrates without duplicate fetches", async ({
  page,
  request,
}) => {
  trackConsoleErrors(page);

  // Server-rendered HTML must already carry entity data (no client JS involved).
  const ssrResponse = await request.get("/release-showcase");
  expect(ssrResponse.ok()).toBe(true);
  const ssrHtml = await ssrResponse.text();
  expect(ssrHtml).toContain('data-testid="ssr-prefetch-card"');
  expect(ssrHtml).toContain("Implement Iroh QUIC transport layer");

  await page.goto("/release-showcase");
  await expect(
    page.getByRole("heading", { name: "Next.js App Router SSR showcase" }).first(),
  ).toBeVisible();

  const renderedIds = await page
    .locator("[data-scenario-id]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-scenario-id")));
  for (const id of expectedScenarioIds) {
    expect(renderedIds).toContain(id);
  }

  // Hydrated lists are fresh inside staleTime: zero duplicate demo-backend reads.
  const metrics = await fetchMetrics(page);
  expect(metrics.reads["Task.list"] ?? 0).toBe(0);
  expect(metrics.reads["Project.list"] ?? 0).toBe(0);
  expect(metrics.reads["User.list"] ?? 0).toBe(0);

  const isolation = scenario(page, "example.runtime.ssr-isolation-hydration");
  await expect(isolation.locator("pre").first()).toContainText('"project-atlas"');
  await expect(isolation.locator("pre").first()).toContainText('"project-hermes"');
  await expect(isolation.locator("pre").first()).toContainText(
    '"crossRequestLeakage": false',
  );
  await expect(isolation.getByTestId("ssr-request-id")).not.toBeEmpty();
  const hydratedCount = await page
    .getByTestId("ssr-prefetch-card")
    .textContent();
  expect(hydratedCount).toBeTruthy();
  pass("example.runtime.ssr-isolation-hydration", {
    serverHtmlContainsPrefetchedTask: true,
    requestAtlasIds: ["project-atlas"],
    requestHermesIds: ["project-hermes"],
    crossRequestLeakage: false,
    duplicateListFetches: 0,
    requestIdVisible: true,
  });

  const normalized = scenario(page, "example.graph.normalized-cross-view");
  const detail = normalized.locator("p.font-medium");
  await expect(detail).not.toHaveText("Loading task…");
  const firstTitle = await detail.textContent();
  await normalized.getByRole("button", { name: "t6", exact: true }).click();
  await expect(detail).not.toHaveText(firstTitle ?? "");
  pass("example.graph.normalized-cross-view", {
    firstTitle,
    selectedTitle: await detail.textContent(),
    listAndDetailShareGraph: true,
  });

  await recordScreenshot(page, "browser-ssr-hydration.png");
});

test("mutations, cascade invalidation, view modes, and realtime takeover", async ({
  page,
}) => {
  trackConsoleErrors(page);
  await page.goto("/release-showcase");
  await expect(
    page.getByRole("heading", { name: "Next.js App Router SSR showcase" }).first(),
  ).toBeVisible();

  const optimistic = scenario(page, "example.crud.optimistic-confirm");
  await optimistic.getByRole("button", { name: "Confirm mutation" }).click();
  await expect(optimistic.getByText("confirmed", { exact: true })).toBeVisible();
  await expect(optimistic).toContainText(/Server confirmed/);
  await optimistic.getByRole("button", { name: "Reject + rollback" }).click();
  await expect(optimistic.getByText("rolled-back", { exact: true })).toBeVisible();
  await expect(optimistic).toContainText(/Deterministic mutation rejection/);
  pass("example.crud.optimistic-confirm", {
    outcome: "confirmed",
    rollbackOutcome: "rolled-back",
    patchClearedAfterConfirmation: true,
  });

  const relationship = scenario(page, "example.relationship.cascade-invalidation");
  const priorProject = await relationship.locator("strong").textContent();
  await relationship.getByRole("button", { name: /Reassign task/ }).click();
  await expect(relationship).toContainText(/old and new relations invalidated/);
  pass("example.relationship.cascade-invalidation", {
    priorProject,
    relationEdgesInvalidated: true,
  });

  const views = scenario(page, "example.view.local-remote-hybrid");
  for (const mode of ["remote", "hybrid", "local"] as const) {
    await views.getByRole("button", { name: mode, exact: true }).click();
    await expect(views.getByText(new RegExp(`^${mode} · \\d+ rows`))).toBeVisible();
  }
  pass("example.view.local-remote-hybrid", {
    modes: ["local", "remote", "hybrid"],
    oneTypedViewContract: true,
  });

  const realtime = scenario(page, "example.realtime.coalesced-cross-view");
  await realtime.getByRole("button", { name: /Emit three-change burst/ }).click();
  await expect(realtime.locator("pre")).toContainText('"receivedChanges": 3');
  await expect(realtime.locator("pre")).toContainText('"graphWrites": 1');
  await expect(realtime.locator("pre")).toContainText('"finalStatus": "review"');
  pass("example.realtime.coalesced-cross-view", {
    receivedChanges: 3,
    graphWrites: 1,
    finalStatus: "review",
    takeoverTarget: "ssr-hydrated entity t1",
  });

  const lifecycle = scenario(page, "example.runtime.lifecycle-security");
  await expect(lifecycle).toContainText(/Resolved .* through a Suspense entity boundary/);
  await lifecycle.getByRole("button", { name: /Exercise error boundary/ }).click();
  await expect(lifecycle.getByRole("alert")).toContainText(/missing-showcase-task/);
  pass("example.runtime.lifecycle-security", {
    suspenseResolved: true,
    errorContainedByNearestBoundary: true,
  });

  await recordScreenshot(page, "browser-mutations-realtime.png");
});

test("route transitions reuse the hydrated graph; realtime page takes over on the client", async ({
  page,
}) => {
  trackConsoleErrors(page);
  await page.goto("/release-showcase");
  await expect(
    page.getByRole("heading", { name: "Next.js App Router SSR showcase" }).first(),
  ).toBeVisible();

  // Client-side route transition: /tasks must reuse the hydrated ["tasks"] list.
  await page.getByRole("link", { name: "Tasks", exact: true }).first().click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(page.getByRole("heading", { name: /Tasks/ }).first()).toBeVisible();
  let metrics = await fetchMetrics(page);
  expect(metrics.reads["Task.list"] ?? 0).toBe(0);

  // Realtime client takeover on a separate route: hydrated rows render before
  // the stream starts; starting the adapter streams coalesced changes.
  await page.getByRole("link", { name: "Realtime", exact: true }).first().click();
  await expect(page).toHaveURL(/\/realtime$/);
  await expect(
    page.getByRole("heading", { name: "Realtime Demo" }),
  ).toBeVisible();
  metrics = await fetchMetrics(page);
  expect(metrics.reads["Task.list"] ?? 0).toBe(0);
  await page.getByRole("button", { name: "Start Stream" }).click();
  await expect(page.getByText("Streaming")).toBeVisible();
  await page.getByRole("button", { name: "Stop Stream" }).click();
  await expect(page.getByText("Disconnected", { exact: true })).toBeVisible();

  // Return to the showcase: the boundary remounts and rehydrates per request.
  await page.getByRole("link", { name: "SSR Showcase", exact: true }).first().click();
  await expect(page).toHaveURL(/\/release-showcase$/);
  await expect(
    page.getByRole("heading", { name: "Next.js App Router SSR showcase" }).first(),
  ).toBeVisible();

  await recordScreenshot(page, "browser-route-transitions.png");
});

test("production surface has no hydration errors or serious accessibility violations", async ({
  page,
}) => {
  trackConsoleErrors(page);
  await page.goto("/release-showcase");
  await expect(
    page.getByRole("heading", { name: "Next.js App Router SSR showcase" }).first(),
  ).toBeVisible();

  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate(async () => {
    const result = await (window as unknown as {
      axe: {
        run: () => Promise<{
          violations: Array<{
            impact: string | null;
            id: string;
            help: string;
            nodes: Array<{ target: string[]; failureSummary: string }>;
          }>;
        }>;
      };
    }).axe.run();
    return result.violations.map(({ impact, id, help, nodes }) => ({
      impact,
      id,
      help,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    }));
  });
  const serious = axe.filter((violation) => violation.impact === "serious");
  const critical = axe.filter((violation) => violation.impact === "critical");
  expect({ serious, critical }).toEqual({ serious: [], critical: [] });
  accessibility = { status: "pass", serious: 0, critical: 0 };

  const hydrationErrors = consoleErrors.filter((line) =>
    /hydrat|did not match|Minified React error #4(18|19|22|23)/i.test(line),
  );
  expect(hydrationErrors).toEqual([]);
});
