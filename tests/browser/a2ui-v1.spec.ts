import { test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { runFailedStream, runRenderStream } from "../a2ui-v1/scripted-agent";

/*
 * A2UI 1.0 acceptance browser lane for scripts/verify-a2ui-v1.mjs: UPG-1, 2, 4,
 * 5, 6, 7, 8 and 17 against the BUILT @prometheus-ags/a2ui-react in Chromium,
 * through tests/a2ui-v1/page. Each scenario exercises its oracle AND its
 * negative control in the same test and appends one JSON line to
 * A2UI_V1_RESULTS with every check and the observed values (DOM digests,
 * refusal messages, error codes, payloads, data-model digests, effect logs).
 * Results are recorded, not asserted: the verifier decides pass/fail, so a
 * failed oracle never hides its negative control's evidence.
 */

type Json = Record<string, any>;
interface Check {
  name: string;
  pass: boolean;
  detail?: unknown;
}
interface Part {
  checks: Check[];
  observed: Json;
  exercised?: boolean;
}

const resultsPath = process.env.A2UI_V1_RESULTS;
const fixturesDir = process.env.A2UI_V1_FIXTURES;
if (!resultsPath || !fixturesDir) throw new Error("A2UI_V1_RESULTS and A2UI_V1_FIXTURES must be set (run scripts/verify-a2ui-v1.mjs).");

const POLL_TIMEOUT_MS = 5_000;

function fixture(name: string): Json {
  return JSON.parse(readFileSync(join(fixturesDir as string, name), "utf8")) as Json;
}

function record(entry: object): void {
  mkdirSync(dirname(resultsPath as string), { recursive: true });
  appendFileSync(resultsPath as string, `${JSON.stringify(entry)}\n`);
}

const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");
const digestOf = (value: unknown): string => sha256(JSON.stringify(value ?? null));
const check = (name: string, pass: unknown, detail?: unknown): Check => ({
  name,
  pass: Boolean(pass),
  ...(detail === undefined ? {} : { detail }),
});
const sameJson = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Call `window.__a2uiV1[method](...args)` in the page. */
async function call<T = any>(page: Page, method: string, ...args: unknown[]): Promise<T> {
  return page.evaluate(
    ({ method, args }) => {
      const api = (window as unknown as { __a2uiV1: Record<string, (...input: unknown[]) => unknown> }).__a2uiV1;
      return api[method](...args);
    },
    { method, args },
  ) as Promise<T>;
}

/** Poll a page method until `done` holds or the timeout passes; returns the last value. */
async function poll<T = any>(page: Page, method: string, args: unknown[], done: (value: T) => boolean): Promise<{ value: T; met: boolean }> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let value = await call<T>(page, method, ...args);
  while (!done(value) && Date.now() < deadline) {
    await page.waitForTimeout(50);
    value = await call<T>(page, method, ...args);
  }
  return { value, met: done(value) };
}

/** A snapshot with its canonical DOM replaced by the digest (the canonical text goes to the artifacts only). */
function summarize(snapshot: Json): Json {
  const { canonical, ...rest } = snapshot;
  return { ...rest, domDigest: sha256(String(canonical)), dataModelDigest: digestOf(snapshot.dataModel) };
}

async function open(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => document.documentElement.dataset.a2uiV1Ready === "true");
}

async function clickComponent(page: Page, slot: string, componentId: string): Promise<{ selector: string | null; clicked: boolean; error?: string }> {
  const selector = await call<string | null>(page, "tagButton", slot, componentId);
  if (!selector) return { selector, clicked: false, error: "no button rendered" };
  try {
    await page.locator(selector).click({ timeout: 5_000 });
    await call(page, "settle", slot);
    return { selector, clicked: true };
  } catch (cause) {
    return { selector, clicked: false, error: cause instanceof Error ? cause.message.split("\n")[0] : String(cause) };
  }
}

function refusal(outcome: Json): Json {
  return outcome?.ok === false ? outcome.error : { unexpected: "accepted" };
}

