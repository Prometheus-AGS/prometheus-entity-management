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
 * 0d2fcf3714a7a3725ed994b2861ffdd7d1f995bd (performStepOperation).
 */

import { findComponentElement, queryAllDeep, queryDeep, type ComponentElement } from "./dom.js";
import type { AdapterStep, Instruction } from "./types.js";

/**
 * `user_input` and `user_gesture` must be real, trusted browser input: the
 * official `openUrl` checks `navigator.userActivation`, which only trusted
 * events set. So the page does not dispatch them. It tags the concrete control
 * and returns instructions that the spec performs with Playwright (`click`,
 * `fill`, `check`). `programmatic_invoke` runs here, outside any gesture, as
 * the upstream harness does (`dataContext.resolveAction(..., { userActivation: false })`).
 */

let nextToken = 0;

function tag(element: Element): string {
  const token = `t${nextToken++}`;
  element.setAttribute("data-a2ui-conformance-target", token);
  return `[data-a2ui-conformance-target="${token}"]`;
}

export interface OperationPlan {
  instructions: Instruction[];
  failures: string[];
}

interface ActionSurface {
  componentsModel?: { get(id: string): { properties?: Record<string, unknown> } | undefined };
}

function planInput(step: AdapterStep, element: ComponentElement): OperationPlan {
  const id = step.targetNode ?? "";
  const value = step.inputValue;
  const name = element.tagName.toLowerCase();
  const fail = (what: string): OperationPlan => ({ instructions: [], failures: [`user_input(${id}): no ${what} in <${name}>`] });

  if (name === "a2ui-checkbox" || typeof value === "boolean") {
    const box = queryDeep(element, 'input[type="checkbox"]');
    if (!box) return fail("checkbox input");
    return { instructions: [{ kind: value ? "check" : "uncheck", selector: tag(box), description: `set ${id} checked=${String(value)}` }], failures: [] };
  }
  if (name === "a2ui-choicepicker" || Array.isArray(value)) {
    const wanted = (Array.isArray(value) ? value : [value]).map(String);
    const options = queryAllDeep<HTMLInputElement>(element, "input.a2ui-option-input");
    if (options.length === 0) return fail("option inputs");
    const instructions: Instruction[] = [];
    for (const option of options) {
      const select = wanted.includes(option.value);
      if (option.type === "radio" ? select : option.checked !== select) {
        instructions.push({ kind: select ? "check" : "uncheck", selector: tag(option), description: `${select ? "select" : "clear"} ${id} option ${option.value}` });
      }
    }
    return { instructions, failures: [] };
  }
  if (name === "a2ui-tabs") {
    const index = Number(value ?? 0);
    const button = queryAllDeep(element, "button.a2ui-tab-button")[index];
    if (!button) return fail(`tab button ${index}`);
    return { instructions: [{ kind: "click", selector: tag(button), description: `select ${id} tab ${index}` }], failures: [] };
  }
  if (name === "a2ui-slider") {
    const range = queryDeep(element, 'input[type="range"]');
    if (!range) return fail("range input");
    return { instructions: [{ kind: "fill", selector: tag(range), value: String(value ?? 0), description: `set ${id} to ${String(value)}` }], failures: [] };
  }
  if (name === "a2ui-datetimeinput") {
    const raw = String(value ?? "");
    const [datePart = "", timePart = ""] = raw.includes("T") ? raw.split("T") : [raw, ""];
    const instructions: Instruction[] = [];
    const date = queryDeep(element, 'input[type="date"]');
    if (date && datePart) instructions.push({ kind: "fill", selector: tag(date), value: datePart.slice(0, 10), description: `set ${id} date` });
    const time = queryDeep(element, 'input[type="time"]');
    if (time && timePart) instructions.push({ kind: "fill", selector: tag(time), value: timePart.slice(0, 5), description: `set ${id} time` });
    return instructions.length > 0 ? { instructions, failures: [] } : fail("date or time input");
  }
  const text = queryDeep(element, "input, textarea");
  if (!text) return fail("input or textarea");
  return { instructions: [{ kind: "fill", selector: tag(text), value: String(value ?? ""), description: `type into ${id}` }], failures: [] };
}

async function invokeProgrammatically(
  step: AdapterStep,
  element: ComponentElement,
  surface: ActionSurface | undefined,
): Promise<OperationPlan> {
  const id = step.targetNode ?? "";
  const action = surface?.componentsModel?.get(id)?.properties?.action;
  const dataContext = element.context?.dataContext;
  if (!action || !dataContext) {
    return { instructions: [], failures: [`programmatic_invoke(${id}): no action or data context`] };
  }
  try {
    await dataContext.resolveAction(action, { userActivation: step.userActivation ?? false });
    return { instructions: [], failures: [] };
  } catch (cause) {
    return {
      instructions: [],
      failures: [`programmatic_invoke(${id}): resolveAction threw ${cause instanceof Error ? cause.message : String(cause)}`],
    };
  }
}

export async function planOperation(
  step: AdapterStep,
  container: Element,
  surface: unknown,
): Promise<OperationPlan> {
  if (!step.op || step.op === "process_messages" || step.op === "unmount_surface") {
    return { instructions: [], failures: [] };
  }
  const id = step.targetNode ?? "";
  const element = findComponentElement(container, id);
  if (!element) return { instructions: [], failures: [`${step.op}(${id}): no rendered component element`] };
  if (step.op === "user_input") return planInput(step, element);
  if (step.op === "user_gesture") {
    const button = queryDeep(element, "button");
    if (!button) return { instructions: [], failures: [`user_gesture(${id}): no button element`] };
    return { instructions: [{ kind: "click", selector: tag(button), description: `click ${id}` }], failures: [] };
  }
  return invokeProgrammatically(step, element, surface as ActionSurface | undefined);
}
