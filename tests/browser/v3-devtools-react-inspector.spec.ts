import { expect, test } from "@playwright/test";
import { source as axeSource } from "axe-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const evidenceDirectory = resolve(
  process.env.PROMETHEUS_DEVTOOLS_EVIDENCE ??
    ".kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-react-inspector",
);
const urls = {
  viteDev: "http://127.0.0.1:4191",
  viteProduction: "http://127.0.0.1:4192",
  nextDev: "http://127.0.0.1:4193",
  nextProduction: "http://127.0.0.1:4194",
};
const scenarios: Record<string, { status: "pass"; proof: Record<string, unknown> }> = {};
const screenshots: string[] = [];
const gateVersion = "v3-devtools-react-inspector/1";
const performanceThresholds = {
  targetEventsPerSecond: 500,
  timerJitterAllowancePercent: 2,
  minEventsPerSecond: 490,
  maxSearchLatencyP95Ms: 100,
  maxPreloadedPanelOpenP95Ms: 150,
  maxInspectorLongTasksOver50Ms: 0,
  maxRetainedEvents: 500,
} as const;

function pass(id: string, proof: Record<string, unknown>) {
  scenarios[id] = { status: "pass", proof };
}

function percentile(values: readonly number[], percentileValue: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.max(0, Math.ceil(ordered.length * percentileValue) - 1)] ?? Number.POSITIVE_INFINITY;
}

async function launcher(page: import("@playwright/test").Page) {
  const button = page.getByRole("button", { name: /Open Prometheus Graph DevTools/ });
  await expect(button).toBeVisible();
  return button;
}

async function openInspector(page: import("@playwright/test").Page) {
  const button = await launcher(page);
  await button.click();
  await expect(page.getByRole("dialog", { name: "Prometheus Graph DevTools" })).toBeVisible();
  await expect(page.locator(".pem-inspector")).toBeVisible();
}

async function closeInspector(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Close Graph DevTools" }).click();
  await expect(page.getByRole("dialog", { name: "Prometheus Graph DevTools" })).toHaveCount(0);
}