/** Run one scenario, always recording a result line (a harness error fails both parts). */
function scenario(id: string, title: string, body: (page: Page) => Promise<{ oracle: Part; negativeControl: Part }>): void {
  test(`${id} ${title}`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") pageErrors.push(`console.error: ${message.text()}`);
    });
    let entry: Json;
    try {
      await open(page);
      const { oracle, negativeControl } = await body(page);
      entry = { kind: "scenario", id, title, oracle, negativeControl: { exercised: true, ...negativeControl } };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message.split("\n")[0] : String(cause);
      const failed: Part = { checks: [check("harness completed", false, message)], observed: {} };
      entry = { kind: "scenario", id, title, harnessError: message, oracle: failed, negativeControl: { ...failed, exercised: false } };
    }
    record({ ...entry, pageErrors });
  });
}

scenario("UPG-1", "conformant 1.0 surface renders through the built package", async (page) => {
  const constants = fixture("constants.json");
  const f = fixture("upg1.json");
  // The control is this same surface with only `version` changed to the RC "v1.0".
  const rcMessages = [...f.create, ...f.components, ...f.dataAda].map((message: Json) => ({ ...message, version: "v1.0" }));
  const pkg = await call(page, "constants");
  await call(page, "createSlot", "main", { surfaceId: "upg1" });
  const steps: Json = {};
  steps.createSurface = await call(page, "processMessages", "main", f.create);
  steps.updateComponents = await call(page, "processMessages", "main", f.components);
  steps.updateDataModelAda = await call(page, "processMessages", "main", f.dataAda);
  const afterAda = await call(page, "snapshot", "main");
  steps.updateDataModelGrace = await call(page, "processMessages", "main", f.dataGrace);
  const afterGrace = await call(page, "snapshot", "main");
  steps.deleteSurface = await call(page, "processMessages", "main", f.delete);
  const afterDelete = await call(page, "snapshot", "main");

  await call(page, "createSlot", "rc-off", { surfaceId: "upg1" });
  const refused = await call(page, "processMessages", "rc-off", rcMessages);
  const afterRefusal = await call(page, "snapshot", "rc-off");

  return {
    oracle: {
      observed: { packageConstants: pkg, steps, afterAda: summarize(afterAda), afterGrace: summarize(afterGrace), afterDelete: summarize(afterDelete) },
      checks: [
        check("package catalog ids match the fixtures", pkg.PROMETHEUS_A2UI_V1_CATALOG_ID === constants.V1_CATALOG && pkg.PROMETHEUS_A2UI_CATALOG_ID === constants.V091_CATALOG, pkg),
        check("createSurface, updateComponents, updateDataModel, deleteSurface (1.0) accepted", Object.values(steps).every((step: Json) => step.ok === true), steps),
        check("@call formatString renders the bound name", String(afterAda.text).includes("Hello Ada"), afterAda.text),
        check("@path binding renders and the data model holds it", afterAda.hostCount >= 3 && sameJson(afterAda.dataModel, { name: "Ada" }), afterAda.dataModel),
        check("updateDataModel re-renders the bindings", String(afterGrace.text).includes("Hello Grace") && !String(afterGrace.text).includes("Ada") && sameJson(afterGrace.dataModel, { name: "Grace" }), afterGrace.text),
        check("deleteSurface removes the surface and its DOM", afterDelete.hasSurface === false && afterDelete.hostCount === 0 && afterDelete.text === "", { hasSurface: afterDelete.hasSurface, hostCount: afterDelete.hostCount }),
      ],
    },
    negativeControl: {
      observed: { input: "upg1.json create+components+dataAda with version \"v1.0\"", refusal: refusal(refused), after: summarize(afterRefusal) },
      checks: [
        check("RC envelope refused while the shim is off", refused.ok === false && refused.error?.code === "unsupported-protocol-version", refusal(refused)),
        check("refused RC surface renders nothing", afterRefusal.hasSurface === false && afterRefusal.surfaceCount === 0 && afterRefusal.hostCount === 0 && afterRefusal.text === "", summarize(afterRefusal)),
      ],
    },
  };
});

