/**
 * DOM observation for the A2UI 1.0 acceptance page. The page reaches the
 * rendered tree only through the DOM, as an application would; nothing here
 * imports `@a2ui/*`. The renderer bundled in the built package sets `node` (the
 * official ComponentNode) and `context` on every component host element.
 */

export interface ComponentElement extends HTMLElement {
  node?: { componentId?: unknown; type?: unknown; state?: unknown; props?: unknown };
  context?: {
    componentModel?: { id?: string };
    dataContext?: { resolveAction(action: unknown, options: { userActivation: boolean }): unknown };
  };
}

/** Attributes whose value is another element's id; ids differ between renders. */
const ID_REFERENCE_ATTRIBUTES = new Set([
  "for",
  "list",
  "headers",
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-owns",
  "aria-activedescendant",
  "aria-errormessage",
  "aria-details",
]);
/** React `useId` values, whichever spelling the React build uses. */
const REACT_ID = /(?::|«|_)r[0-9a-z]+(?::|»|_)/g;
export const TARGET_ATTRIBUTE = "data-a2ui-v1-target";

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

export function queryDeep(root: Element, selector: string): Element | undefined {
  return allElements(root).find((element) => element.matches(selector));
}

function isComponentHost(element: Element): boolean {
  const node = (element as ComponentElement).node;
  return typeof node === "object" && node !== null && typeof node.componentId === "string";
}

/** Component host elements currently mounted under `root`. */
export function componentHosts(root: Element): ComponentElement[] {
  return allElements(root).filter(isComponentHost) as ComponentElement[];
}

export function findComponentElement(root: Element, componentId: string): ComponentElement | undefined {
  return allElements(root).find((candidate) => {
    const element = candidate as ComponentElement;
    return element.context?.componentModel?.id === componentId || element.node?.componentId === componentId;
  }) as ComponentElement | undefined;
}

/**
 * A canonical, render-independent serialization of the tree under `root`:
 * elements (tag and sorted attributes), non-blank text, and open shadow roots.
 * Comments (Lit part markers), `id` values, id references, React ids and this
 * page's own target tags are left out, because they differ between two renders
 * of the same surface. Two slots holding the same surface serialize identically.
 */
export function canonicalDom(root: Element): string {
  const lines: string[] = [];
  const visit = (node: Node, depth: number): void => {
    const indent = "  ".repeat(depth);
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text) lines.push(`${indent}#text ${JSON.stringify(text)}`);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    const attributes = Array.from(element.attributes)
      .filter((attribute) => attribute.name !== "id" && attribute.name !== TARGET_ATTRIBUTE)
      .map((attribute) => {
        const value = ID_REFERENCE_ATTRIBUTES.has(attribute.name)
          ? "#ref"
          : attribute.value.replace(REACT_ID, "<react-id>");
        return `${attribute.name}=${JSON.stringify(value)}`;
      })
      .sort();
    lines.push(`${indent}<${tag}${attributes.length > 0 ? ` ${attributes.join(" ")}` : ""}>`);
    if (tag === "style" || tag === "script") return;
    if (element.shadowRoot) {
      lines.push(`${indent}  #shadow-root`);
      for (const child of Array.from(element.shadowRoot.childNodes)) visit(child, depth + 2);
    }
    for (const child of Array.from(element.childNodes)) visit(child, depth + 1);
  };
  for (const child of Array.from(root.childNodes)) visit(child, 0);
  return lines.join("\n");
}

/** Visible text under `root` in document order, including open shadow roots. */
export function deepText(root: Element): string {
  const parts: string[] = [];
  const visit = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text) parts.push(text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    if (tag === "style" || tag === "script") return;
    if (element.shadowRoot) for (const child of Array.from(element.shadowRoot.childNodes)) visit(child);
    for (const child of Array.from(element.childNodes)) visit(child);
  };
  visit(root);
  return parts.join(" ");
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