async function screenshot(page: import("@playwright/test").Page, name: string) {
  await page.screenshot({ path: resolve(evidenceDirectory, name), fullPage: true });
  screenshots.push(name);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(() => mkdirSync(evidenceDirectory, { recursive: true }));

test.afterAll(() => {
  const required = [
    "production-exclusion",
    "development-activation-next-hydration",
    "hide-restore-layout-accessibility",
    "dirty-original-view-history-causality",
    "responsive-500-event-interaction",
  ];
  const status = required.every((id) => scenarios[id]?.status === "pass") ? "pass" : "fail";
  writeFileSync(
    resolve(evidenceDirectory, "task-11-browser-evidence.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      gateVersion,
      change: "v3-devtools-react-inspector",
      recordedAt: new Date().toISOString(),
      status,
      evidenceKind: "packed-vite-next-development-production-browser",
      countsAsPackedPackageEvidence: true,
      thresholds: performanceThresholds,
      scenarios,
      artifacts: {
        screenshots,
        tracePolicy: "on",
        playwrightReport: "task-11-playwright-report.json",
        playwrightOutput: "task-11-playwright-artifacts",
      },
    }, null, 2)}\n`,
  );
});

test("production Vite and Next exclude the debug host and inspector", async ({ page, request }) => {
  for (const [name, url] of Object.entries({ vite: urls.viteProduction, next: urls.nextProduction })) {
    const response = await request.get(url);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).not.toContain("data-pem-devtools-host");
    expect(html).not.toContain("data-pem-devtools-auto-root");
    await page.goto(url);
    await expect(page.locator("[data-pem-devtools-host]")).toHaveCount(0);
    await expect(page.locator("[data-pem-devtools-auto-root]")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: new RegExp(`Packed ${name === "vite" ? "Vite" : "Next"} entity graph`) })).toBeVisible();
  }
  pass("production-exclusion", {
    viteServerMarkup: "no-devtools",
    viteHydratedDom: "no-devtools",
    nextServerMarkup: "no-devtools",
    nextHydratedDom: "no-devtools",
  });
});

test("development activation is automatic after opt-in and Next hydration remains clean", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(urls.nextDev);
  await expect(page.getByTestId("hydrated")).toContainText("Hydrated rows: 1");
  await launcher(page);
  const hydrationErrors = [...consoleErrors, ...pageErrors].filter((message) =>
    /hydration|did not match|server rendered/i.test(message),
  );
  expect(hydrationErrors).toEqual([]);

  await page.goto(urls.viteDev);
  await launcher(page);
  pass("development-activation-next-hydration", {
    viteAutoEntryVisible: true,
    nextPostHydrationHostVisible: true,
    nextHydrationErrors: 0,
  });
});

test("hide, restore, layouts, keyboard navigation, and accessibility work through the packed UI", async ({ page }) => {
  await page.goto(urls.viteDev);
  await (await launcher(page)).click();
  await closeInspector(page);

  await page.getByRole("button", { name: "Configure Graph DevTools launcher" }).click();
  await page.getByRole("button", { name: "Hide until reload" }).click();
  await expect(page.getByRole("button", { name: /Open Prometheus Graph DevTools/ })).toHaveCount(0);
  await page.keyboard.press("Control+Shift+G");
  await expect(page.getByRole("dialog", { name: "Prometheus Graph DevTools" })).toBeVisible();
  await closeInspector(page);

  await page.getByRole("button", { name: "Configure Graph DevTools launcher" }).click();
  await page.getByRole("button", { name: "Hide for this browser" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: /Open Prometheus Graph DevTools/ })).toHaveCount(0);
  await page.keyboard.press("Control+Shift+G");
  await expect(page.getByRole("dialog", { name: "Prometheus Graph DevTools" })).toBeVisible();

  await page.getByRole("button", { name: "Configure Graph DevTools panel" }).click();
  for (const layout of ["dock-right", "dock-bottom", "floating"] as const) {
    await page.getByRole("button", { name: layout.replace("-", " "), exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Prometheus Graph DevTools" })).toHaveAttribute("data-layout", layout);
  }
  await page.getByRole("button", { name: "Close display settings" }).click();

  const overview = page.getByRole("tab", { name: /Overview/ });
  await overview.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: /Entities/ })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: /Activity/ })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(overview).toBeFocused();

  await page.addScriptTag({ content: axeSource });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run(): Promise<{ violations: Array<{ impact: string | null; id: string }> }> } }).axe;
    return (await axe.run()).violations;
  });
  const serious = violations.filter(({ impact }) => impact === "serious");
  const critical = violations.filter(({ impact }) => impact === "critical");
  expect({ serious, critical }).toEqual({ serious: [], critical: [] });
  pass("hide-restore-layout-accessibility", {
    temporaryHideRestoredByShortcut: true,
    persistedHideSurvivedReload: true,
    persistedHideRestoredByShortcut: true,
    layouts: ["dock-right", "dock-bottom", "floating"],
    rovingTabs: ["ArrowRight", "End", "Home"],
    seriousAccessibilityViolations: 0,
    criticalAccessibilityViolations: 0,
  });
});

test("dirty entity, original/live values, three rendered views, history, and Graph Pulse share one causal path", async ({ page }) => {
  await page.goto(urls.viteDev);
  await openInspector(page);
  await page.evaluate(() => (window as unknown as { __pemAcceptance: { batch(): void } }).__pemAcceptance.batch());
  await expect(page.getByText("batch-12 · queued").first()).toBeVisible();
  await page.evaluate(() => (window as unknown as { __pemAcceptance: { includeOrder(): void } }).__pemAcceptance.includeOrder());
  await expect(page.getByText("o-1042 · pending").first()).toBeVisible();
  await page.evaluate(() => (window as unknown as { __pemAcceptance: { dirty(): void } }).__pemAcceptance.dirty());
  await expect(page.getByText("o-1042 · approved").first()).toBeVisible();

  const batchPulse = page.locator('.pem-pulse-segments button[title*="12 entities"][title*="3 views"]');
  await expect(batchPulse).toHaveCount(1);
  const patchPulse = page.locator('.pem-pulse-segments button[title*="1 entities"][title*="3 views"]').last();
  await expect(patchPulse).toBeVisible();
  await patchPulse.click();

  await page.getByRole("tab", { name: /Entities/ }).click();
  await page.getByRole("searchbox", { name: "Search entities" }).fill("o-1042");
  await page.locator(".pem-entity-row").filter({ hasText: "o-1042" }).click();
  await expect(page.getByText("◆ Dirty", { exact: true })).toBeVisible();
  await expect(page.getByText("Original last confirmed")).toBeVisible();
  await expect(page.locator(".pem-causal-rail")).toContainText("3 views");

  await page.getByRole("tab", { name: "original", exact: true }).click();
  await expect(page.locator(".pem-value-panel")).toContainText('"status": "pending"');
  await page.getByRole("tab", { name: "patch", exact: true }).click();
  await expect(page.locator(".pem-value-panel")).toContainText('"status": "approved"');
  await page.getByRole("tab", { name: "live", exact: true }).click();
  await expect(page.locator(".pem-value-panel")).toContainText('"status": "approved"');
  await page.getByRole("tab", { name: /diff/i }).click();
  await expect(page.locator(".pem-diff-table")).toContainText("status");
  await expect(page.getByText("Visible in registered views")).toBeVisible();
  await expect(page.locator(".pem-detail-grid")).toContainText("rendered subscriber");
  await expect(page.getByText("Entity history")).toBeVisible();

  await page.getByRole("tab", { name: /Views/ }).click();
  const viewsWorkspace = page.getByLabel("Views", { exact: true });
  await expect(viewsWorkspace.locator(".pem-view-row")).toHaveCount(3);
  await expect(viewsWorkspace.getByText("Only registered views are observable; unregistered renderers remain unknown.")).toBeVisible();
  await expect(viewsWorkspace.getByText("Rendered subscribers")).toBeVisible();
  await expect(viewsWorkspace.locator(".pem-membership-list")).toContainText("o-1042");
  await expect(viewsWorkspace.getByText("Last changing event")).toBeVisible();

  await page.getByRole("tab", { name: /Activity/ }).click();
  await expect(page.locator(".pem-event-row").first()).toBeVisible();
  await expect(page.locator(".pem-activity-detail")).toContainText("Correlation");
  await expect(page.locator(".pem-activity-detail")).toContainText("Affected registered views");
  await screenshot(page, "task-11-causal-inspector.png");
  pass("dirty-original-view-history-causality", {
    atomicBatch: { affectedEntities: 12, affectedViews: 3, graphPulseSegments: 1 },
    dirtyPatch: { affectedEntities: 1, affectedViews: 3 },
    projections: ["original", "patch", "live", "diff"],
    registeredViews: 3,
    entityHistoryVisible: true,
    correlationVisible: true,
  });
});

test("narrow layout and sustained 500-event interaction remain responsive", async ({ page }) => {
  await page.goto(urls.viteDev);
  const hardware = await page.evaluate(() => ({
    cores: navigator.hardwareConcurrency,
    memoryGiB: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
  }));
  expect(hardware.cores).toBeGreaterThanOrEqual(4);
  if (hardware.memoryGiB !== null) expect(hardware.memoryGiB).toBeGreaterThanOrEqual(8);
  const launch = await launcher(page);
  await launch.hover();
  await page.waitForLoadState("networkidle");

  const openDurations: number[] = [];
  for (let index = 0; index < 20; index += 1) {
    openDurations.push(await page.evaluate(async () => {
      const host = document.querySelector("[data-pem-devtools-host]") as HTMLElement | null;
      const root = host?.shadowRoot;
      const button = root?.querySelector(".pem-launcher") as HTMLButtonElement | null;
      if (!root || !button) throw new Error("preloaded DevTools launcher is unavailable");
      const startedAt = performance.now();
      button.click();
      return await new Promise<number>((resolveLatency, reject) => {
        const deadline = startedAt + 1_000;
        const inspect = () => {
          const inspector = root.querySelector(".pem-inspector") as HTMLElement | null;
          if (inspector && inspector.getBoundingClientRect().width > 0) {
            resolveLatency(performance.now() - startedAt);
            return;
          }
          if (performance.now() > deadline) {
            reject(new Error("preloaded inspector did not become visible"));
            return;
          }
          requestAnimationFrame(inspect);
        };
        requestAnimationFrame(inspect);
      });
    }));
    await closeInspector(page);
  }
  const panelOpenP95 = percentile(openDurations, 0.95);
  expect(
    panelOpenP95,
    `preloaded panel durations: ${JSON.stringify(openDurations)}`,
  ).toBeLessThan(performanceThresholds.maxPreloadedPanelOpenP95Ms);

  await openInspector(page);
  await page.evaluate(() => {
    const acceptance = (window as unknown as { __pemAcceptance: { batch(): void; includeOrder(): void; dirty(): void } }).__pemAcceptance;
    acceptance.batch();
    acceptance.includeOrder();
    acceptance.dirty();
  });
  await page.getByRole("tab", { name: /Entities/ }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  const panelBox = await page.getByRole("dialog", { name: "Prometheus Graph DevTools" }).boundingBox();
  expect(panelBox).not.toBeNull();
  expect(panelBox!.width).toBeCloseTo(390, 0);
  expect(panelBox!.height).toBeCloseTo(844, 0);
  await page.getByRole("searchbox", { name: "Search entities" }).fill("o-1042");
  await page.locator(".pem-entity-row").filter({ hasText: "o-1042" }).click();
  await expect(page.getByRole("button", { name: "← Entities" })).toBeVisible();
  await page.getByRole("button", { name: "← Entities" }).click();
  await page.setViewportSize({ width: 1280, height: 720 });

  await page.evaluate(() => {
    const target = window as unknown as {
      __pemAcceptance: { startStress(): Promise<unknown> };
      __pemStress?: Promise<unknown>;
    };
    target.__pemStress = target.__pemAcceptance.startStress();
  });

  const searchLatencies: number[] = [];
  for (let index = 0; index < 20; index += 1) {
    const query = index % 2 === 0 ? "o-1042" : "batch-01";
    searchLatencies.push(await page.evaluate(async (value) => {
      const host = document.querySelector("[data-pem-devtools-host]") as HTMLElement | null;
      const input = host?.shadowRoot?.querySelector('input[type="search"]') as HTMLInputElement | null;
      if (!input) throw new Error("entity search input is unavailable");
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, value);
      const startedAt = performance.now();
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return await new Promise<number>((resolveLatency, reject) => {
        const deadline = startedAt + 500;
        const inspect = () => {
          const rows = [...(host?.shadowRoot?.querySelectorAll(".pem-entity-row") ?? [])];
          if (rows.some((row) => row.textContent?.includes(value))) {
            resolveLatency(performance.now() - startedAt);
            return;
          }
          if (performance.now() > deadline) {
            reject(new Error(`search did not project ${value}`));
            return;
          }
          requestAnimationFrame(inspect);
        };
        requestAnimationFrame(inspect);
      });
    }, query));
  }
  const stress = await page.evaluate(async () => await (window as unknown as {
    __pemStress: Promise<{ emitted: number; durationMs: number; longTasks: number[] }>;
  }).__pemStress);
  const searchP95 = percentile(searchLatencies, 0.95);
  const achievedEventsPerSecond = stress.emitted / (stress.durationMs / 1_000);
  expect(stress.emitted).toBe(5_000);
  expect(stress.durationMs).toBeGreaterThanOrEqual(9_500);
  expect(stress.durationMs).toBeLessThan(13_000);
  expect(achievedEventsPerSecond).toBeGreaterThanOrEqual(performanceThresholds.minEventsPerSecond);
  expect(searchP95).toBeLessThan(performanceThresholds.maxSearchLatencyP95Ms);
  expect(stress.longTasks.filter((duration) => duration > 50)).toHaveLength(
    performanceThresholds.maxInspectorLongTasksOver50Ms,
  );

  await page.getByRole("tab", { name: /Overview/ }).click();
  const retainedText = await page.locator(".pem-metric").filter({ hasText: "Retained events" }).locator("strong").textContent();
  const retainedEvents = Number((retainedText ?? "").replaceAll(",", ""));
  expect(retainedEvents).toBeLessThanOrEqual(performanceThresholds.maxRetainedEvents);
  await screenshot(page, "task-11-responsive-500-events.png");
  pass("responsive-500-event-interaction", {
    viewport: { width: 390, height: 844, safeAreaPanel: true, drillBack: true },
    hardwareBaseline: hardware,
    emittedEvents: stress.emitted,
    durationMs: stress.durationMs,
    achievedEventsPerSecond,
    searchLatencyP95Ms: searchP95,
    preloadedPanelOpenP95Ms: panelOpenP95,
    inspectorLongTasksOver50Ms: 0,
    retainedEvents,
    thresholds: performanceThresholds,
  });
});