scenario("UPG-2", "real AG-UI A2UI middleware surface renders and recovery resyncs", async (page) => {
  const f = fixture("upg2.json");
  const render = await runRenderStream(f.operations);
  const failed = await runFailedStream(f.failedResult);
  const isActivity = (event: Json) => event.type === "ACTIVITY_SNAPSHOT" && event.activityType === "a2ui-surface";
  const painted = render.events.filter((event) => isActivity(event) && Array.isArray(event.content?.a2ui_operations));
  const building = render.events.find((event) => isActivity(event) && event.content?.status === "building");
  const failedActivity = failed.events.find((event) => isActivity(event) && event.content?.status === "failed");

  await call(page, "createSlot", "stream", { surfaceId: f.surfaceId });
  await call(page, "createSlot", "direct", { surfaceId: f.surfaceId });
  await call(page, "createSlot", "failed", { surfaceId: "upg2-failed" });
  await call(page, "createSlot", "neg", { surfaceId: "upg2-unknown" });

  const streamResults = await call<Json[]>(page, "processAgUiEvents", "stream", render.events);
  const direct = await call(page, "processMessages", "direct", f.operations);
  const viaMiddleware = await call(page, "snapshot", "stream");
  const viaRuntime = await call(page, "snapshot", "direct");
  const streamLog = await call(page, "log", "stream");

  const failedResults = failedActivity ? await call<Json[]>(page, "processAgUiEvents", "failed", [failedActivity, failedActivity]) : [];
  const failedLog = await call(page, "log", "failed");
  const failedSnapshot = await call(page, "snapshot", "failed");

  const negativeEvents = [f.unknownActivity, ...(building ? [building] : [])];
  const negResults = await call<Json[]>(page, "processAgUiEvents", "neg", negativeEvents);
  const negSnapshot = await call(page, "snapshot", "neg");
  const negLog = await call(page, "log", "neg");

  const resyncs = failedLog.resyncs as Json[];
  return {
    oracle: {
      observed: {
        middleware: { package: "@ag-ui/a2ui-middleware", renderRun: { digest: render.digest, rounds: render.rounds, events: render.events }, failedRun: { digest: failed.digest, rounds: failed.rounds, events: failed.events } },
        streamResults,
        direct,
        viaMiddleware: summarize(viaMiddleware),
        viaRuntime: summarize(viaRuntime),
        streamResyncs: streamLog.resyncs,
        failedActivity: failedActivity ?? null,
        failedResults,
        resyncRequests: resyncs,
        failedSurfaceCount: failedSnapshot.surfaceCount,
      },
      checks: [
        check("middleware emitted a painted a2ui-surface activity carrying the operations", painted.length === 1 && sameJson(painted[0].content.a2ui_operations, f.operations), painted.length),
        check("every stream event was consumed without error", streamResults.every((result) => !result.error), streamResults.filter((result) => result.error)),
        check("the same operations fed directly were accepted", direct.ok === true, direct),
        check("middleware stream renders the surface", viaMiddleware.hostCount >= 3 && String(viaMiddleware.text).includes("Order 1042") && String(viaMiddleware.text).includes("Ready to ship"), viaMiddleware.text),
        check("DOM digest via middleware equals DOM digest via direct runtime input", sha256(viaMiddleware.canonical) === sha256(viaRuntime.canonical), { viaMiddleware: sha256(viaMiddleware.canonical), viaRuntime: sha256(viaRuntime.canonical) }),
        check("rendering the middleware stream requested no resync", (streamLog.resyncs as Json[]).length === 0, streamLog.resyncs),
        check("middleware emitted a failed lifecycle activity", failedActivity !== undefined, failed.events.map((event) => event.type)),
        check("failed activity delivered then redelivered produces exactly one producer-failed resync", resyncs.length === 1 && resyncs[0]?.reason === "producer-failed" && resyncs[0]?.messageId === failedActivity?.messageId, resyncs),
        check("failed lifecycle activity changes no surface", failedSnapshot.surfaceCount === 0 && failedResults.every((result) => result.handled === true && !result.error), failedResults),
      ],
    },
    negativeControl: {
      exercised: building !== undefined,
      observed: { events: negativeEvents, results: negResults, after: summarize(negSnapshot), resyncRequests: negLog.resyncs },
      checks: [
        check("middleware emitted a building lifecycle activity to replay", building !== undefined),
        check("unknown activity type is not handled", negResults[0]?.handled === false && !negResults[0]?.error, negResults[0]),
        check("building lifecycle activity is accepted without error", negResults[1]?.handled === true && !negResults[1]?.error, negResults[1]),
        check("neither renders anything", negSnapshot.surfaceCount === 0 && negSnapshot.hostCount === 0 && negSnapshot.text === "", summarize(negSnapshot)),
        check("neither requests a resync", (negLog.resyncs as Json[]).length === 0, negLog.resyncs),
      ],
    },
  };
});

