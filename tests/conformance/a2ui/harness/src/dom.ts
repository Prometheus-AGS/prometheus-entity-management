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
 * 0d2fcf3714a7a3725ed994b2861ffdd7d1f995bd (DOM and node lookup).
 */

/**
 * The page reaches the rendered tree only through the DOM. The renderer bundled
 * in the built package sets `node` (the official ComponentNode) and `context`
 * on every component host element; nothing here imports `@a2ui/*`, so the
 * official helpers (`peekValue`, `isComponentNode`, `ResolvedBinding`) are
 * replaced by structural checks of the same objects.
 */

export interface NodeLike {
  componentId: string;
  type: string;
  state: string;
  dataPath?: string;
  disposed?: boolean;
  props: unknown;
}

export interface ComponentElement extends HTMLElement {
  node?: NodeLike;
  context?: {
    componentModel?: { id?: string };
    dataContext?: {
      resolveAction(action: unknown, options: { userActivation: boolean }): unknown;
    };
  };
}

export function isNodeLike(value: unknown): value is NodeLike {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.componentId === "string" &&
    typeof record.type === "string" &&
    typeof record.state === "string" &&
    "props" in record
  );
}

/** The official `peekValue`: a signal's value without subscribing. */
export function peekProps(node: NodeLike): Record<string, unknown> {
  const signal = node.props as { peek?: () => unknown; value?: unknown };
  const value = typeof signal.peek === "function" ? signal.peek() : signal.value;
  return (value ?? {}) as Record<string, unknown>;
}

/** A resolved binding (`ResolvedBinding`/`WritableBinding`): a class instance carrying `value`. */
function isBinding(value: unknown): value is { value: unknown } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto !== null && proto !== Object.prototype && "value" in value && !isNodeLike(value);
}

export function unwrapBinding(value: unknown): unknown {
  if (isBinding(value)) return unwrapBinding(value.value);
  if (Array.isArray(value)) return value.map(unwrapBinding);
  return value;
}

/** Every element under `root`, descending into open shadow roots. */
export function allElements(root: Element | ShadowRoot): Element[] {
  const result: Element[] = [];
  const visit = (scope: Element | ShadowRoot): void => {
    for (const element of Array.from(scope.querySelectorAll("*"))) {
      result.push(element);
      if (element.shadowRoot) visit(element.shadowRoot);
    }
  };
  visit(root);
  return result;
}

export function queryDeep<T extends Element>(root: Element, selector: string): T | null {
  return (allElements(root).find((element) => element.matches(selector)) as T | undefined) ?? null;
}

export function queryAllDeep<T extends Element>(root: Element, selector: string): T[] {
  return allElements(root).filter((element) => element.matches(selector)) as T[];
}

export function findComponentElement(container: Element, componentId: string): ComponentElement | undefined {
  return allElements(container).find((candidate) => {
    const element = candidate as ComponentElement;
    return element.context?.componentModel?.id === componentId || element.node?.componentId === componentId;
  }) as ComponentElement | undefined;
}

export function findElementForNode(container: Element, node: NodeLike): ComponentElement | undefined {
  return allElements(container).find((candidate) => (candidate as ComponentElement).node === node) as
    | ComponentElement
    | undefined;
}

/** The surface's root node: the first component host element in document order. */
export function rootNodeOf(container: Element): NodeLike | undefined {
  const host = allElements(container).find((candidate) => isNodeLike((candidate as ComponentElement).node));
  return (host as ComponentElement | undefined)?.node;
}

/** Wait for React commits, Lit updates and queued microtasks to settle. */
export async function settleDom(container: Element): Promise<void> {
  for (let pass = 0; pass < 3; pass++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
    for (const element of allElements(container)) {
      const update = (element as { updateComplete?: Promise<unknown> }).updateComplete;
      if (update && typeof update.then === "function") await update;
    }
  }
}
