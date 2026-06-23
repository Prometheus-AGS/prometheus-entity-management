/**
 * fragment-renderer.ts
 *
 * Auto-renderer: when an entity type has no registered renderer,
 * produce a sensible `<dl>` definition-list fragment from the SDL IR.
 *
 * Also exports `renderFragment` — the orchestrator that calls the correct
 * renderer and wraps the result in the HTMX OOB-swap envelope.
 */

import type { IrEntity } from "@prometheus-ags/entity-graph-sdl";
import { escapeHtml } from "@prometheus-ags/entity-graph-core";
import type { FragmentRenderContext, FragmentRenderer } from "./types.js";

// ── CSS id-selector escape (Node-safe, no browser CSS API needed) ─────────────

/**
 * Minimal CSS ident escape for use in `#id` selectors.
 * Replaces any character that is not ASCII alphanumeric, hyphen, or underscore
 * with an underscore so the result is always a valid CSS identifier.
 *
 * This is intentionally conservative — HTMX/idiomorph only needs a stable,
 * unique string that matches the `id` attribute on the rendered element.
 */
function cssEscape(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

// ── Auto-renderer ─────────────────────────────────────────────────────────────

/**
 * Produce a `<dl>` list of field:value pairs from an SDL IR entity definition.
 * The root element carries an `id` attribute so HTMX idiomorph can target it.
 */
export function autoRenderEntity(ctx: FragmentRenderContext): string {
  const { entityType, entityId, entity, ir } = ctx;
  const safeId = escapeHtml(`${entityType}-${entityId}`);
  const rows = ir.fields
    .filter((f) => !f.auto || entity[f.name] !== undefined)
    .map((f) => {
      const label = escapeHtml(humanizeField(f.name));
      const value = formatValue(entity[f.name], f.type);
      return `  <div class="eg-field">\n    <dt>${label}</dt>\n    <dd>${value}</dd>\n  </div>`;
    })
    .join("\n");

  return `<dl id="${safeId}" class="eg-entity" data-entity-type="${escapeHtml(entityType)}" data-entity-id="${escapeHtml(entityId)}">\n${rows}\n</dl>`;
}

function humanizeField(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(v: unknown, type: string): string {
  if (v === null || v === undefined) return '<span class="eg-null">—</span>';
  if (type === "boolean") return `<span class="eg-bool eg-bool--${String(v)}">${v ? "Yes" : "No"}</span>`;
  if (type === "datetime" || type === "date") {
    const d = new Date(String(v));
    if (!Number.isNaN(d.getTime())) {
      return `<time datetime="${d.toISOString()}">${escapeHtml(d.toLocaleString())}</time>`;
    }
  }
  if (type === "json") {
    return `<code class="eg-json">${escapeHtml(JSON.stringify(v, null, 2))}</code>`;
  }
  return `<span>${escapeHtml(String(v))}</span>`;
}

// ── OOB swap envelope ─────────────────────────────────────────────────────────

/**
 * Wrap an HTML fragment in an HTMX OOB swap `<div>`.
 *
 * HTMX processes `hx-swap-oob` fragments that arrive anywhere inside an SSE
 * event body. By using `morph` the fragment is diffed in place; `outerHTML`
 * replaces the target wholesale.
 *
 * @see https://htmx.org/attributes/hx-swap-oob/
 */
export function wrapOobFragment(
  inner: string,
  targetSelector: string,
  swapStrategy: string
): string {
  const oobValue =
    swapStrategy === "outerHTML" || swapStrategy === "innerHTML"
      ? `${swapStrategy}:${targetSelector}`
      : `morph:${targetSelector}`;
  return `<div hx-swap-oob="${escapeHtml(oobValue)}">${inner}</div>`;
}

// ── Orchestrator ──────────────────────────────────────────────────────────────

export interface RenderFragmentOptions {
  ctx: FragmentRenderContext;
  renderer: FragmentRenderer | undefined;
  autoRender: boolean;
  swapStrategy: string;
  ir: IrEntity;
}

/**
 * Run the correct renderer (custom or auto) and return the SSE-ready HTML
 * string, or `null` to suppress the event.
 */
export async function renderFragment(opts: RenderFragmentOptions): Promise<string | null> {
  const { ctx, renderer, autoRender, swapStrategy, ir } = opts;
  let inner: string | null = null;

  if (renderer) {
    inner = await renderer(ctx);
  } else if (autoRender) {
    inner = autoRenderEntity({ ...ctx, ir });
  }

  if (inner === null) return null;

  // Build a CSS-safe selector from entity type + id.
  const targetId = `${ctx.entityType}-${ctx.entityId}`;
  const selector = `#${cssEscape(targetId)}`;
  return wrapOobFragment(inner, selector, swapStrategy);
}