scenario("UPG-4", "catalog pairing by protocol version", async (page) => {
  const constants = fixture("constants.json");
  const f = fixture("upg4.json");
  await call(page, "createSlot", "main", { surfaceId: f.surfaceId, catalogs: "with-alt", altCatalogId: constants.ALT_V1_CATALOG });
  const created = await call(page, "processMessages", "main", f.surface);
  const rendered = await call(page, "snapshot", "main");
  const componentProbe = await call(page, "processMessages", "main", f.probeComponentCatalog);
  const surfaceProbe = await call(page, "processMessages", "main", f.probeSurfaceCatalog);
  const afterProbe = await call(page, "snapshot", "main");

  await call(page, "createSlot", "mismatch", { surfaceId: f.mismatchSurfaceId });
  const mismatch = await call(page, "processMessages", "mismatch", f.mismatch);
  const afterMismatch = await call(page, "snapshot", "mismatch");
  return {
    oracle: {
      observed: { created, rendered: summarize(rendered), componentProbe: refusal(componentProbe), surfaceProbe, afterProbe: summarize(afterProbe) },
      checks: [
        check("1.0 surface with component and surface catalogIds accepted", created.ok === true, created),
        check("components from both 1.0 catalogs render", rendered.hostCount >= 3 && String(rendered.text).includes("From the alternate 1.0 catalog") && String(rendered.text).includes("From the surface catalog"), rendered.text),
        check("a component's own catalogId is resolved first (Button refused by the Text-only catalog it names)", componentProbe.ok === false && componentProbe.error?.code === "component-not-allowed" && String(componentProbe.error?.message).includes(constants.ALT_V1_CATALOG), refusal(componentProbe)),
        check("without catalogId the component resolves to the surface 1.0 catalog and renders", surfaceProbe.ok === true && String(afterProbe.text).includes("Go"), { surfaceProbe, text: afterProbe.text }),
      ],
    },
    negativeControl: {
      observed: { refusal: refusal(mismatch), after: summarize(afterMismatch) },
      checks: [
        check("1.0 createSurface naming the v0.9.1 catalog is refused with CATALOG_ERROR", mismatch.ok === false && mismatch.error?.code === "protocol-error" && mismatch.error?.protocolCode === "CATALOG_ERROR", refusal(mismatch)),
        check("refused surface renders nothing", afterMismatch.surfaceCount === 0 && afterMismatch.hostCount === 0, summarize(afterMismatch)),
      ],
    },
  };
});

scenario("UPG-5", "bare and @-prefixed envelope keys", async (page) => {
  const f = fixture("upg5.json");
  for (const slot of ["prefixed", "bare", "both"]) await call(page, "createSlot", slot, { surfaceId: f.surfaceId });
  const prefixed = await call(page, "processMessages", "prefixed", f.prefixed);
  const bare = await call(page, "processMessages", "bare", f.bare);
  const both = await call(page, "processMessages", "both", f.both);
  const prefixedSnapshot = await call(page, "snapshot", "prefixed");
  const bareSnapshot = await call(page, "snapshot", "bare");
  const bothSnapshot = await call(page, "snapshot", "both");
  const labelled = (snapshot: Json) => /aria-label="Greeting"/.test(String(snapshot.canonical));
  return {
    oracle: {
      observed: { prefixed, bare, prefixedSnapshot: summarize(prefixedSnapshot), bareSnapshot: summarize(bareSnapshot) },
      checks: [
        check("@catalogId/@accessibility component accepted", prefixed.ok === true, prefixed),
        check("bare catalogId/accessibility component accepted", bare.ok === true, bare),
        check("both render", prefixedSnapshot.hostCount >= 2 && String(prefixedSnapshot.text).includes("Hello") && String(bareSnapshot.text).includes("Hello")),
        check("accessibility is applied in both forms", labelled(prefixedSnapshot) && labelled(bareSnapshot)),
        check("DOM digests are identical", sha256(prefixedSnapshot.canonical) === sha256(bareSnapshot.canonical), { prefixed: sha256(prefixedSnapshot.canonical), bare: sha256(bareSnapshot.canonical) }),
      ],
    },
    negativeControl: {
      observed: { refusal: refusal(both), after: summarize(bothSnapshot) },
      checks: [
        check("component carrying catalogId and @catalogId is rejected as invalid-message", both.ok === false && both.error?.code === "invalid-message" && /both catalogId and @catalogId/.test(String(both.error?.message)), refusal(both)),
        check("rejected surface renders nothing", bothSnapshot.surfaceCount === 0 && bothSnapshot.hostCount === 0, summarize(bothSnapshot)),
      ],
    },
  };
});

