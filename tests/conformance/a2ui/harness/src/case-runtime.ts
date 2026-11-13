/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Adapted for @prometheus-ags/a2ui-react from the A2UI project's
 * typescript/renderers/react/tests/adapter_harness.tsx at commit
 * 0d2fcf3714a7a3725ed994b2861ffdd7d1f995bd (mountSurface, runStep).
 */

import { createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  PrometheusA2uiError,
  PrometheusA2uiProvider,
  PrometheusA2uiSurface,
  createA2uiActionPolicy,
  createPrometheusA2uiRuntime,
  type PrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
import { buildBasicCatalog, buildExtraCatalog } from "./catalogs.js";
import { Failures, deepEqual, show } from "./compare.js";
import { allElements, rootNodeOf, settleDom } from "./dom.js";
import { planOperation } from "./operations.js";
import type { AdapterStep, BeginStepResult, StartCaseInput, StepResult } from "./types.js";
import {
  assertAccessibility,
  assertDisposed,
  assertIdentity,
  assertViewTree,
  collectMountedNodes,
  mapNodesToElements,
  type IdentitySnapshot,
} from "./view-tree.js";

type Surface = NonNullable<ReturnType<PrometheusA2uiRuntime["getSurface"]>>;
type Recorded = Record<string, unknown>;

interface CaseState {
  input: StartCaseInput;
  runtime: PrometheusA2uiRuntime;
  root: Root;
  container: HTMLElement;
  surface?: Surface;
  unmounted: boolean;
  actions: Recorded[];
  errors: Recorded[];
  outbound: Recorded[];
  previous: IdentitySnapshot;
  lastCallId?: string;
}

let state: CaseState | undefined;

function current(): CaseState {
  if (!state) throw new Error("startCase must run before any step.");
  return state;
}

/** Event names a case may emit; every other action is denied by the package's own policy. */
function harnessPolicy(actionNames: readonly string[]) {
  const anyContext = {
    parse: (input: unknown) => (input ?? {}) as Record<string, unknown>,
    safeParse: (input: unknown) => ({ success: true as const, data: (input ?? {}) as Record<string, unknown> }),
  };
  return createA2uiActionPolicy({
    rules: actionNames.map((name) => ({
      name,
      contextSchema: anyContext,
      authorize: () => true,
      execute: () => undefined,
    })),
  });
}

export async function startCase(input: StartCaseInput): Promise<void> {
  if (state) throw new Error("A case is already running; reload the page between cases.");
  const container = document.getElementById("a2ui-conformance-root");
  if (!container) throw new Error("Missing #a2ui-conformance-root.");
  const outbound: Recorded[] = [];
  const catalogs = [buildBasicCatalog(input.basicCatalog), ...input.catalogs.map(buildExtraCatalog)];
  const runtime = createPrometheusA2uiRuntime({
    catalogs,
    actionPolicy: harnessPolicy(input.actionNames),
    onRendererMessage: (message) => {
      const envelope = structuredClone(message) as unknown as Recorded;
      outbound.push(envelope);
      const call = envelope.callAgentFunction as Recorded | undefined;
      if (call && typeof call.functionCallId === "string" && state) state.lastCallId = call.functionCallId;
    },
  });
  const root = createRoot(container);
  state = {
    input,
    runtime,
    root,
    container,
    unmounted: false,
    actions: [],
    errors: [],
    outbound,
    previous: { nodes: new Map(), elements: new Map() },
  };
  // The official surface model's event channels, reached through the package's public `processor`.
  runtime.processor.model.onSurfaceCreated.subscribe((surface) => {
    const caseState = current();
    caseState.surface = surface as Surface;
    surface.onAction.subscribe((action) => {
      caseState.actions.push(structuredClone(action) as unknown as Recorded);
    });
    surface.onError.subscribe((error) => {
      const record = error as unknown as Recorded;
      caseState.errors.push({
        code: record.code,
        message: record.message,
        surfaceId: typeof record.surfaceId === "string" ? record.surfaceId : surface.id,
        ...(typeof record.functionCallId === "string" ? { functionCallId: record.functionCallId } : {}),
        source: "surface.onError",
      });
    });
  });
  root.render(
    createElement(PrometheusA2uiProvider, {
      runtime,
      children: createElement(PrometheusA2uiSurface, { surfaceId: input.surfaceId }),
    }),
  );
  await settleDom(container);
}

function substituteLastCallId(value: unknown, lastCallId: string): unknown {
  if (Array.isArray(value)) return value.map((item) => substituteLastCallId(item, lastCallId));
  if (value && typeof value === "object") {
    const record = value as Recorded;
    if (record.$ref === "lastCallId" && Object.keys(record).length === 1) return lastCallId;
    return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, substituteLastCallId(item, lastCallId)]));
  }
  return value;
}

/** A refused batch: the package throws instead of reporting on the surface channel. */
function recordThrown(caseState: CaseState, cause: unknown): void {
  const error = cause as Partial<PrometheusA2uiError> & { message?: string };
  caseState.errors.push({
    code: error.protocolCode ?? error.code ?? "UNKNOWN",
    prometheusCode: error instanceof PrometheusA2uiError ? error.code : undefined,
    message: error.message ?? String(cause),
    surfaceId: caseState.input.surfaceId,
    source: "runtime.processMessages threw",
  });
}

