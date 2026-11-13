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
 * 0d2fcf3714a7a3725ed994b2861ffdd7d1f995bd (view tree, identity and
 * accessibility assertions).
 */

import { Failures } from "./compare.js";
import {
  allElements,
  findComponentElement,
  findElementForNode,
  isNodeLike,
  peekProps,
  unwrapBinding,
  type NodeLike,
} from "./dom.js";
import type { ExpectedAccessibilityNode, ExpectedViewNode } from "./types.js";

const RESERVED_VIEW_KEYS = new Set([
  "id",
  "type",
  "state",
  "occupiesLayout",
  "isValid",
  "validationErrors",
  "validationResults",
  "hints",
  "children",
]);

interface SurfaceComponents {
  componentsModel?: { get(id: string): { type?: string } | undefined };
}

/** Direct child nodes as the upstream harness reads them, including the active tab and an open modal. */
function directChildNodes(node: NodeLike, container: Element): NodeLike[] {
  const props = peekProps(node);
  if (Array.isArray(props.children)) return props.children.filter(isNodeLike);
  if (isNodeLike(props.child)) return [props.child];
  if (Array.isArray(props.tabs)) {
    const element = findElementForNode(container, node) as unknown as { activeIndex?: number } | undefined;
    const tab = (props.tabs as Array<{ child?: unknown }>)[element?.activeIndex ?? 0];
    return tab && isNodeLike(tab.child) ? [tab.child] : [];
  }
  if (isNodeLike(props.trigger)) {
    const children: NodeLike[] = [props.trigger];
    const element = findElementForNode(container, node);
    const isOpen =
      (element as unknown as { isOpen?: boolean } | undefined)?.isOpen === true ||
      Boolean(element && allElements(element).some((child) => child.matches(".a2ui-modal-content")));
    if (isOpen && isNodeLike(props.content)) children.push(props.content);
    return children;
  }
  return [];
}

/** Mounted nodes keyed by node path (`root/children/0`) and by component id. */
export function collectMountedNodes(root: NodeLike | undefined): Map<string, NodeLike> {
  const nodes = new Map<string, NodeLike>();
  if (!root) return nodes;
  const visit = (node: NodeLike, path: string): void => {
    nodes.set(path, node);
    nodes.set(node.componentId, node);
    const props = peekProps(node);
    if (Array.isArray(props.children)) {
      props.children.forEach((child, index) => {
        if (isNodeLike(child)) visit(child, `${path}/children/${index}`);
      });
    } else if (isNodeLike(props.child)) {
      visit(props.child, `${path}/child`);
      visit(props.child, `${path}/children/0`);
    }
  };
  visit(root, "root");
  return nodes;
}

export function mapNodesToElements(container: Element, nodes: Map<string, NodeLike>): Map<string, Element> {
  const result = new Map<string, Element>();
  const elements = allElements(container);
  for (const [path, node] of nodes) {
    const match = elements.find((element) => (element as { node?: unknown }).node === node);
    if (match) result.set(path, match);
  }
  return result;
}

function nodeType(node: NodeLike, surface: SurfaceComponents | undefined): string {
  if (node.state === "cyclic" && node.type === "Placeholder") {
    return surface?.componentsModel?.get(node.componentId)?.type ?? node.type;
  }
  return node.type;
}

function assertNodeProps(node: NodeLike, expected: ExpectedViewNode, path: string, failures: Failures): void {
  const props = peekProps(node);
  if (expected.isValid !== undefined) failures.equal(unwrapBinding(props.isValid), expected.isValid, `${path}.isValid`);
  if (expected.validationErrors !== undefined) {
    failures.equal(unwrapBinding(props.validationErrors), expected.validationErrors, `${path}.validationErrors`);
  }
  if (expected.validationResults !== undefined) {
    failures.equal(unwrapBinding(props.validationResults), expected.validationResults, `${path}.validationResults`);
  }
  for (const [key, value] of Object.entries(expected)) {
    if (!RESERVED_VIEW_KEYS.has(key)) failures.equal(unwrapBinding(props[key]), value, `${path}.${key}`);
  }
}

export function assertViewTree(
  node: NodeLike | undefined,
  expected: ExpectedViewNode,
  surface: SurfaceComponents | undefined,
  container: Element,
  failures: Failures,
  path = "root",
): void {
  if (!failures.check(node !== undefined, `expectViewTree: no node at ${path}`)) return;
  const actual = node as NodeLike;
  if (expected.id !== undefined) failures.equal(actual.componentId, expected.id, `${path}.id`);
  if (expected.type !== undefined) failures.equal(nodeType(actual, surface), expected.type, `${path}.type`);
  if (expected.state !== undefined) failures.equal(actual.state, expected.state, `${path}.state`);
  const element = findElementForNode(container, actual);
  if (expected.occupiesLayout !== undefined) {
    const occupies = element !== undefined && !element.hidden && getComputedStyle(element).display !== "none";
    failures.equal(occupies, expected.occupiesLayout, `${path}.occupiesLayout`);
  }
  if (actual.state === "resolved") {
    if (failures.check(element !== undefined, `expectViewTree: no mounted DOM element for ${path}`)) {
      const text = element?.textContent ?? "";
      for (const key of ["text", "badgeText"] as const) {
        const expectedText = expected[key];
        if (typeof expectedText === "string") {
          failures.check(text.includes(expectedText), `${path}.${key}: rendered text ${JSON.stringify(text)} lacks ${JSON.stringify(expectedText)}`);
        }
      }
      for (const hint of expected.hints ?? []) {
        failures.check(text.includes(hint), `${path}.hints: rendered text ${JSON.stringify(text)} lacks ${JSON.stringify(hint)}`);
      }
    }
  }
  assertNodeProps(actual, expected, path, failures);
  if (expected.children !== undefined) {
    const children = directChildNodes(actual, container);
    failures.equal(children.length, expected.children.length, `${path}.children length`);
    expected.children.forEach((child, index) => {
      assertViewTree(children[index], child, surface, container, failures, `${path}/children/${index}`);
    });
  }
}

