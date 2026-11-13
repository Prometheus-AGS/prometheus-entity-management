import { createElement, type FC, type ReactNode } from "react";

/**
 * A2UI 1.0 requires renderers to plumb a component's `@accessibility`
 * (`label`, `description`, `live`, `hidden`) into the platform's accessibility
 * API (WAI-ARIA on the web). The official Custom Element basic catalog does this
 * on its host elements; `@a2ui/react` 0.15.0 does not do it for React component
 * implementations. This applies it to components built with
 * `createPrometheusA2uiComponent`, matching the official mapping: a host with
 * `role="group"` and `display: contents`, so layout is unchanged.
 */

type AriaAttributes = {
  role: "group";
  "aria-label"?: string;
  "aria-description"?: string;
  "aria-live"?: string;
  "aria-hidden"?: "true" | "false";
};

function hasValue(value: unknown): value is string | number {
  return (typeof value === "string" && value.length > 0) || typeof value === "number";
}

/** The ARIA attributes for a resolved `accessibility` property, or `undefined` if it sets none. */
export function ariaAttributesOf(accessibility: unknown): AriaAttributes | undefined {
  if (accessibility === null || typeof accessibility !== "object") return undefined;
  const a11y = accessibility as Record<string, unknown>;
  const attributes: AriaAttributes = { role: "group" };
  let any = false;
  if (hasValue(a11y.label)) {
    attributes["aria-label"] = String(a11y.label);
    any = true;
  }
  if (hasValue(a11y.description)) {
    attributes["aria-description"] = String(a11y.description);
    any = true;
  }
  if (hasValue(a11y.live)) {
    attributes["aria-live"] = String(a11y.live);
    any = true;
  }
  if (typeof a11y.hidden === "boolean") {
    attributes["aria-hidden"] = a11y.hidden ? "true" : "false";
    any = true;
  }
  return any ? attributes : undefined;
}

/** Wrap a render function so its output carries the component's ARIA attributes. */
export function withAccessibility<Props extends { props: Record<string, unknown> }>(
  render: FC<Props>,
): FC<Props> {
  const Accessible: FC<Props> = (renderProps) => {
    const content: ReactNode = createElement(render, renderProps);
    const attributes = ariaAttributesOf(renderProps.props.accessibility);
    if (!attributes) return content;
    return createElement("div", { ...attributes, style: { display: "contents" } }, content);
  };
  Accessible.displayName = `PrometheusA2uiAccessible(${render.displayName ?? render.name ?? "Component"})`;
  return Accessible;
}
