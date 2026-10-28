import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  activityDelta,
  activitySnapshot,
  createSurfaceOperation,
  deleteSurfaceOperation,
  messagesSnapshot,
  updateComponentsOperation,
  updateDataModelOperation,
  type A2uiOperation,
} from "../../examples/agui-activity-lab/server/events";
import { startProducer, type RunningProducer } from "../../examples/agui-activity-lab/server/producer";

const evidenceDirectory = resolve(
  ".kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/evidence/hardening-acceptance",
);
const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EPOCH = 1;

let producer: RunningProducer;
const receipts: Record<string, { status: "pass"; proof: unknown }> = {};

test.beforeAll(async () => {
  producer = await startProducer({ port: 0 });
});

test.afterAll(async () => {
  mkdirSync(evidenceDirectory, { recursive: true });
  writeFileSync(resolve(evidenceDirectory, "browser-receipts.json"), JSON.stringify(receipts, null, 2));
  await producer.close();
});

function record(id: string, proof: unknown): void {
  receipts[id] = { status: "pass", proof };
}

async function post(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${producer.url}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return response.json();
}

async function emit(stream: string, event: unknown, copies = 1): Promise<void> {
  await post("/control/emit", { stream, event, copies });
}

async function envelopes(): Promise<Array<{ actionId?: string; duplicate: boolean; body: any }>> {
  const response = await fetch(`${producer.url}/control/envelopes`);
  return ((await response.json()) as { envelopes: Array<{ actionId?: string; duplicate: boolean; body: any }> }).envelopes;
}

async function open(page: Page, stream: string): Promise<void> {
  await page.goto(`/?producer=${encodeURIComponent(producer.url)}&stream=${stream}`);
  await expect(page.getByTestId("connection")).toHaveText("open");
}

async function count(page: Page, id: "faults" | "refusals" | "conflicts" | "resyncs" | "posts"): Promise<number> {
  return Number(await page.getByTestId(`${id}-count`).innerText());
}

/** Components of the lab surface: a typed field, a producer-owned note and two action buttons. */
function components(label: string): Record<string, unknown>[] {
  return [
    { id: "root", component: "Column", children: ["name", "note", "ping", "ping-label", "nope", "nope-label"] },
    { id: "name", component: "TextField", label, value: { path: "/name" } },
    { id: "note", component: "Text", text: { path: "/note" } },
    { id: "ping", component: "Button", child: "ping-label", action: { event: { name: "lab.ping", context: {} } } },
    { id: "ping-label", component: "Text", text: "Ping" },
    { id: "nope", component: "Button", child: "nope-label", action: { event: { name: "lab.forbidden", context: {} } } },
    { id: "nope-label", component: "Text", text: "Forbidden" },
  ];
}

function create(surfaceId: string, label: string, note = "first", sendDataModel?: boolean): A2uiOperation[] {
  return [
    createSurfaceOperation(surfaceId, sendDataModel === undefined ? {} : { sendDataModel }),
    updateComponentsOperation(surfaceId, components(label)),
    updateDataModelOperation(surfaceId, "/", { name: "", note }),
  ];
}

const at = (version: number) => ({ epoch: EPOCH, version });

test.beforeEach(async () => {
  await post("/control/reset", {});
});

test("AUI-1 duplicate create activity is a no-op", async ({ page }) => {
  const stream = "aui1";
  await open(page, stream);
  const snapshot = activitySnapshot({ messageId: "m1", operations: create("s1", "Name s1"), versions: { s1: at(1) } });
  await emit(stream, snapshot);
  const field = page.getByLabel("Name s1", { exact: true });
  await field.fill("typed");

  await emit(stream, snapshot, 3);
  await expect(page.getByTestId("events-received")).toHaveText("4");
  await expect(field).toHaveValue("typed");
  expect(await count(page, "faults")).toBe(0);

  // Negative control: same key, different content. The first is kept and the fault reported.
  await emit(stream, activitySnapshot({ messageId: "m1b", operations: create("s1", "Name changed"), versions: { s1: at(1) } }));
  await expect.poll(() => count(page, "faults")).toBe(1);
  await expect(page.getByLabel("Name s1", { exact: true })).toHaveValue("typed");
  await expect(page.getByLabel("Name changed", { exact: true })).toHaveCount(0);
  record("AUI-1", { surfaces: 1, typed: "typed", faults: 1 });
});