scenario("UPG-6", "agent-to-renderer function calls are restricted", async (page) => {
  const f = fixture("upg6.json");
  await call(page, "createSlot", "fn", { surfaceId: "upg6-none", catalogs: "with-functions" });
  await call(page, "setPhase", "upg6");
  const responseFor = (id: string) => (log: Json) =>
    (log.rendererMessages as Json[]).some((message) => message.rendererFunctionResponse?.functionCallId === id);
  const pick = (log: Json, id: string) => (log.rendererMessages as Json[]).find((message) => message.rendererFunctionResponse?.functionCallId === id) ?? null;

  const allowedCall = await call(page, "processMessages", "fn", f.agentCallable.messages);
  const allowedLog = await poll<Json>(page, "log", ["fn"], responseFor(f.agentCallable.functionCallId));
  const allowedResponse = pick(allowedLog.value, f.agentCallable.functionCallId);
  const effectsAfterAllowed = await call<Json[]>(page, "effects");

  const deniedCall = await call(page, "processMessages", "fn", f.rendererOnly.messages);
  const deniedLog = await poll<Json>(page, "log", ["fn"], responseFor(f.rendererOnly.functionCallId));
  const deniedResponse = pick(deniedLog.value, f.rendererOnly.functionCallId);
  const effects = await call<Json[]>(page, "effects");
  const count = (fn: string) => effects.filter((effect) => effect.fn === fn).length;
  return {
    oracle: {
      observed: {
        note: "A2UI 1.0 answers callRendererFunction with rendererFunctionResponse (the contract text says agentFunctionResponse; see openspec/changes/a2ui-v1-functions-and-actions/design.md, 'Correction to the plan's wording').",
        request: f.agentCallable.messages,
        processMessages: allowedCall,
        response: allowedResponse,
        effects: effectsAfterAllowed,
      },
      checks: [
        check("callRendererFunction for the agent-callable function accepted", allowedCall.ok === true, allowedCall),
        check("renderer answered with the function result", allowedLog.met && allowedResponse?.version === "1.0" && allowedResponse?.rendererFunctionResponse?.value === "echo:ping" && allowedResponse?.rendererFunctionResponse?.error === undefined, allowedResponse),
        check("the agent-callable function executed once", effectsAfterAllowed.filter((effect) => effect.fn === "agentEcho").length === 1, effectsAfterAllowed),
      ],
    },
    negativeControl: {
      observed: { request: f.rendererOnly.messages, processMessages: deniedCall, response: deniedResponse, effects },
      checks: [
        check("renderer answered the renderer-only call", deniedLog.met, deniedLog.value.rendererMessages),
        check("answer is error INVALID_FUNCTION_CALL with no value", deniedResponse?.rendererFunctionResponse?.error?.code === "INVALID_FUNCTION_CALL" && !("value" in (deniedResponse?.rendererFunctionResponse ?? {})), deniedResponse),
        check("the renderer-only function did not execute", count("rendererOnlySecret") === 0, effects),
      ],
    },
  };
});