export async function beginStep(step: AdapterStep): Promise<BeginStepResult> {
  const caseState = current();
  caseState.actions = [];
  caseState.errors = [];
  caseState.outbound.length = 0;
  const failures: string[] = [];
  if (step.messages && step.messages.length > 0) {
    const messages = substituteLastCallId(step.messages, caseState.lastCallId ?? "") as unknown[];
    try {
      caseState.runtime.processMessages(messages);
    } catch (cause) {
      recordThrown(caseState, cause);
    }
  }
  if (!caseState.unmounted) await settleDom(caseState.container);
  if (step.op === "unmount_surface") {
    caseState.root.unmount();
    caseState.unmounted = true;
    return { instructions: [], failures };
  }
  const plan = await planOperation(step, caseState.container, caseState.surface);
  return { instructions: plan.instructions, failures: [...failures, ...plan.failures] };
}

export async function settle(): Promise<void> {
  const caseState = current();
  if (!caseState.unmounted) await settleDom(caseState.container);
}

function assertList(
  failures: Failures,
  label: string,
  actual: Recorded[],
  expected: Recorded[] | undefined,
  match: (actual: Recorded, expected: Recorded, where: string) => void,
): void {
  if (expected === undefined) return;
  if (!failures.equal(actual.length, expected.length, `${label} length (actual ${show(actual)})`)) return;
  expected.forEach((item, index) => match(actual[index] ?? {}, item, `${label}[${index}]`));
}

function assertSurfaceRemoved(caseState: CaseState, failures: Failures): void {
  failures.check(caseState.runtime.getSurface(caseState.input.surfaceId) === undefined, "expectSurfaceRemoved: the runtime still holds the surface");
  const disposed = (caseState.surface as unknown as { disposed?: unknown } | undefined)?.disposed;
  if (typeof disposed === "boolean") failures.equal(disposed, true, "expectSurfaceRemoved: surface.disposed");
  const mounted = allElements(caseState.container).filter((element) => (element as { node?: unknown }).node);
  failures.check(mounted.length === 0, `expectSurfaceRemoved: ${mounted.length} component element(s) still mounted`);
}

function assertThemeAbsent(caseState: CaseState, failures: Failures): void {
  const surface = caseState.surface as unknown as { theme?: unknown } | undefined;
  failures.equal(surface?.theme ?? {}, {}, "expectThemeAbsent: surface.theme");
  for (const element of allElements(caseState.container)) {
    const html = element as HTMLElement;
    failures.equal(html.style?.getPropertyValue("--a2ui-color-primary") ?? "", "", "expectThemeAbsent: --a2ui-color-primary");
    const inline = (element.getAttribute("style") ?? "").toLowerCase();
    failures.check(!inline.includes("#ff00aa") && !inline.includes("255, 0, 170"), "expectThemeAbsent: theme colour applied inline");
  }
}

export async function finishStep(step: AdapterStep): Promise<StepResult> {
  const caseState = current();
  if (!caseState.unmounted) await settleDom(caseState.container);
  const failures = new Failures();
  const unsupported: string[] = [];
  const rootNode = caseState.unmounted ? undefined : rootNodeOf(caseState.container);
  const nodes = collectMountedNodes(rootNode);
  const snapshot: IdentitySnapshot = {
    nodes,
    elements: caseState.unmounted ? new Map() : mapNodesToElements(caseState.container, nodes),
  };
  if (step.expectViewTree) {
    assertViewTree(rootNode, step.expectViewTree, caseState.surface as never, caseState.container, failures);
  }
  for (const [id, expected] of Object.entries(step.expectAccessibilityTree ?? {})) {
    assertAccessibility(caseState.container, id, expected, failures);
  }
  assertList(failures, "expectActions", caseState.actions, step.expectActions as Recorded[] | undefined, (actual, expected, where) => {
    failures.equal(actual.name, expected.name, `${where}.name`);
    for (const key of ["surfaceId", "sourceComponentId", "context"]) {
      if (expected[key] !== undefined) failures.equal(actual[key], expected[key], `${where}.${key}`);
    }
  });
  assertList(failures, "expectErrors", caseState.errors, step.expectErrors as Recorded[] | undefined, (actual, expected, where) => {
    for (const key of ["code", "surfaceId"]) {
      if (expected[key] !== undefined) failures.equal(actual[key], expected[key], `${where}.${key}`);
    }
    if (typeof expected.message === "string") {
      failures.check(String(actual.message ?? "").includes(expected.message), `${where}.message: ${show(actual.message)} lacks ${show(expected.message)}`);
    }
  });
  assertIdentity(caseState.previous, snapshot, step.expectSameViewIdentity, step.expectNewViewIdentity, failures);
  if (step.expectDisposedNodes) assertDisposed(caseState.previous, snapshot, step.expectDisposedNodes, failures);
  if (step.expectSurfaceRemoved) assertSurfaceRemoved(caseState, failures);
  if (step.expectDataModel !== undefined) {
    const surface = caseState.runtime.getSurface(caseState.input.surfaceId) ?? caseState.surface;
    const model = (surface as unknown as { dataModel?: { get(path: string): unknown } } | undefined)?.dataModel;
    failures.check(deepEqual(model?.get("/"), step.expectDataModel), `expectDataModel: expected ${show(step.expectDataModel)}, got ${show(model?.get("/"))}`);
  }
  if (step.expectThemeAbsent) assertThemeAbsent(caseState, failures);
  if (step.expectActiveSubscriptions !== undefined) unsupported.push("expectActiveSubscriptions");
  caseState.previous = snapshot;
  return { failures: failures.items, unsupported, outbound: caseState.outbound.map((item) => structuredClone(item)) };
}
