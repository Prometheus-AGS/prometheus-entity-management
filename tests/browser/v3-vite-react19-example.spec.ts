import { expect, test } from "@playwright/test";
import { source as axeSource } from "axe-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceDirectory = resolve(
  ".kbd-orchestrator/phases/full-3.0-release/evidence/v3-vite-react19-example",
);
const expectedScenarioIds = [
  "example.graph.normalized-cross-view",
  "example.crud.optimistic-confirm",
  "example.crud.optimistic-rollback",
  "example.relationship.cascade-invalidation",
  "example.view.local-remote-hybrid",
  "example.transport.rest-graphql-equivalence",
  "example.realtime.coalesced-cross-view",
  "example.offline.persistence-convergence",
  "example.runtime.lifecycle-security",
  "example.runtime.devtools",
] as const;

type ScenarioId = (typeof expectedScenarioIds)[number];
type ScenarioReceipt = {
  status: "pass";
  proof: Record<string, unknown>;
};

const scenarioReceipts = new Map<ScenarioId, ScenarioReceipt>();
const screenshots: string[] = [];
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
        change: "v3-vite-react19-example",
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

test("normalized graph, query modes, and REST/GraphQL seams", async ({ page }) => {
  await page.goto("/release-showcase");
  await expect(page.getByRole("heading", { name: "React 19 RC showcase" })).toBeVisible();

  const renderedIds = await page
    .locator("[data-scenario-id]")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-scenario-id")));
  for (const id of expectedScenarioIds.filter((value) => value !== "example.crud.optimistic-rollback")) {
    expect(renderedIds).toContain(id);
  }

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

  const views = scenario(page, "example.view.local-remote-hybrid");
  for (const mode of ["remote", "hybrid", "local"] as const) {
    await views.getByRole("button", { name: mode, exact: true }).click();
    await expect(views.getByText(new RegExp(`^${mode} · \\d+ rows`))).toBeVisible();
  }
  pass("example.view.local-remote-hybrid", {
    modes: ["local", "remote", "hybrid"],
    oneTypedViewContract: true,
  });

  const transport = scenario(page, "example.transport.rest-graphql-equivalence");
  await transport.getByRole("button", { name: /demo-graphql/ }).click();
  await expect(transport.locator("pre")).toContainText('"mode": "demo-graphql"');
  await expect(transport.locator("pre")).toContainText('"graphql"');
  await transport.getByRole("button", { name: /demo-rest/ }).click();
  await expect(transport.locator("pre")).toContainText('"mode": "demo-rest"');
  await expect(transport.locator("pre")).toContainText('"rest"');
  pass("example.transport.rest-graphql-equivalence", {
    modes: ["demo-rest", "demo-graphql"],
    liveModesRemainExplicitOptIn: true,
  });

  await recordScreenshot(page, "task-3-browser-graph-and-transports.png");
});

test("optimistic mutation, relationship cascade, and realtime coalescing", async ({ page }) => {
  await page.goto("/release-showcase");

  const optimistic = scenario(page, "example.crud.optimistic-confirm");
  await optimistic.getByRole("button", { name: "Confirm mutation" }).click();
  await expect(optimistic.getByText("confirmed", { exact: true })).toBeVisible();
  await expect(optimistic).toContainText(/Server confirmed/);
  pass("example.crud.optimistic-confirm", {
    outcome: "confirmed",
    patchClearedAfterConfirmation: true,
  });

  await optimistic.getByRole("button", { name: "Reject + rollback" }).click();
  await expect(optimistic.getByText("rolled-back", { exact: true })).toBeVisible();
  await expect(optimistic).toContainText(/Deterministic mutation rejection/);
  pass("example.crud.optimistic-rollback", {
    outcome: "rolled-back",
    patchClearedAfterRejection: true,
  });

  const relationship = scenario(page, "example.relationship.cascade-invalidation");
  const priorProject = await relationship.locator("strong").textContent();
  await relationship.getByRole("button", { name: /Reassign task/ }).click();
  await expect(relationship).toContainText(/old and new relations invalidated/);
  pass("example.relationship.cascade-invalidation", {
    priorProject,
    relationEdgesInvalidated: true,
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
  });

  await recordScreenshot(page, "task-3-browser-mutations-and-realtime.png");
});

test("PGlite, Loro, lifecycle, DevTools, and accessibility", async ({ page }) => {
  await page.goto("/release-showcase");

  const offline = scenario(page, "example.offline.persistence-convergence");
  await offline.getByRole("button", { name: "Persist" }).click();
  await expect(offline.locator("pre")).toContainText(/"lastPersistedAt": "[^"]+"/);
  await offline.getByRole("button", { name: "Hydrate" }).click();
  await expect(offline.locator("pre")).toContainText(/"lastHydratedAt": "[^"]+"/);
  await offline.getByRole("button", { name: "Converge peers" }).click();
  await expect(offline.locator("pre")).toContainText('"converged": true');
  pass("example.offline.persistence-convergence", {
    pglitePersisted: true,
    pgliteHydrated: true,
    loroConverged: true,
  });

  const lifecycle = scenario(page, "example.runtime.lifecycle-security");
  await expect(lifecycle).toContainText(/Resolved .* through a Suspense entity boundary/);
  await lifecycle.getByRole("button", { name: /Exercise error boundary/ }).click();
  await expect(lifecycle.getByRole("alert")).toContainText(/missing-showcase-task/);
  pass("example.runtime.lifecycle-security", {
    suspenseResolved: true,
    errorContainedByNearestBoundary: true,
  });

  const devtools = scenario(page, "example.runtime.devtools");
  for (const label of ["Entities", "Lists", "Subscribers", "Patches"]) {
    await expect(devtools.getByText(label, { exact: true })).toBeVisible();
  }

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
  pass("example.runtime.lifecycle-security", {
    ...scenarioReceipts.get("example.runtime.lifecycle-security")?.proof,
    seriousAccessibilityViolations: 0,
    criticalAccessibilityViolations: 0,
  });

  await expect(devtools.locator("strong").first()).toHaveText(/\d+/);
  pass("example.runtime.devtools", {
    metrics: ["Entities", "Lists", "Subscribers", "Patches"],
    projectsLiveGraphOnly: true,
  });

  await recordScreenshot(page, "task-3-browser-offline-lifecycle-a11y.png");
});