scenario("UPG-7", "renderer-to-agent function responses under policy and limits", async (page) => {
  const f = fixture("upg7.json");
  await call(page, "createSlot", "main", { surfaceId: f.surfaceId, policy: "entity-graph" });
  const created = await call(page, "processMessages", "main", f.surface);
  await call(page, "setReply", "main", f.answerCall.call, { mode: "agentFunctionResponse", value: f.answerValue });
  await call(page, "setReply", "main", f.oversizedCall.call, { mode: "agentFunctionResponse", repeat: ["x", f.oversizedLength] });
  const before = await call(page, "snapshot", "main");
  const answered = await call(page, "callAgentFunction", "main", f.answerCall, { writeTo: f.answerPath, timeoutMs: POLL_TIMEOUT_MS });
  const after = await call(page, "snapshot", "main");
  const oracleLog = await call(page, "log", "main");
  const outboundCalls = (oracleLog.rendererMessages as Json[]).filter((message) => message.callAgentFunction);

  // Negative control 1: a policy-denied action executes nothing (an allowed one first, as the baseline).
  const approveClick = await clickComponent(page, "main", "approve");
  const afterApprove = await poll<Json>(page, "log", ["main"], (log) => (log.decisions as Json[]).length >= 1);
  const entityAfterApprove = await call(page, "graphEntity", "main", "Order", "o-1");
  const actionsBefore = (afterApprove.value.rendererMessages as Json[]).filter((message) => message.action).length;
  const envelopesBefore = (afterApprove.value.envelopes as Json[]).length;
  const forbidClick = await clickComponent(page, "main", "forbid");
  const afterForbid = await poll<Json>(page, "log", ["main"], (log) => (log.decisions as Json[]).length >= 2);
  const entityAfterForbid = await call(page, "graphEntity", "main", "Order", "o-1");
  const decisions = afterForbid.value.decisions as Json[];
  const actionsAfter = (afterForbid.value.rendererMessages as Json[]).filter((message) => message.action).length;

  // Negative control 2: an answer whose write would exceed maxDataModelBytes is not written.
  const lowered = await call(page, "setLimits", "main", f.lowerLimits);
  const beforeOversized = await call(page, "snapshot", "main");
  const oversized = await call(page, "callAgentFunction", "main", f.oversizedCall, { writeTo: f.oversizedPath, timeoutMs: POLL_TIMEOUT_MS });
  const afterOversized = await call(page, "snapshot", "main");
  const finalLog = await call(page, "log", "main");
  const limitFaults = (finalLog.faults as Json[]).filter((fault) => fault.kind === "limit-exceeded" && fault.limit === "maxDataModelBytes");
  return {
    oracle: {
      observed: { created, outboundCalls, answered, before: summarize(before), after: summarize(after), faults: oracleLog.faults },
      checks: [
        check("surface accepted", created.ok === true, created),
        check("callAgentFunction went out as a 1.0 renderer message", outboundCalls.length === 1 && outboundCalls[0].version === "1.0" && outboundCalls[0].callAgentFunction?.callFunction?.["@call"] === f.answerCall.call, outboundCalls),
        check("the call resolved with the agentFunctionResponse value", answered.ok === true && answered.value === f.answerValue, answered),
        check("the answer was written at writeTo", after.dataModel?.total === f.answerValue, after.dataModel),
        check("the surface updated", String(after.text).includes(f.answerValue) && !String(before.text).includes(f.answerValue), { before: before.text, after: after.text }),
        check("no producer fault", (oracleLog.faults as Json[]).length === 0, oracleLog.faults),
      ],
    },
    negativeControl: {
      observed: {
        policy: { approveClick, forbidClick, decisions, entityAfterApprove, entityAfterForbid, actionsBefore, actionsAfter, envelopesBefore, envelopesAfter: (afterForbid.value.envelopes as Json[]).length },
        limit: { lowered, oversized, before: summarize(beforeOversized), after: summarize(afterOversized), faults: finalLog.faults },
      },
      checks: [
        check("baseline: the allowed entity-graph action executed and wrote the graph", approveClick.clicked && decisions[0]?.status === "executed" && entityAfterApprove?.status === "approved", { approveClick, decision: decisions[0], entityAfterApprove }),
        check("the forbidden action was denied by the policy", forbidClick.clicked && decisions[1]?.status === "denied", decisions[1]),
        check("the denied action changed nothing in the graph", sameJson(entityAfterForbid, entityAfterApprove) && entityAfterForbid?.total === undefined, entityAfterForbid),
        check("the denied action sent nothing to the agent", actionsAfter === actionsBefore && (afterForbid.value.envelopes as Json[]).length === envelopesBefore, { actionsBefore, actionsAfter }),
        check("lowered limit applied", lowered.ok === true, lowered),
        check("the oversized answer resolved the call but was not written", oversized.ok === true && oversized.valueLength === f.oversizedLength && afterOversized.dataModel?.blob === undefined, { oversized, dataModel: afterOversized.dataModel }),
        check("data model unchanged by the refused write", digestOf(afterOversized.dataModel) === digestOf(beforeOversized.dataModel)),
        check("reported as a limit-exceeded producer fault on maxDataModelBytes", limitFaults.length === 1, finalLog.faults),
      ],
    },
  };
});