export interface IdentitySnapshot {
  nodes: Map<string, NodeLike>;
  elements: Map<string, Element>;
}

export function assertIdentity(
  previous: IdentitySnapshot,
  current: IdentitySnapshot,
  same: string[] | undefined,
  fresh: string[] | undefined,
  failures: Failures,
): void {
  for (const path of same ?? []) {
    const node = current.nodes.get(path);
    const element = current.elements.get(path);
    failures.check(node !== undefined, `expectSameViewIdentity: no node at ${path}`);
    failures.check(node === previous.nodes.get(path), `expectSameViewIdentity: node at ${path} was replaced`);
    failures.check(previous.elements.get(path) !== undefined, `expectSameViewIdentity: no previous DOM element at ${path}`);
    failures.check(element !== undefined && element === previous.elements.get(path), `expectSameViewIdentity: DOM element at ${path} was replaced`);
  }
  for (const path of fresh ?? []) {
    const node = current.nodes.get(path);
    const element = current.elements.get(path);
    failures.check(previous.nodes.get(path) !== undefined, `expectNewViewIdentity: no previous node at ${path}`);
    failures.check(node !== undefined, `expectNewViewIdentity: no node at ${path}`);
    failures.check(node !== previous.nodes.get(path), `expectNewViewIdentity: node at ${path} kept its identity`);
    failures.check(previous.elements.get(path) !== undefined && element !== undefined, `expectNewViewIdentity: DOM element missing at ${path}`);
    failures.check(element !== previous.elements.get(path), `expectNewViewIdentity: DOM element at ${path} kept its identity`);
  }
}

export function assertDisposed(
  previous: IdentitySnapshot,
  current: IdentitySnapshot,
  ids: string[],
  failures: Failures,
): void {
  for (const id of ids) {
    const node = previous.nodes.get(id);
    if (!failures.check(node !== undefined, `expectDisposedNodes: no previous node ${id}`)) continue;
    failures.equal(node?.disposed, true, `expectDisposedNodes: ${id}.disposed`);
    failures.check(!current.nodes.has(id), `expectDisposedNodes: ${id} is still mounted`);
  }
}

function isNestedComponent(host: Element, candidate: Element): boolean {
  let current: Element | null = candidate;
  while (current && current !== host) {
    const record = current as unknown as { context?: unknown; node?: unknown };
    if (record.context || record.node) return true;
    current = current.parentElement;
  }
  return false;
}

function ownAttribute(element: Element, name: string): string | undefined {
  const value = element.getAttribute(name);
  if (value) return value;
  for (const descendant of allElements(element)) {
    if (!descendant.hasAttribute(name) || isNestedComponent(element, descendant)) continue;
    if (descendant.matches(".a2ui-filter-input, .a2ui-modal-close")) continue;
    const inner = descendant.getAttribute(name);
    if (inner) return inner;
  }
  return undefined;
}

function accessibleLabel(element: Element): string | undefined {
  return (
    ownAttribute(element, "aria-label") ??
    (element.querySelector("button")?.textContent?.trim() ||
      element.querySelector("label")?.textContent?.trim() ||
      element.textContent?.trim() ||
      undefined)
  );
}

function semanticRole(element: Element): string | undefined {
  const explicit = element.getAttribute("role");
  if (explicit) return explicit;
  if (element.querySelector("button")) return "button";
  if (element.querySelector('input[type="checkbox"]')) return "checkbox";
  if (element.querySelector('input[type="radio"]')) return "radiogroup";
  const text = element.querySelector('input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea');
  return text ? "textbox" : undefined;
}

function checkedState(element: Element): boolean | undefined {
  const aria = element.getAttribute("aria-checked");
  if (aria === "true" || aria === "false") return aria === "true";
  const box = element.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
  return box ? box.checked : undefined;
}

export function assertAccessibility(
  container: Element,
  componentId: string,
  expected: ExpectedAccessibilityNode,
  failures: Failures,
): void {
  const element = findComponentElement(container, componentId);
  const where = `accessibility(${componentId})`;
  if (!failures.check(element !== undefined, `${where}: no rendered element`)) return;
  const target = element as Element;
  if (expected.label !== undefined) failures.equal(accessibleLabel(target), expected.label, `${where}.label`);
  if (expected.description !== undefined) {
    failures.equal(ownAttribute(target, "aria-description"), expected.description, `${where}.description`);
  }
  if (expected.live !== undefined) failures.equal(target.getAttribute("aria-live"), expected.live, `${where}.live`);
  if (expected.hidden !== undefined) {
    failures.equal(target.getAttribute("aria-hidden"), String(expected.hidden), `${where}.hidden`);
  }
  if (expected.role !== undefined) failures.equal(semanticRole(target), expected.role, `${where}.role`);
  if (expected.checked !== undefined) failures.equal(checkedState(target), expected.checked, `${where}.checked`);
}
