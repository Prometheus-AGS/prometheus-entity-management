/**
 * A2UI 1.0 acceptance page (UPG-1, 2, 4, 5, 6, 7, 8, 17) for the BUILT
 * @prometheus-ags/a2ui-react. tests/browser/a2ui-v1.spec.ts drives it through
 * `window.__a2uiV1`. A "slot" is one application-owned runtime rendered into
 * its own container through the package's public provider and surface, with
 * every outbound channel (renderer messages, decisions, envelopes, producer
 * faults, resync requests, surface errors) recorded for the report.
 *
 * Fixtures come from the spec (read from the verifier's scratch fixture dir);
 * this page only builds runtimes and observes them.
 */
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod/v3";
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import {
  ENTITY_GRAPH_A2UI_ACTIONS,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
  PROMETHEUS_A2UI_V1_CATALOG_ID,
  PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
  PrometheusA2uiError,
  PrometheusA2uiProvider,
  PrometheusA2uiSurface,
  createA2uiActionPolicy,
  createDenyAllA2uiActionPolicy,
  createEntityGraphA2uiActionPolicy,
  createPrometheusA2uiCatalog,
  createPrometheusA2uiRuntime,
  type A2uiActionPolicy,
  type PrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
import {
  TARGET_ATTRIBUTE,
  allElements,
  canonicalDom,
  componentHosts,
  deepText,
  findComponentElement,
  queryDeep,
  settleDom,
  type ComponentElement,
} from "./dom.js";

type Json = Record<string, unknown>;

export interface SlotConfig {
  surfaceId: string;
  acceptReleaseCandidateInput?: boolean;
  /** `default`: the runtime's own catalogs. `with-alt`: plus a Text-only 1.0 catalog. `with-functions`: the 1.0 catalog gains the scenario functions. */
  catalogs?: "default" | "with-alt" | "with-functions";
  /** `deny-all` (the package default), `entity-graph`, or an allow-list of action names. */
  policy?: "deny-all" | "entity-graph" | { allow: string[] };
  limits?: Record<string, number>;
  altCatalogId?: string;
}

interface Reply {
  mode: "agentFunctionResponse" | "rcActionResponse";
  value?: unknown;
  repeat?: [string, number];
}

interface Slot {
  config: SlotConfig;
  runtime: PrometheusA2uiRuntime;
  container: HTMLElement;
  store?: ReturnType<typeof createGraphStore>;
  rendererMessages: Json[];
  decisions: Json[];
  envelopes: Json[];
  faults: Json[];
  resyncs: Json[];
  surfaceErrors: Json[];
  replyErrors: Json[];
  executions: string[];
  replies: Map<string, Reply>;
}

interface Effect {
  fn: string;
  phase: string;
  args: unknown;
  userActivationActive: boolean | null;
}

const slots = new Map<string, Slot>();
const effects: Effect[] = [];
let phase = "setup";
let nextTarget = 0;

function serializeError(cause: unknown): Json {
  if (cause instanceof PrometheusA2uiError) {
    return {
      name: cause.name,
      code: cause.code,
      ...(cause.protocolCode === undefined ? {} : { protocolCode: cause.protocolCode }),
      message: cause.message,
      ...(cause.cause instanceof Error ? { causeName: cause.cause.name, causeMessage: cause.cause.message.slice(0, 500) } : {}),
    };
  }
  if (cause instanceof Error) {
    const code = (cause as { code?: unknown }).code;
    return { name: cause.name, ...(typeof code === "string" ? { code } : {}), message: cause.message };
  }
  return { name: "non-error", message: String(cause) };
}

function json(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json;
}

function recordEffect(fn: string, args: unknown): void {
  const activation = (navigator as { userActivation?: { isActive: boolean } }).userActivation;
  effects.push({ fn, phase, args: json(args), userActivationActive: activation ? activation.isActive : null });
}

/**
 * Scenario functions, added to the 1.0 catalog's function map after
 * construction, where the official `Catalog` keeps them (the package allowlists
 * only official basic functions). Shapes follow the official
 * `createFunctionImplementation`.
 */
function scenarioFunctions() {
  return [
    {
      name: "agentEcho",
      returnType: "string",
      schema: z.object({ text: z.string() }),
      allowedCallers: "rendererOrAgent",
      execute(args: { text: string }) {
        recordEffect("agentEcho", args);
        return `echo:${args.text}`;
      },
    },
    {
      name: "rendererOnlySecret",
      returnType: "string",
      schema: z.object({ text: z.string() }),
      allowedCallers: "rendererOnly",
      execute(args: { text: string }) {
        recordEffect("rendererOnlySecret", args);
        return "secret";
      },
    },
    {
      name: "gestureEffect",
      returnType: "void",
      schema: z.object({ source: z.string() }),
      allowedCallers: "rendererOnly",
      requiresUserActivation: true,
      execute(args: { source: string }) {
        recordEffect("gestureEffect", args);
      },
    },
  ];
}

function buildCatalogs(config: SlotConfig) {
  const kind = config.catalogs ?? "default";
  if (kind === "default") return undefined;
  const legacy = createPrometheusA2uiCatalog();
  const v1 = createPrometheusA2uiCatalog({ protocolVersion: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION });
  if (kind === "with-functions") {
    const functions = v1.functions as unknown as Map<string, unknown>;
    for (const entry of scenarioFunctions()) functions.set(entry.name, entry);
    return [legacy, v1];
  }
  const alt = createPrometheusA2uiCatalog({
    protocolVersion: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
    id: config.altCatalogId,
    components: ["Text"],
    functions: [],
  });
  return [legacy, v1, alt];
}

const anyContext = {
  parse: (input: unknown) => (input ?? {}) as Record<string, unknown>,
  safeParse: (input: unknown) => ({ success: true as const, data: (input ?? {}) as Record<string, unknown> }),
};

function buildPolicy(config: SlotConfig, slot: Pick<Slot, "executions">): { policy: A2uiActionPolicy; store?: ReturnType<typeof createGraphStore> } {
  const policy = config.policy ?? "deny-all";
  if (policy === "deny-all") return { policy: createDenyAllA2uiActionPolicy() };
  if (policy === "entity-graph") {
    const store = createGraphStore();
    return {
      store,
      policy: createEntityGraphA2uiActionPolicy({
        graphStore: store as never,
        entities: { Order: { actions: [ENTITY_GRAPH_A2UI_ACTIONS.upsert], fields: ["status"] } },
        authorize: ({ tenantId }) => tenantId === "tenant-a",
      }),
    };
  }
  return {
    policy: createA2uiActionPolicy({
      rules: policy.allow.map((name) => ({
        name,
        contextSchema: anyContext,
        authorize: () => true,
        execute: () => {
          slot.executions.push(name);
        },
      })),
    }),
  };
}

function replyMessage(functionCallId: string, reply: Reply): Json {
  const value = reply.repeat ? reply.repeat[0].repeat(reply.repeat[1]) : reply.value;
  return reply.mode === "rcActionResponse"
    ? { version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION, actionId: functionCallId, actionResponse: { value } }
    : { version: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION, agentFunctionResponse: { functionCallId, value } };
}

function slotOf(id: string): Slot {
  const slot = slots.get(id);
  if (!slot) throw new Error(`No slot ${id}`);
  return slot;
}

async function createSlot(id: string, config: SlotConfig): Promise<void> {
  if (slots.has(id)) throw new Error(`Slot ${id} already exists`);
  const root = document.getElementById("a2ui-v1-root");
  if (!root) throw new Error("Missing #a2ui-v1-root");
  const container = document.createElement("section");
  container.setAttribute("data-a2ui-v1-slot", id);
  root.append(container);

  const partial = {
    rendererMessages: [] as Json[],
    decisions: [] as Json[],
    envelopes: [] as Json[],
    faults: [] as Json[],
    resyncs: [] as Json[],
    surfaceErrors: [] as Json[],
    replyErrors: [] as Json[],
    executions: [] as string[],
    replies: new Map<string, Reply>(),
  };
  const { policy, store } = buildPolicy(config, partial);
  const catalogs = buildCatalogs(config);
  let runtimeRef: PrometheusA2uiRuntime | undefined;
  const runtime = createPrometheusA2uiRuntime({
    ...(catalogs ? { catalogs } : {}),
    actionPolicy: policy,
    ...(config.acceptReleaseCandidateInput ? { acceptReleaseCandidateInput: true } : {}),
    ...(config.limits ? { limits: config.limits } : {}),
    onActionDecision: (decision) => {
      partial.decisions.push({
        status: decision.status,
        name: decision.action?.name ?? null,
        sourceComponentId: decision.action?.sourceComponentId ?? null,
        ...(decision.status === "denied" ? { code: decision.code, reason: decision.reason } : {}),
      });
    },
    onActionEnvelope: (envelope) => {
      partial.envelopes.push({ actionId: envelope.actionId, surfaceId: envelope.surfaceId });
    },
    onProducerFault: (fault) => {
      partial.faults.push(json(fault));
    },
    onResyncNeeded: (request) => {
      partial.resyncs.push(json(request));
    },
    onRendererMessage: (message) => {
      const recorded = json(message);
      partial.rendererMessages.push(recorded);
      const call = recorded.callAgentFunction as Json | undefined;
      if (!call) return;
      const name = ((call.callFunction as Json | undefined)?.["@call"] ?? "") as string;
      const reply = partial.replies.get(name);
      if (!reply || typeof call.functionCallId !== "string") return;
      const answer = replyMessage(call.functionCallId, reply);
      setTimeout(() => {
        try {
          runtimeRef?.processMessages([answer]);
        } catch (cause) {
          partial.replyErrors.push({ call: name, ...serializeError(cause) });
        }
      }, 0);
    },
  });
  runtimeRef = runtime;
  runtime.processor.model.onSurfaceCreated.subscribe((surface) => {
    surface.onError.subscribe((error) => {
      const record = error as unknown as Json;
      partial.surfaceErrors.push({
        surfaceId: surface.id,
        code: typeof record.code === "string" ? record.code : null,
        message: typeof record.message === "string" ? record.message : String(error),
      });
    });
  });
  slots.set(id, { config, runtime, container, ...(store ? { store } : {}), ...partial });
  createRoot(container).render(
    createElement(PrometheusA2uiProvider, {
      runtime,
      children: createElement(PrometheusA2uiSurface, { surfaceId: config.surfaceId }),
    }),
  );
  await settleDom(container);
}

async function processMessages(id: string, messages: unknown[]): Promise<Json> {
  const slot = slotOf(id);
  let outcome: Json;
  try {
    slot.runtime.processMessages(messages);
    outcome = { ok: true };
  } catch (cause) {
    outcome = { ok: false, error: serializeError(cause) };
  }
  await settleDom(slot.container);
  return outcome;
}

async function processAgUiEvents(id: string, events: unknown[]): Promise<Json[]> {
  const slot = slotOf(id);
  const results: Json[] = [];
  for (const event of events) {
    const record = event as Json;
    try {
      const handled = slot.runtime.processAgUiEvent(event);
      results.push({ type: record.type ?? null, activityType: record.activityType ?? null, handled });
    } catch (cause) {
      results.push({ type: record.type ?? null, activityType: record.activityType ?? null, handled: false, error: serializeError(cause) });
    }
    await settleDom(slot.container);
  }
  return results;
}

function snapshot(id: string): Json {
  const slot = slotOf(id);
  const surface = slot.runtime.getSurface(slot.config.surfaceId) as
    | (object & { dataModel?: { get(path: string): unknown } })
    | undefined;
  return {
    surfaceId: slot.config.surfaceId,
    hasSurface: surface !== undefined,
    surfaceCount: slot.runtime.getSurfaces().length,
    hostCount: componentHosts(slot.container).length,
    text: deepText(slot.container),
    canonical: canonicalDom(slot.container),
    dataModel: surface?.dataModel ? json(surface.dataModel.get("/")) : null,
  };
}

function log(id: string): Json {
  const slot = slotOf(id);
  return json({
    rendererMessages: slot.rendererMessages,
    decisions: slot.decisions,
    envelopes: slot.envelopes,
    faults: slot.faults,
    resyncs: slot.resyncs,
    surfaceErrors: slot.surfaceErrors,
    replyErrors: slot.replyErrors,
    executions: slot.executions,
  });
}

async function callAgentFunction(id: string, call: Json, options: Json): Promise<Json> {
  const slot = slotOf(id);
  try {
    const value = await slot.runtime.callAgentFunction(slot.config.surfaceId, call as never, options as never);
    await settleDom(slot.container);
    return { ok: true, valueType: typeof value, valueLength: typeof value === "string" ? value.length : null, value: typeof value === "string" && value.length > 200 ? `${value.slice(0, 40)}…` : json(value) };
  } catch (cause) {
    await settleDom(slot.container);
    return { ok: false, error: serializeError(cause) };
  }
}

/** Tag the native button inside a component so the spec can click it with real (trusted) input. */
function tagButton(id: string, componentId: string): string | null {
  const slot = slotOf(id);
  const host = findComponentElement(slot.container, componentId);
  const button = host ? queryDeep(host, "button") : undefined;
  if (!button) return null;
  const token = `t${nextTarget++}`;
  button.setAttribute(TARGET_ATTRIBUTE, token);
  return `[${TARGET_ATTRIBUTE}="${token}"]`;
}

/**
 * Run a component's action outside any gesture, as the upstream conformance
 * harness does for `programmatic_invoke`: the official
 * `dataContext.resolveAction(action, { userActivation: false })`.
 */
async function invokeWithoutGesture(id: string, componentId: string): Promise<Json> {
  const slot = slotOf(id);
  const host = findComponentElement(slot.container, componentId) as ComponentElement | undefined;
  const surface = slot.runtime.getSurface(slot.config.surfaceId) as unknown as
    | { componentsModel?: { get(id: string): { properties?: Record<string, unknown> } | undefined } }
    | undefined;
  const action = surface?.componentsModel?.get(componentId)?.properties?.action;
  const dataContext = host?.context?.dataContext;
  if (!action || !dataContext) return { invoked: false, reason: "no action or data context" };
  try {
    await dataContext.resolveAction(action, { userActivation: false });
    await settleDom(slot.container);
    return { invoked: true, threw: false };
  } catch (cause) {
    await settleDom(slot.container);
    return { invoked: true, threw: true, error: serializeError(cause) };
  }
}

/** An untrusted DOM click from page script (no user activation). Informational only. */
async function syntheticClick(id: string, selector: string): Promise<Json> {
  const slot = slotOf(id);
  const token = /"([^"]+)"/.exec(selector)?.[1];
  const element = allElements(slot.container).find((candidate) => candidate.getAttribute(TARGET_ATTRIBUTE) === token);
  if (!(element instanceof HTMLElement)) return { clicked: false };
  element.click();
  await settleDom(slot.container);
  return { clicked: true };
}