scenario("UPG-8", "user-activation functions require a gesture", async (page) => {
  const f = fixture("upg8.json");
  await call(page, "createSlot", "main", { surfaceId: f.surfaceId, catalogs: "with-functions" });
  const created = await call(page, "processMessages", "main", f.surface);
  const of = (effects: Json[], phase: string) => effects.filter((effect) => effect.fn === "gestureEffect" && effect.phase === phase);

  await call(page, "setPhase", "no-gesture");
  const invoked = await call(page, "invokeWithoutGesture", "main", f.componentId);
  await page.waitForTimeout(250);
  const afterInvoke = await call(page, "log", "main");
  const effectsAfterInvoke = await call<Json[]>(page, "effects");
  const refusalErrors = [
    ...(afterInvoke.surfaceErrors as Json[]),
    ...(afterInvoke.rendererMessages as Json[]).filter((message) => message.error).map((message) => message.error),
  ];
  const refusedByActivation = (invoked.threw && /user activation/i.test(String(invoked.error?.message)))
    || refusalErrors.some((error) => /user activation/i.test(String(error.message)));

  // Informational: an untrusted DOM click from page script. Not a gate (see the report note).
  await call(page, "setPhase", "synthetic-click");
  const syntheticSelector = await call<string | null>(page, "tagButton", "main", f.componentId);
  const synthetic = syntheticSelector ? await call(page, "syntheticClick", "main", syntheticSelector) : { clicked: false };
  await page.waitForTimeout(250);
  const effectsAfterSynthetic = await call<Json[]>(page, "effects");

  await call(page, "setPhase", "real-click");
  const click = await clickComponent(page, "main", f.componentId);
  const afterClick = await poll<Json[]>(page, "effects", [], (effects) => of(effects, "real-click").length >= 1);
  const realClickEffects = of(afterClick.value, "real-click");
  return {
    oracle: {
      observed: { created, click, effects: realClickEffects },
      checks: [
        check("surface with an activation-gated action accepted", created.ok === true, created),
        check("a real (trusted) Playwright click was delivered", click.clicked, click),
        check("the function ran exactly once after the real click", realClickEffects.length === 1, realClickEffects),
      ],
    },
    negativeControl: {
      observed: {
        invocation: "official dataContext.resolveAction(action, { userActivation: false }), as the upstream conformance harness's programmatic_invoke",
        invoked,
        refusalErrors,
        effects: of(effectsAfterInvoke, "no-gesture"),
        informationalSyntheticClick: {
          note: "element.click() from page script (isTrusted false). The official binder resolves every bound action with userActivation: true, so this records what such a click does; it is not a gate.",
          synthetic,
          effects: of(effectsAfterSynthetic, "synthetic-click"),
        },
      },
      checks: [
        check("the action was invoked without a gesture", invoked.invoked === true, invoked),
        check("the invocation was refused for lack of user activation", refusedByActivation, { invoked, refusalErrors }),
        check("the function had no effect", of(effectsAfterInvoke, "no-gesture").length === 0, of(effectsAfterInvoke, "no-gesture")),
      ],
    },
  };
});