test("AUI-2 duplicate and out-of-order versioned updates", async ({ page }) => {
  const stream = "aui2";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s2", "Name v1"), versions: { s2: at(1) } }));
  await page.getByLabel("Name v1", { exact: true }).fill("typed");
  const v2 = activitySnapshot({
    messageId: "m2",
    operations: [updateComponentsOperation("s2", components("Name v2"))],
    versions: { s2: at(2) },
  });
  await emit(stream, v2);
  await expect(page.getByLabel("Name v2", { exact: true })).toHaveValue("typed");

  await emit(stream, v2, 2);
  // Negative control: the stale version arrives again under a new message id.
  await emit(stream, activitySnapshot({ messageId: "m1-again", operations: create("s2", "Name v1"), versions: { s2: at(1) } }));
  await expect(page.getByTestId("events-received")).toHaveText("5");
  await expect(page.getByLabel("Name v2", { exact: true })).toHaveValue("typed");
  await expect(page.getByLabel("Name v1", { exact: true })).toHaveCount(0);
  record("AUI-2", { held: 2, typed: "typed" });
});

test("AUI-3 messages snapshot replay keeps surface and input", async ({ page }) => {
  const stream = "aui3";
  await open(page, stream);
  const thread = [{ id: "a1", operations: create("s3", "Name s3"), versions: { s3: at(1) } }];
  await emit(stream, messagesSnapshot(thread));
  await page.getByLabel("Name s3", { exact: true }).fill("typed");
  await emit(stream, messagesSnapshot(thread));
  await expect(page.getByLabel("Name s3", { exact: true })).toHaveValue("typed");

  // Negative control 1: a snapshot that omits the activity does not delete the surface.
  await emit(stream, messagesSnapshot([{ id: "other", operations: create("s3b", "Name s3b"), versions: { s3b: at(1) } }]));
  await expect(page.getByLabel("Name s3b", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name s3", { exact: true })).toHaveValue("typed");

  // Negative control 2: a delete is not undone by redelivering the create.
  await emit(stream, activitySnapshot({ messageId: "del", operations: [deleteSurfaceOperation("s3b")], versions: { s3b: at(2) } }));
  await expect(page.getByLabel("Name s3b", { exact: true })).toHaveCount(0);
  await emit(stream, activitySnapshot({ messageId: "recreate", operations: create("s3b", "Name s3b"), versions: { s3b: at(1) } }));
  await expect(page.getByLabel("Name s3b", { exact: true })).toHaveCount(0);
  record("AUI-3", { kept: true, notResurrected: true });
});

test("AUI-4 newer restatement applies as updates", async ({ page }) => {
  const stream = "aui4";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s4", "Name s4", "a"), versions: { s4: at(1) } }));
  await emit(stream, activitySnapshot({ messageId: "other", operations: create("s4-other", "Name other"), versions: { "s4-other": at(1) } }));
  await page.getByLabel("Name s4", { exact: true }).fill("typed");

  // Unchanged producer value for /name must not overwrite the typed input; /note changes.
  await emit(stream, activitySnapshot({
    messageId: "m2",
    operations: [updateDataModelOperation("s4", "/", { name: "", note: "b" })],
    versions: { "s4": at(2) },
    replace: true,
  }));
  await expect(page.getByText("b", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Name s4", { exact: true })).toHaveValue("typed");
  expect(await count(page, "conflicts")).toBe(0);

  // Producer wins when it changes the leaf the user also changed, and the conflict is reported.
  await emit(stream, activitySnapshot({
    messageId: "m3",
    operations: [updateDataModelOperation("s4", "/name", "from producer")],
    versions: { "s4": at(3) },
  }));
  await expect(page.getByLabel("Name s4", { exact: true })).toHaveValue("from producer");
  await expect.poll(() => count(page, "conflicts")).toBe(1);
  // Negative control: the surface the restatement omitted survives.
  await expect(page.getByLabel("Name other", { exact: true })).toBeVisible();
  record("AUI-4", { conflicts: 1, omittedSurfaceSurvives: true });
});

test("AUI-5 one activity under two message ids is applied once", async ({ page }) => {
  const stream = "aui5";
  await open(page, stream);
  const operations = create("s5", "Name s5");
  await emit(stream, activitySnapshot({ messageId: "stream-a-1", operations, versions: { s5: at(1) } }));
  await page.getByLabel("Name s5", { exact: true }).fill("typed");
  await emit(stream, activitySnapshot({ messageId: "stream-b-1", operations, versions: { s5: at(1) } }));
  await expect(page.getByTestId("events-received")).toHaveText("2");
  await expect(page.getByLabel("Name s5", { exact: true })).toHaveValue("typed");
  expect(await count(page, "faults")).toBe(0);

  // Negative control: same key, different digest. The first is kept.
  await emit(stream, activitySnapshot({ messageId: "stream-b-2", operations: create("s5", "Name other"), versions: { s5: at(1) } }));
  await expect.poll(() => count(page, "faults")).toBe(1);
  await expect(page.getByLabel("Name s5", { exact: true })).toHaveValue("typed");
  record("AUI-5", { appliedOnce: true, limitation: "one stream carries both message ids" });
});

test("AUI-6 versioned delta, gap and refusal", async ({ page }) => {
  const stream = "aui6";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s6", "Name v1"), versions: { s6: at(1) } }));
  await emit(stream, activityDelta({
    messageId: "m1", surfaceId: "s6", base: at(1),
    operation: updateComponentsOperation("s6", components("Name v2")),
  }));
  await expect(page.getByLabel("Name v2", { exact: true })).toBeVisible();

  // Negative control 1: a component outside the allowlist is refused whole.
  const refusalsBefore = await count(page, "refusals");
  await emit(stream, activityDelta({
    messageId: "m1", surfaceId: "s6", base: at(2),
    operation: updateComponentsOperation("s6", [{ id: "alien", component: "Carousel" }]),
  }));
  await expect.poll(() => count(page, "refusals")).toBe(refusalsBefore + 1);
  await expect(page.getByLabel("Name v2", { exact: true })).toBeVisible();

  // Negative control 2: a delta with no version test cannot be ordered.
  await emit(stream, {
    type: "ACTIVITY_DELTA", messageId: "m1", activityType: "a2ui-surface",
    patch: [{ op: "add", path: "/a2ui_operations/-", value: updateComponentsOperation("s6", components("Name x")) }],
  });
  await expect.poll(() => count(page, "refusals")).toBe(refusalsBefore + 2);
  await expect(page.getByLabel("Name v2", { exact: true })).toBeVisible();

  // A gap: a delta built on a version that never arrived asks for a resync.
  await emit(stream, activityDelta({
    messageId: "m1", surfaceId: "s6", base: at(5),
    operation: updateComponentsOperation("s6", components("Name v6")),
  }));
  await expect.poll(() => count(page, "resyncs"), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  record("AUI-6", { ordered: true, refused: 2, resyncs: await count(page, "resyncs") });
});

test("AUI-7 held versions are reported and only the missing operations return", async ({ page }) => {
  const stream = "aui7";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s7", "Name v1"), versions: { s7: at(1) } }));
  await page.getByLabel("Name v1", { exact: true }).fill("typed");
  await emit(stream, activityDelta({
    messageId: "m1", surfaceId: "s7", base: at(4),
    operation: updateComponentsOperation("s7", components("Name v5")),
  }));
  await expect.poll(async () => (await envelopes()).length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  const resync = (await envelopes()).map((e) => e.body.forwardedProps.a2uiResync).find(Boolean);
  expect(resync.held.s7).toEqual({ epoch: EPOCH, version: 1 });

  // The producer answers with only what was missing; the surface catches up.
  // The delta that waited was dropped when the resync fired, so it is part of what returns.
  for (const [base, label] of [[1, "Name v2"], [2, "Name v3"], [3, "Name v4"], [4, "Name v5"]] as const) {
    await emit(stream, activityDelta({
      messageId: "m1", surfaceId: "s7", base: at(base),
      operation: updateComponentsOperation("s7", components(label)),
    }));
  }
  // Typed input survives deltas and the version-based catch-up.
  await expect(page.getByLabel("Name v5", { exact: true })).toHaveValue("typed");
  record("AUI-7", { held: resync.held });
});

test("AUI-14 stale-action rejection operations are applied", async ({ page }) => {
  const stream = "aui14";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s14", "Name v1"), versions: { s14: at(1) } }));
  await post("/control/reject-next", {
    rejection: {
      a2ui_operations: [updateComponentsOperation("s14", components("Name repaired"))],
      surfaceVersions: { s14: at(2) },
    },
  });
  await page.getByRole("button", { name: "Ping" }).click();
  await expect(page.getByLabel("Name repaired", { exact: true })).toBeVisible();

  // Negative control: a rejection with no operations cannot repair, so it requests a resync.
  await post("/control/reject-next", { rejection: { a2ui_operations: [], surfaceVersions: {} } });
  await page.getByRole("button", { name: "Ping" }).click();
  await expect.poll(() => count(page, "resyncs")).toBeGreaterThanOrEqual(1);
  record("AUI-14", { repaired: true, emptyRejectionResyncs: true });
});

test("AUI-8 distinct action ids across contexts and reload; retry reuses one", async ({ browser, page }) => {
  const stream = "aui8";
  const snapshot = activitySnapshot({ messageId: "m1", operations: create("s8", "Name s8"), versions: { s8: at(1) } });
  await open(page, stream);
  await emit(stream, snapshot);
  await page.getByRole("button", { name: "Ping" }).click();

  const second = await (await browser.newContext()).newPage();
  await open(second, stream);
  await emit(stream, snapshot);
  await second.getByRole("button", { name: "Ping" }).click();

  await page.reload();
  await expect(page.getByTestId("connection")).toHaveText("open");
  await emit(stream, snapshot);
  await page.getByRole("button", { name: "Ping" }).click();
  await expect.poll(async () => (await envelopes()).length).toBe(3);

  const ids = (await envelopes()).map((e) => e.actionId);
  expect(new Set(ids).size).toBe(3);
  for (const id of ids) expect(id).toMatch(UUID_V7);

  // A runtime retry reuses the id of the action it resends.
  await page.getByRole("button", { name: "Retry last action" }).click();
  await expect.poll(async () => (await envelopes()).length).toBe(4);
  const after = await envelopes();
  expect(after[3].actionId).toBe(after[2].actionId);
  expect(after[3].duplicate).toBe(true);

  // Negative control: the denied action never leaves the runtime.
  await page.getByRole("button", { name: "Forbidden" }).click();
  await page.waitForTimeout(500);
  expect((await envelopes()).length).toBe(4);
  record("AUI-8", { ids, retryReused: true });
});

test("AUI-9 envelope fidelity for v0.9.1 and v1.0", async ({ page }) => {
  const stream = "aui9";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s9", "Name s9", "n", true), versions: { s9: at(1) } }));
  await page.getByLabel("Name s9", { exact: true }).fill("typed");
  await page.getByRole("button", { name: "Ping" }).click();
  await expect.poll(async () => (await envelopes()).length).toBe(1);
  const v09 = (await envelopes())[0].body.forwardedProps.a2uiAction;
  expect(v09.userAction.name).toBe("lab.ping");
  expect(v09.actionId).toMatch(UUID_V7);
  expect(v09.heldVersion).toEqual({ epoch: EPOCH, version: 1 });
  // sendDataModel is set, so the data model must travel with the action.
  expect(JSON.stringify(v09.dataModel)).toContain("typed");

  const v1Surface = [{
    version: "v1.0",
    createSurface: {
      surfaceId: "s9v1",
      catalogId: "urn:prometheus-ags:a2ui:catalog:v3",
      sendDataModel: true,
      components: [
        { id: "root", component: "Column", children: ["name1", "ping1", "ping1-label"] },
        { id: "name1", component: "TextField", label: "Name v1", value: { path: "/name" } },
        { id: "ping1", component: "Button", child: "ping1-label", action: { event: { name: "lab.ping", context: {}, wantResponse: true } } },
        { id: "ping1-label", component: "Text", text: "Ping v1" },
      ],
      dataModel: { name: "" },
    },
  }];
  await emit(stream, activitySnapshot({ messageId: "m2", operations: v1Surface, versions: { s9v1: at(1) } }));
  await page.getByLabel("Name v1", { exact: true }).fill("typed v1");
  await page.getByRole("button", { name: "Ping v1" }).click();
  await expect.poll(async () => (await envelopes()).length).toBe(2);
  const v1 = (await envelopes())[1].body.forwardedProps.a2uiAction;
  expect(v1.userAction.surfaceId).toBe("s9v1");
  expect(v1.actionId).toMatch(UUID_V7);
  expect(JSON.stringify(v1.dataModel)).toContain("typed v1");
  record("AUI-9", { v09: v09.heldVersion, v1: v1.userAction.name });
});

test("AUI-15 a failing action response does not undo its batch", async ({ page }) => {
  const stream = "aui15";
  await open(page, stream);
  const surface = [{
    version: "v1.0",
    createSurface: {
      surfaceId: "s15",
      catalogId: "urn:prometheus-ags:a2ui:catalog:v3",
      components: [
        { id: "root", component: "Column", children: ["name1", "ping1", "ping1-label"] },
        { id: "name1", component: "TextField", label: "Label before", value: { path: "/name" } },
        { id: "ping1", component: "Button", child: "ping1-label", action: { event: { name: "lab.ping", context: {}, wantResponse: true, responsePath: "/a/b" } } },
        { id: "ping1-label", component: "Text", text: "Ping v1" },
      ],
      // /a holds a primitive, so a response written to /a/b cannot be applied.
      dataModel: { name: "", a: "primitive" },
    },
  }];
  await emit(stream, activitySnapshot({ messageId: "m1", operations: surface, versions: { s15: at(1) } }));
  await page.getByRole("button", { name: "Ping v1" }).click();
  await expect.poll(async () => (await envelopes()).length).toBe(1);

  const faultsBefore = await count(page, "faults");
  await emit(stream, activitySnapshot({
    messageId: "m2",
    operations: [
      { version: "v1.0", updateComponents: { surfaceId: "s15", components: [
        { id: "name1", component: "TextField", label: "Label after", value: { path: "/name" } },
      ] } },
      { version: "v1.0", actionId: "s15:ping1:1", actionResponse: { value: "reply" } },
    ],
    versions: { s15: at(2) },
  }));
  // The batch is applied and reported as applied, whatever became of the response write.
  await expect(page.getByLabel("Label after", { exact: true })).toBeVisible();
  expect(await count(page, "refusals")).toBe(0);
  await expect.poll(() => count(page, "faults")).toBeGreaterThan(faultsBefore);
  // Redelivery is a no-op: the held version advanced with the batch.
  await emit(stream, activitySnapshot({
    messageId: "m2",
    operations: [
      { version: "v1.0", updateComponents: { surfaceId: "s15", components: [
        { id: "name1", component: "TextField", label: "Label after", value: { path: "/name" } },
      ] } },
    ],
    versions: { s15: at(2) },
  }));
  expect(await count(page, "resyncs")).toBe(0);
  record("AUI-15", { applied: true, resyncs: 0 });
});

test("AUI-16 oversize delta is rejected before buffering; a waiting delta is held once", async ({ page }) => {
  const stream = "aui16";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s16", "Name s16"), versions: { s16: at(1) } }));

  // Built on a version that has not arrived, and larger than any call may be.
  await emit(stream, activityDelta({
    messageId: "big", surfaceId: "s16", base: at(9),
    operation: updateComponentsOperation("s16", [{ id: "huge", component: "Text", text: "x".repeat(1_300_000) }]),
  }));
  await expect.poll(() => count(page, "faults")).toBe(1);

  // The same small waiting delta delivered three times is one waiting delta: one resync.
  const waiting = activityDelta({
    messageId: "w", surfaceId: "s16", base: at(7),
    operation: updateComponentsOperation("s16", components("Name later")),
  });
  await emit(stream, waiting, 3);
  await expect.poll(() => count(page, "resyncs"), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
  await page.waitForTimeout(1_500);
  expect(await count(page, "resyncs")).toBe(1);
  record("AUI-16", { oversizeRejected: true, resyncs: 1 });
});

test("AUI-17 component payload growth past the cap is rejected", async ({ page }) => {
  const stream = "aui17";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s17", "Name s17"), versions: { s17: at(1) } }));
  const filler = (id: string) => updateComponentsOperation("s17", [{ id, component: "Text", text: "y".repeat(450_000) }]);
  await emit(stream, activitySnapshot({ messageId: "m2", operations: [filler("c1")], versions: { s17: at(2) } }));
  await emit(stream, activitySnapshot({ messageId: "m3", operations: [filler("c2")], versions: { s17: at(3) } }));
  expect(await count(page, "faults")).toBe(0);
  // Each call is far under the per-call cap; the third pushes the surface past its component bytes.
  await emit(stream, activitySnapshot({ messageId: "m4", operations: [filler("c3")], versions: { s17: at(4) } }));
  await expect.poll(() => count(page, "faults")).toBe(1);
  await expect(page.getByLabel("Name s17", { exact: true })).toBeVisible();
  record("AUI-17", { rejectedAtThird: true });
});

test("AUI-18 unreadable data keys do not wedge later updates", async ({ page }) => {
  const stream = "aui18";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s18", "Name s18", "first"), versions: { s18: at(1) } }));
  await expect(page.getByText("first", { exact: true })).toBeVisible();
  await emit(stream, activitySnapshot({
    messageId: "m2",
    operations: [updateDataModelOperation("s18", "/", { name: "", note: "second", constructor: "x" })],
    versions: { s18: at(2) },
  }));
  await expect(page.getByText("second", { exact: true })).toBeVisible();
  expect(await count(page, "refusals")).toBe(0);
  await emit(stream, activitySnapshot({
    messageId: "m3",
    operations: [updateDataModelOperation("s18", "/note", "third")],
    versions: { s18: at(3) },
  }));
  await expect(page.getByText("third", { exact: true })).toBeVisible();
  record("AUI-18", { updatesAfterForbiddenKey: true });
});

test("AUI-19 delete and create of one surface in one activity restores its data", async ({ page }) => {
  const stream = "aui19";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s19", "Name s19", "kept-note"), versions: { s19: at(1) } }));
  await expect(page.getByText("kept-note", { exact: true })).toBeVisible();
  await emit(stream, activitySnapshot({
    messageId: "m2",
    operations: [deleteSurfaceOperation("s19"), ...create("s19", "Name s19 again", "kept-note")],
    versions: { s19: at(2) },
  }));
  await expect(page.getByLabel("Name s19 again", { exact: true })).toBeVisible();
  // The recreated surface carries the data model the activity restated.
  await expect(page.getByText("kept-note", { exact: true })).toBeVisible();
  record("AUI-19", { dataRestored: true });
});

test("AUI-9b envelopes without sendDataModel carry no data model", async ({ page }) => {
  const stream = "aui9b";
  await open(page, stream);
  await emit(stream, activitySnapshot({ messageId: "m1", operations: create("s9b", "Name s9b"), versions: { s9b: at(1) } }));
  await page.getByRole("button", { name: "Ping", exact: true }).click();
  await expect.poll(async () => (await envelopes()).length).toBe(1);
  const v09 = (await envelopes())[0].body.forwardedProps.a2uiAction;
  expect(v09.heldVersion).toEqual({ epoch: EPOCH, version: 1 });
  expect("dataModel" in v09).toBe(false);

  const v1Surface = [{
    version: "v1.0",
    createSurface: {
      surfaceId: "s9bv1",
      catalogId: "urn:prometheus-ags:a2ui:catalog:v3",
      components: [
        { id: "root", component: "Column", children: ["ping1", "ping1-label"] },
        { id: "ping1", component: "Button", child: "ping1-label", action: { event: { name: "lab.ping", context: {} } } },
        { id: "ping1-label", component: "Text", text: "Ping v1" },
      ],
      dataModel: { name: "" },
    },
  }];
  await emit(stream, activitySnapshot({ messageId: "m2", operations: v1Surface, versions: { s9bv1: at(1) } }));
  await page.getByRole("button", { name: "Ping v1" }).click();
  await expect.poll(async () => (await envelopes()).length).toBe(2);
  const v1 = (await envelopes())[1].body.forwardedProps.a2uiAction;
  expect(v1.userAction.surfaceId).toBe("s9bv1");
  expect("dataModel" in v1).toBe(false);
  record("AUI-9b", { v09: "no dataModel", v1: "no dataModel" });
});

test("AUI-5b two real concurrent streams carrying the same activity", async ({ page }) => {
  // A run stream and a connect() stream, both open on one runtime.
  await page.goto(`/?producer=${encodeURIComponent(producer.url)}&stream=aui5b-run,aui5b-connect`);
  await expect(page.getByTestId("connection")).toHaveText("open");
  const create5 = activitySnapshot({ messageId: "shared-1", operations: create("s5b", "Name v1"), versions: { s5b: at(1) } });
  const update5 = activitySnapshot({
    messageId: "shared-2",
    operations: [updateComponentsOperation("s5b", components("Name v2"))],
    versions: { s5b: at(2) },
  });

  await emit("aui5b-run", create5);
  await page.getByLabel("Name v1", { exact: true }).fill("typed");
  // The connect stream replays the thread while the run stream moves on, interleaved.
  await emit("aui5b-connect", create5);
  await emit("aui5b-run", update5);
  await emit("aui5b-connect", update5);
  await emit("aui5b-connect", create5);
  await emit("aui5b-run", create5);
  await expect(page.getByTestId("events-received")).toHaveText("6");
  await expect(page.getByLabel("Name v2", { exact: true })).toHaveValue("typed");
  await expect(page.getByLabel("Name v1", { exact: true })).toHaveCount(0);
  expect(await count(page, "faults")).toBe(0);
  expect(await count(page, "refusals")).toBe(0);
  record("AUI-5b", { streams: 2, eventsReceived: 6, applied: "once each", typed: "typed" });
});
