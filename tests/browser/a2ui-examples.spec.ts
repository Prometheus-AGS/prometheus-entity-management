/**
 * UPG-14: every A2UI 1.0 example, built and served, renders its main surface
 * and completes one action in Chromium, while every A2UI envelope its running
 * producer emits is captured.
 *
 * This spec only drives and captures. It writes
 * `<artifacts>/<example>.captures.json` per example; the version assertion is
 * applied by `scripts/verify-a2ui-examples.mjs` with the shared
 * `tests/a2ui-examples/envelope-assertion.mjs`, the same code it applies to the
 * pre-migration fixtures (negative control).
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { A2UI_MESSAGE_KEYS } from "../a2ui-examples/envelope-assertion.mjs";
import { A2UI_EXAMPLES } from "../a2ui-examples/examples.mjs";
import { installA2uiTap, readA2uiTap } from "../a2ui-examples/page-tap.mjs";
import {
  activitySnapshot,
  createSurfaceOperation,
  updateComponentsOperation,
  updateDataModelOperation,
} from "../../examples/agui-activity-lab/server/events";
import { startProducer } from "../../examples/agui-activity-lab/server/producer";

interface CaptureRecord {
  source: string;
  payload: unknown;
}

interface ExampleCapture {
  exampleId: string;
  url: string;
  surface: Record<string, unknown> | null;
  action: Record<string, unknown> | null;
  records: CaptureRecord[];
  tap: { installed: boolean; sseFrames: number; errors: string[] } | null;
  screenshots: string[];
  error: string | null;
}

interface ExampleEntry {
  id: string;
  port: number;
}

const artifactsDirectory = resolve(
  process.env.A2UI_EXAMPLES_ARTIFACTS ?? resolve(tmpdir(), "a2ui-examples-artifacts"),
);
const only = (process.env.A2UI_EXAMPLES_ONLY ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0);

function example(id: string): ExampleEntry {
  const entry = (A2UI_EXAMPLES as readonly ExampleEntry[]).find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Unknown example ${id}.`);
  return entry;
}

function baseUrl(id: string): string {
  return `http://127.0.0.1:${example(id).port}`;
}

function isSelected(id: string): boolean {
  return only.length === 0 || only.includes(id);
}

async function screenshot(page: Page, capture: ExampleCapture, name: string): Promise<void> {
  const fileName = `${capture.exampleId}-${name}.png`;
  await page.screenshot({ path: resolve(artifactsDirectory, fileName), fullPage: true });
  capture.screenshots.push(fileName);
}

function writeCapture(capture: ExampleCapture): void {
  mkdirSync(artifactsDirectory, { recursive: true });
  writeFileSync(
    resolve(artifactsDirectory, `${capture.exampleId}.captures.json`),
    `${JSON.stringify(capture, null, 2)}\n`,
  );
}

/** Drive one example; the capture file is written whether the flow passes or not. */
async function withCapture(
  page: Page,
  id: string,
  flow: (capture: ExampleCapture) => Promise<void>,
): Promise<void> {
  const capture: ExampleCapture = {
    exampleId: id,
    url: baseUrl(id),
    surface: null,
    action: null,
    records: [],
    tap: null,
    screenshots: [],
    error: null,
  };
  await page.addInitScript(installA2uiTap, [...A2UI_MESSAGE_KEYS]);
  try {
    await flow(capture);
  } catch (error) {
    capture.error = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    if (!page.isClosed()) {
      try {
        const tap = await readA2uiTap(page);
        capture.tap = { installed: tap.installed, sseFrames: tap.sseFrames, errors: tap.errors };
        for (const record of tap.records as Array<{ source: string; text: string }>) {
          capture.records.push({ source: record.source, payload: JSON.parse(record.text) });
        }
      } catch (error) {
        capture.error ??= `tap read failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
    writeCapture(capture);
  }
}

test.describe.configure({ mode: "serial" });
test.beforeAll(() => mkdirSync(artifactsDirectory, { recursive: true }));

test("agentic-a2ui-app: streams the task surface and executes Mark task done", async ({ page }) => {
  test.skip(!isSelected("agentic-a2ui-app"), "example build did not succeed");
  await withCapture(page, "agentic-a2ui-app", async (capture) => {
    await page.goto(`${capture.url}/`);
    await expect(
      page.getByRole("heading", { name: "Agentic UI with an application-owned safety boundary." }),
    ).toBeVisible();
    await expect(page.getByTestId("agent-mode")).toHaveText("deterministic");

    await page.getByRole("button", { name: "Stream task surface" }).click();
    await expect(page.getByTestId("agent-lifecycle")).toHaveText("completed");
    await expect(page.getByTestId("artifact-count")).toHaveText("1");
    const surface = page.getByTestId("a2ui-surface-stage");
    const markDone = surface.getByRole("button", { name: "Mark task done" });
    await expect(markDone).toBeVisible();
    capture.surface = { rendered: true, lifecycle: "completed", artifacts: 1, button: "Mark task done" };
    await screenshot(page, capture, "surface");

    await markDone.click();
    await expect(page.getByTestId("detail-status")).toHaveText("done");
    await expect(page.getByTestId("decision-task.update")).toContainText("executed");
    capture.action = { name: "task.update", decision: "executed", detailStatus: "done" };
    await screenshot(page, capture, "action");
  });
});

test("agentic-a2ui: renders the task board surface and executes Mark done", async ({ page }) => {
  test.skip(!isSelected("agentic-a2ui"), "example build did not succeed");
  await withCapture(page, "agentic-a2ui", async (capture) => {
    await page.goto(`${capture.url}/`);
    await expect(page.getByRole("heading", { name: "Agentic A2UI console" })).toBeVisible();
    await expect(page.getByTestId("surface-fallback")).toBeVisible();

    await page.getByTestId("run-surface").click();
    const panel = page.getByTestId("a2ui-panel");
    const markDone = panel.getByRole("button", { name: "Mark done" });
    await expect(markDone).toBeVisible();
    const detail = page.getByTestId("task-detail").locator("p").first();
    const detailBefore = await detail.innerText();
    capture.surface = { rendered: true, surfaceId: "surface-task-sync", detailBefore };
    await screenshot(page, capture, "surface");

    await markDone.click();
    await expect(detail).toContainText("— done");
    await expect(page.getByTestId("policy-log")).toContainText(
      /prometheus\.entity\.upsert — allowed/,
    );
    capture.action = {
      name: "prometheus.entity.upsert",
      decision: "allowed",
      detailAfter: await detail.innerText(),
    };
    await screenshot(page, capture, "action");
  });
});

interface SseTap {
  frames: unknown[];
  stop(): Promise<unknown[]>;
}

/** A second subscriber on the producer's SSE stream: the activity stream as the producer sent it. */
async function openSseTap(url: string): Promise<SseTap> {
  const controller = new AbortController();
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { accept: "text/event-stream" },
  });
  if (!response.ok || !response.body) {
    throw new Error(`SSE tap could not subscribe: HTTP ${response.status}.`);
  }
  const frames: unknown[] = [];
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let failure: unknown = null;
  const reading = (async () => {
    let buffer = "";
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");
        while (boundary >= 0) {
          const frame = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          const data = frame
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice(5).trimStart())
            .join("\n");
          if (data) frames.push(JSON.parse(data));
          boundary = buffer.indexOf("\n\n");
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) failure = error;
    }
  })();
  return {
    frames,
    async stop() {
      controller.abort();
      await reading;
      if (failure) throw failure instanceof Error ? failure : new Error(String(failure));
      return frames;
    },
  };
}

/** The lab surface: a producer-owned note and one action the lab policy executes. */
function labComponents(): Record<string, unknown>[] {
  return [
    { id: "root", component: "Column", children: ["note", "ping"] },
    { id: "note", component: "Text", text: { "@path": "/note" } },
    {
      id: "ping",
      component: "Button",
      child: "ping_label",
      action: { event: { name: "lab.ping", context: {} } },
    },
    { id: "ping_label", component: "Text", text: "Ping" },
  ];
}

test("agui-activity-lab: renders the producer's activity surface and posts the Ping action", async ({
  page,
}) => {
  test.skip(!isSelected("agui-activity-lab"), "example build did not succeed");
  const producer = await startProducer({ port: 0 });
  const stream = "upg14";
  const sseTap = await openSseTap(`${producer.url}/events?stream=${stream}`);
  let tapStopped = false;
  try {
    await withCapture(page, "agui-activity-lab", async (capture) => {
      const postJson = async (path: string, body: unknown): Promise<unknown> => {
        const response = await fetch(`${producer.url}${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`${path} failed with HTTP ${response.status}.`);
        return response.json();
      };
      const envelopes = async (): Promise<Array<{ actionId?: string; duplicate: boolean; body: any }>> => {
        const response = await fetch(`${producer.url}/control/envelopes`);
        return ((await response.json()) as { envelopes: Array<{ actionId?: string; duplicate: boolean; body: any }> })
          .envelopes;
      };

      try {
        await page.goto(`${capture.url}/?producer=${encodeURIComponent(producer.url)}&stream=${stream}`);
        await expect(page.getByTestId("connection")).toHaveText("open");

        const surfaceId = "upg14";
        await postJson("/control/emit", {
          stream,
          event: activitySnapshot({
            messageId: "upg14-m1",
            operations: [
              createSurfaceOperation(surfaceId),
              updateComponentsOperation(surfaceId, labComponents()),
              updateDataModelOperation(surfaceId, "/", { note: "Producer note" }),
            ],
            versions: { [surfaceId]: { epoch: 1, version: 1 } },
          }),
        });
        await expect(page.getByTestId("events-received")).toHaveText("1");
        const surfaces = page.getByTestId("surfaces");
        const ping = surfaces.getByRole("button", { name: "Ping" });
        await expect(ping).toBeVisible();
        await expect(surfaces).toContainText("Producer note");
        await expect(page.getByTestId("refusals-count")).toHaveText("0");
        await expect(page.getByTestId("faults-count")).toHaveText("0");
        capture.surface = { rendered: true, surfaceId, producer: producer.url, stream };
        await screenshot(page, capture, "surface");

        await ping.click();
        await expect.poll(async () => (await envelopes()).length).toBe(1);
        await expect(page.getByTestId("posts")).toContainText("HTTP 200");
        const [received] = await envelopes();
        // The runtime forwards an envelope only after the lab policy executes the action
        // (runtime-core emitActionEnvelope on decision "executed"); check it is lab.ping.
        const receivedName = received.body?.forwardedProps?.a2uiAction?.userAction?.name;
        expect(receivedName).toBe("lab.ping");
        capture.action = {
          name: receivedName,
          executedByPolicy: true,
          actionId: received.actionId ?? null,
          duplicate: received.duplicate,
          userAction: received.body?.forwardedProps?.a2uiAction?.userAction ?? null,
        };
        await screenshot(page, capture, "action");

        await expect.poll(() => sseTap.frames.length).toBeGreaterThan(0);
      } finally {
        const frames = await sseTap.stop();
        tapStopped = true;
        for (const frame of frames) capture.records.push({ source: "agui-activity-stream", payload: frame });
      }
    });
  } finally {
    if (!tapStopped) await sseTap.stop().catch(() => undefined);
    await producer.close();
  }
});