async function settle(id: string): Promise<void> {
  await settleDom(slotOf(id).container);
}

function setReply(id: string, callName: string, reply: Reply): void {
  slotOf(id).replies.set(callName, reply);
}

function setLimits(id: string, overrides: Record<string, number>): Json {
  try {
    slotOf(id).runtime.setLimits(overrides);
    return { ok: true };
  } catch (cause) {
    return { ok: false, error: serializeError(cause) };
  }
}

function graphEntity(id: string, type: string, entityId: string): Json | null {
  const state = slotOf(id).store?.getState() as { entities?: Record<string, Record<string, unknown>> } | undefined;
  const entity = state?.entities?.[type]?.[entityId];
  return entity === undefined ? null : json(entity);
}

function constants(): Json {
  return {
    PROMETHEUS_A2UI_V1_CATALOG_ID,
    PROMETHEUS_A2UI_CATALOG_ID,
    PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
    PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
  };
}

const api = {
  createSlot,
  processMessages,
  processAgUiEvents,
  snapshot,
  log,
  callAgentFunction,
  tagButton,
  invokeWithoutGesture,
  syntheticClick,
  settle,
  setReply,
  setLimits,
  graphEntity,
  constants,
  setPhase: (next: string) => {
    phase = next;
  },
  effects: () => json(effects) as unknown as Effect[],
};

declare global {
  interface Window {
    __a2uiV1: typeof api;
  }
}

window.__a2uiV1 = api;
document.documentElement.dataset.a2uiV1Ready = "true";