scenario("UPG-17", "RC-input shim is opt-in and maps RC actions to 1.0 function calls", async (page) => {
  const f = fixture("upg17.json");
  const policy = { allow: [f.callName] };
  await call(page, "createSlot", "rc", { surfaceId: f.surfaceId, acceptReleaseCandidateInput: true, policy });
  await call(page, "createSlot", "final", { surfaceId: f.surfaceId, policy });
  await call(page, "createSlot", "rc-off", { surfaceId: f.surfaceId });
  const rcAccepted = await call(page, "processMessages", "rc", f.rc);
  const finalAccepted = await call(page, "processMessages", "final", f.v1);
  const rcSnapshot = await call(page, "snapshot", "rc");
  const finalSnapshot = await call(page, "snapshot", "final");

  const answered = (expected: string) => (snapshot: Json) => snapshot.dataModel?.answer === expected;
  await call(page, "setReply", "rc", f.callName, { mode: "agentFunctionResponse", value: f.finalAnswer });
  const firstClick = await clickComponent(page, "rc", f.componentId);
  const afterFinal = await poll<Json>(page, "snapshot", ["rc"], answered(f.finalAnswer));
  await call(page, "setReply", "rc", f.callName, { mode: "rcActionResponse", value: f.rcAnswer });
  const secondClick = await clickComponent(page, "rc", f.componentId);
  const afterRc = await poll<Json>(page, "snapshot", ["rc"], answered(f.rcAnswer));
  const rcLog = await call(page, "log", "rc");
  const outbound = rcLog.rendererMessages as Json[];
  const calls = outbound.filter((message) => message.callAgentFunction);

  const refused = await call(page, "processMessages", "rc-off", f.rc);
  const afterRefusal = await call(page, "snapshot", "rc-off");
  return {
    oracle: {
      observed: {
        rcAccepted,
        finalAccepted,
        rcSnapshot: summarize(rcSnapshot),
        finalSnapshot: summarize(finalSnapshot),
        clicks: [firstClick, secondClick],
        outbound,
        decisions: rcLog.decisions,
        replyErrors: rcLog.replyErrors,
        afterAgentFunctionResponse: summarize(afterFinal.value),
        afterRcActionResponse: summarize(afterRc.value),
      },
      checks: [
        check("RC envelope accepted with acceptReleaseCandidateInput", rcAccepted.ok === true, rcAccepted),
        check("1.0 equivalent accepted", finalAccepted.ok === true, finalAccepted),
        check("RC and 1.0 render identical DOM", rcSnapshot.hostCount >= 3 && sha256(rcSnapshot.canonical) === sha256(finalSnapshot.canonical), { rc: sha256(rcSnapshot.canonical), final: sha256(finalSnapshot.canonical) }),
        check("RC bindings resolve", String(rcSnapshot.text).includes("Orders") && String(rcSnapshot.text).includes("none"), rcSnapshot.text),
        check("each RC wantResponse click went out as a 1.0 callAgentFunction, never as an action", firstClick.clicked && secondClick.clicked && calls.length === 2 && calls.every((message) => message.version === "1.0" && message.callAgentFunction.callFunction?.["@call"] === f.callName) && !outbound.some((message) => message.action), calls),
        check("agentFunctionResponse written at the former responsePath", afterFinal.met && String(afterFinal.value.text).includes(f.finalAnswer), afterFinal.value.dataModel),
        check("RC actionResponse with the same id written at the former responsePath", afterRc.met && String(afterRc.value.text).includes(f.rcAnswer), afterRc.value.dataModel),
        check("no reply was refused", (rcLog.replyErrors as Json[]).length === 0, rcLog.replyErrors),
      ],
    },
    negativeControl: {
      observed: { refusal: refusal(refused), after: summarize(afterRefusal) },
      checks: [
        check("same RC envelope refused with the shim at its default (off)", refused.ok === false && refused.error?.code === "unsupported-protocol-version", refusal(refused)),
        check("refused RC surface renders nothing", afterRefusal.surfaceCount === 0 && afterRefusal.hostCount === 0 && afterRefusal.text === "", summarize(afterRefusal)),
      ],
    },
  };
});
