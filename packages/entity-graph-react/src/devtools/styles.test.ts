import { describe, expect, it } from "vitest";

import { ENTITY_GRAPH_DEVTOOLS_STYLES as SHEET } from "./styles";

/**
 * Stylesheet contract for the "Instrument Dark" inspector refinement.
 *
 * The sheet is a string injected into a Shadow DOM, so jsdom never applies it. These tests parse
 * the string and assert the token, scale, hit-target, layout, contrast and motion contracts that
 * the refinement commits to (docs/devtools-design-notes.md §2 and §4).
 */

interface Rule {
  selector: string;
  body: string;
  /** Enclosing at-rule preludes, outermost first (e.g. ["@container (width < 640px)"]). */
  context: string[];
}

/** Minimal CSS splitter: top-level rules plus rules nested inside at-rules. */
function parseRules(css: string, context: string[] = []): Rule[] {
  const rules: Rule[] = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    const prelude = css.slice(i, open).trim();
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth += 1;
      else if (css[j] === "}") depth -= 1;
      j += 1;
    }
    const body = css.slice(open + 1, j - 1);
    if (prelude.startsWith("@")) {
      if (prelude.startsWith("@keyframes")) rules.push({ selector: prelude, body, context });
      else rules.push(...parseRules(body, [...context, prelude]));
    } else {
      rules.push({ selector: prelude, body, context });
    }
    i = j;
  }
  return rules;
}

const RULES = parseRules(SHEET.replace(/\/\*[\s\S]*?\*\//g, ""));
const HOST_RULE = RULES.find((rule) => rule.selector === ":host" && rule.context.length === 0);
const OUTSIDE_HOST = SHEET.replace(HOST_RULE?.body ?? "", "");

function declarations(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of body.split(";")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

/** Rules whose comma-separated selector list contains `selector` exactly. */
function rulesFor(selector: string, predicate: (rule: Rule) => boolean = () => true): Rule[] {
  return RULES.filter(
    (rule) => rule.selector.split(",").map((s) => s.trim()).includes(selector) && predicate(rule),
  );
}

function px(value: string | undefined): number | undefined {
  const match = value?.match(/^(\d+(?:\.\d+)?)px$/);
  return match ? Number(match[1]) : undefined;
}

function maxDeclared(selector: string, property: string, predicate: (rule: Rule) => boolean): number {
  const values = rulesFor(selector, predicate)
    .map((rule) => px(declarations(rule.body)[property]))
    .filter((value): value is number => value !== undefined);
  return values.length ? Math.max(...values) : 0;
}

// ---------- WCAG 2.x contrast ----------

function channel(hex: string, offset: number): number {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  return 0.2126 * channel(h, 0) + 0.7152 * channel(h, 2) + 0.0722 * channel(h, 4);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `--pem-<name>` → fallback hex as declared in the :host token block. */
function tokenHex(name: string): string {
  const host = HOST_RULE?.body ?? "";
  const match = host.match(new RegExp(`--pem-${name}\\s*:\\s*var\\([^;]*?(#[0-9a-fA-F]{6})\\)`));
  if (!match) throw new Error(`token --pem-${name} has no hex fallback in :host`);
  return match[1].toLowerCase();
}

const TOKENS: Record<string, string> = {
  shell: "#0d1117",
  surface: "#161b22",
  elevated: "#1c2333",
  text: "#e6edf3",
  muted: "#8b949e",
  code: "#cdd9e5",
  accent: "#f0a500",
  add: "#3fb950",
  mod: "#d29922",
  del: "#f85149",
  line: "#30363d",
  focus: "#f0a500",
};

const ALLOWED_FONT_SIZES = [10, 11, 12, 13, 15, 18, 24];
const ALLOWED_FONT_WEIGHTS = [400, 500, 600, 700];
const SPACING_SCALE = [0, 2, 4, 6, 8, 12, 16, 20, 24];

const INTERACTIVE = [
  ".pem-panel-toolbar button",
  ".pem-launcher-settings",
  ".pem-primary-action",
  ".pem-secondary-action",
  ".pem-detail-actions button",
  ".pem-time-travel-controls button",
  ".pem-rail-collapse",
  ".pem-rail-restore",
  ".pem-filter-row button",
  ".pem-pause",
  ".pem-workspace-tabs button",
  ".pem-value-tabs button",
  ".pem-shell-status > button",
  ".pem-rewound-bar button",
  ".pem-command-feedback button",
  ".pem-causal-path button",
  ".pem-pulse-segments button",
  ".pem-pulse-toggle",
  ".pem-store-select select",
  ".pem-settings fieldset button",
  ".pem-settings-hide button",
  ".pem-settings header button",
  ".pem-settings select",
  ".pem-trace-list button",
  ".pem-compact-list button",
  ".pem-mobile-back",
];
const SQUARE = [".pem-panel-toolbar button", ".pem-rail-collapse", ".pem-rail-restore", ".pem-settings header button"];

const isDesktop = (rule: Rule) => rule.context.length === 0;
const isMobile = (rule: Rule) => rule.context.some((c) => /@media[^{]*max-width/.test(c));

describe("devtools stylesheet — tokens", () => {
  it("declares every palette token once in :host with a --pem-devtools-* override form", () => {
    expect(HOST_RULE).toBeDefined();
    const host = HOST_RULE!.body;
    for (const [name, hex] of Object.entries(TOKENS)) {
      const re = new RegExp(`--pem-${name}\\s*:\\s*var\\(--pem-devtools-${name}\\s*,`);
      expect(host, `--pem-${name} override form`).toMatch(re);
      expect(tokenHex(name), `--pem-${name} fallback`).toBe(hex);
      const declaredCount = SHEET.match(new RegExp(`--pem-${name}\\s*:`, "g"))?.length ?? 0;
      expect(declaredCount, `--pem-${name} declared once`).toBe(1);
    }
  });

  it("keeps honouring the pre-existing host override names", () => {
    const host = HOST_RULE!.body;
    for (const legacy of [
      "--pem-devtools-color-text",
      "--pem-devtools-color-shell",
      "--pem-devtools-color-border",
      "--pem-devtools-color-focus",
      "--pem-devtools-radius-panel",
      "--pem-devtools-font-body",
      "--pem-devtools-font-mono",
    ]) {
      expect(host, legacy).toContain(`var(${legacy},`);
    }
    // The legacy names map onto the new tokens rather than living in a second cascade.
    expect(host).toMatch(/--pem-text\s*:\s*var\(--pem-devtools-text\s*,\s*var\(--pem-devtools-color-text\s*,/);
    expect(host).toMatch(/--pem-shell\s*:\s*var\(--pem-devtools-shell\s*,\s*var\(--pem-devtools-color-shell\s*,/);
    expect(host).toMatch(/--pem-line\s*:\s*var\(--pem-devtools-line\s*,\s*var\(--pem-devtools-color-border\s*,/);
    expect(host).toMatch(/--pem-focus\s*:\s*var\(--pem-devtools-focus\s*,\s*var\(--pem-devtools-color-focus\s*,/);
  });

  it("uses no colour literals outside the :host token block", () => {
    const hexes = OUTSIDE_HOST.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
    expect(hexes, `hex literals: ${hexes.join(", ")}`).toHaveLength(0);
    const withoutShadows = OUTSIDE_HOST.replace(/box-shadow\s*:[^;]+;/g, "");
    expect(withoutShadows).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
    // Shadows may only use the black-alpha form for their blur.
    for (const shadow of OUTSIDE_HOST.match(/box-shadow\s*:[^;]+;/g) ?? []) {
      const colours = shadow.match(/\b(rgb|rgba|hsl|hsla)\([^)]*\)/g) ?? [];
      for (const colour of colours) expect(colour).toMatch(/^rgb\(0 0 0 \/ \d+%\)$/);
    }
  });

  it("retires --pem-attention and --pem-panel", () => {
    expect(SHEET).not.toContain("--pem-attention");
    expect(SHEET).not.toContain("--pem-panel:");
  });
});

describe("devtools stylesheet — semantic colours", () => {
  it("maps dirty to mod, errors to del and inserts to add", () => {
    const dirty = rulesFor('[data-tone="dirty"]');
    const error = rulesFor('[data-tone="error"]');
    expect(dirty.length).toBeGreaterThan(0);
    expect(error.length).toBeGreaterThan(0);
    expect(dirty.map((r) => r.body).join("")).toContain("var(--pem-mod)");
    expect(error.map((r) => r.body).join("")).toContain("var(--pem-del)");
    expect(rulesFor('[data-tone="attention"]')).toHaveLength(0);
  });

  it("colours diff rows by kind", () => {
    const kind = (name: string) =>
      RULES.filter((r) => r.selector.includes(`.pem-diff-row[data-kind="${name}"]`)).map((r) => r.body).join("");
    expect(kind("changed")).toContain("var(--pem-mod)");
    expect(kind("added")).toContain("var(--pem-add)");
    expect(kind("removed")).toContain("var(--pem-del)");
  });
});

describe("devtools stylesheet — type scale", () => {
  it("uses only the font-size scale, nothing below 10px", () => {
    const sizes = new Set<number>();
    for (const m of SHEET.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) sizes.add(Number(m[1]));
    for (const m of SHEET.matchAll(/font\s*:\s*(?:\d{3}\s+)?(\d+(?:\.\d+)?)px/g)) sizes.add(Number(m[1]));
    const sorted = [...sizes].sort((a, b) => a - b);
    expect(sorted[0]).toBeGreaterThanOrEqual(10);
    for (const size of sorted) expect(ALLOWED_FONT_SIZES, `font-size ${size}px`).toContain(size);
  });

  it("uses only the 400/500/600/700 weights", () => {
    const weights = new Set<number>();
    for (const m of SHEET.matchAll(/font-weight\s*:\s*(\d{3})/g)) weights.add(Number(m[1]));
    for (const m of SHEET.matchAll(/font\s*:\s*(\d{3})\s/g)) weights.add(Number(m[1]));
    for (const weight of weights) expect(ALLOWED_FONT_WEIGHTS, `font-weight ${weight}`).toContain(weight);
  });

  it("keeps labels and chrome at 11px or larger", () => {
    for (const selector of [".pem-panel-toolbar", ".pem-settings label", ".pem-store-select", ".pem-coverage-note", ".pem-pulse-segments small"]) {
      for (const rule of rulesFor(selector)) {
        const size = px(declarations(rule.body)["font-size"]);
        if (size !== undefined) expect(size, selector).toBeGreaterThanOrEqual(11);
      }
    }
  });

  it("sets tabular numerals where data is tabular", () => {
    for (const selector of [".pem-devtools-surface", ".pem-metric strong", ".pem-diff-row > *", ".pem-value"]) {
      const bodies = rulesFor(selector).map((r) => r.body).join("");
      expect(bodies, selector).toContain("font-variant-numeric: tabular-nums");
    }
  });
});

describe("devtools stylesheet — spacing scale", () => {
  it("restricts gap/padding/margin px values to the 4-step scale", () => {
    const values = new Set<number>();
    for (const m of SHEET.matchAll(/(?:gap|padding|margin)(?:-[a-z]+)?\s*:\s*([^;{}]+);/g)) {
      for (const v of m[1].matchAll(/-?(\d+(?:\.\d+)?)px/g)) values.add(Number(v[1]));
    }
    for (const value of [...values].sort((a, b) => a - b)) {
      expect(SPACING_SCALE, `spacing ${value}px`).toContain(value);
    }
  });
});

describe("devtools stylesheet — hit targets", () => {
  it.each(INTERACTIVE)("%s is at least 32px tall on desktop", (selector) => {
    expect(maxDeclared(selector, "min-height", isDesktop)).toBeGreaterThanOrEqual(32);
  });

  it.each(SQUARE)("%s is at least 32px wide on desktop", (selector) => {
    expect(maxDeclared(selector, "min-width", isDesktop)).toBeGreaterThanOrEqual(32);
  });

  it.each(INTERACTIVE)("%s grows to 44px at the mobile breakpoint", (selector) => {
    expect(maxDeclared(selector, "min-height", isMobile)).toBeGreaterThanOrEqual(44);
  });
});

describe("devtools stylesheet — container-query layout", () => {
  it("makes the panel content the layout container", () => {
    const body = rulesFor(".pem-panel-content").map((r) => r.body).join("");
    expect(body).toContain("container-type: inline-size");
  });

  it("collapses the causal rail below 900px of container width", () => {
    const rail = rulesFor(".pem-causal-rail", (r) => r.context.some((c) => c.startsWith("@container") && c.includes("900px")));
    expect(rail.length).toBeGreaterThan(0);
    expect(rail.map((r) => r.body).join("")).toContain("display: none");
    const workspace = rulesFor(".pem-entity-workspace", (r) => r.context.some((c) => c.startsWith("@container") && c.includes("900px")));
    expect(workspace.length).toBeGreaterThan(0);
  });

  it("stacks navigator and detail below 640px of container width", () => {
    const narrow = (c: string) => c.startsWith("@container") && c.includes("640px");
    const hidden = RULES.filter((r) => r.context.some(narrow) && r.selector.includes('[data-narrow-detail="false"]'));
    expect(hidden.length).toBeGreaterThan(0);
    expect(hidden.map((r) => r.body).join("")).toContain("display: none");
    const back = rulesFor(".pem-mobile-back", (r) => r.context.some(narrow));
    expect(back.map((r) => r.body).join("")).toContain("display: inline-flex");
  });

  it("keeps the viewport media query for the frame, safe-area and touch-target rules only", () => {
    const viewport = RULES.filter(isMobile);
    expect(viewport.length).toBeGreaterThan(0);
    const selectors = viewport.flatMap((r) => r.selector.split(",").map((s) => s.trim()));
    for (const selector of selectors) {
      const allowed =
        selector.startsWith(".pem-panel-frame") ||
        selector.startsWith(".pem-settings") ||
        selector === ".pem-panel-toolbar" ||
        INTERACTIVE.includes(selector);
      expect(allowed, `viewport rule leaked layout: ${selector}`).toBe(true);
    }
    expect(SHEET).not.toMatch(/@media \(max-width: 719px\)[^{]*\{[\s\S]*?\.pem-entity-workspace/);
  });
});

describe("devtools stylesheet — contrast (WCAG 2.x)", () => {
  const t = (name: string) => tokenHex(name);

  it.each(["shell", "surface", "elevated"])("text, muted and code reach 4.5:1 on %s", (surface) => {
    expect(contrast(t("text"), t(surface))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t("muted"), t(surface))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t("code"), t(surface))).toBeGreaterThanOrEqual(4.5);
  });

  it("launcher badge text reaches 4.5:1 on the badge background", () => {
    const badge = declarations(rulesFor(".pem-launcher-badge")[0]!.body);
    const token = (value: string) => value.match(/var\(--pem-([a-z]+)\)/)![1];
    expect(contrast(t(token(badge.color)), t(token(badge.background)))).toBeGreaterThanOrEqual(4.5);
  });

  it("pulse segment underline reaches 3:1 against the pulse surface", () => {
    const segment = declarations(rulesFor(".pem-pulse-segments button")[0]!.body);
    const underline = segment["border-bottom"].match(/var\(--pem-([a-z]+)\)/)![1];
    const surface = segment.background.match(/var\(--pem-([a-z]+)\)/)![1];
    expect(contrast(t(underline), t(surface))).toBeGreaterThanOrEqual(3);
  });

  it("mod, del and add text reach 4.5:1 on the selected-row surface", () => {
    const selected = declarations(rulesFor('.pem-entity-row[data-selected="true"]')[0]!.body);
    const surface = selected.background.match(/var\(--pem-([a-z]+)\)/)![1];
    for (const tone of ["mod", "del", "add", "accent"]) {
      expect(contrast(t(tone), t(surface)), `${tone} on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("devtools stylesheet — motion and focus", () => {
  it("animates only the panel reveal, 200ms ease-out", () => {
    const keyframes = RULES.filter((r) => r.selector.startsWith("@keyframes"));
    expect(keyframes.map((r) => r.selector)).toEqual(["@keyframes pem-panel-reveal"]);
    const animated = RULES.filter((r) => !r.context.some((c) => c.includes("prefers-reduced-motion")) && /animation\s*:/.test(r.body));
    expect(animated.map((r) => r.selector)).toEqual([".pem-panel-frame"]);
    expect(declarations(animated[0]!.body).animation).toMatch(/pem-panel-reveal 200ms ease-out/);
    expect(SHEET).not.toContain("pem-pulse-arrival");
  });

  it("disables the reveal and transitions under prefers-reduced-motion", () => {
    const reduced = RULES.filter((r) => r.context.some((c) => c.includes("prefers-reduced-motion: reduce")));
    const body = reduced.map((r) => r.body).join("");
    expect(body).toMatch(/animation(-duration)?\s*:\s*[^;]*!important/);
    expect(body).toMatch(/transition(-duration)?\s*:\s*[^;]*!important/);
  });

  it("keeps the 2px focus ring with 2px offset on :focus-visible", () => {
    const focus = RULES.filter((r) => r.selector.includes(":focus-visible"));
    expect(focus.length).toBeGreaterThan(0);
    const body = focus.map((r) => r.body).join("");
    expect(body).toContain("outline: 2px solid var(--pem-focus)");
    expect(body).toContain("outline-offset: 2px");
  });

  it("themes selection and scrollbars from the palette", () => {
    expect(rulesFor("::selection").map((r) => r.body).join("")).toContain("var(--pem-accent)");
    expect(SHEET).toMatch(/scrollbar-color:\s*var\(--pem-line\)\s+var\(--pem-(shell|surface)\)/);
  });

  it("adds no gradients, glass or hard offset shadows", () => {
    expect(SHEET).not.toMatch(/gradient\(/);
    expect(SHEET).not.toMatch(/backdrop-filter/);
    for (const shadow of SHEET.match(/box-shadow\s*:\s*([^;]+);/g) ?? []) {
      if (shadow.includes("inset") || shadow.includes("none")) continue;
      // offset-x offset-y blur: blur must be present and non-zero (soft), never a hard offset.
      const parts = shadow.replace(/box-shadow\s*:\s*/, "").split(/\s+/);
      expect(parts.length, shadow).toBeGreaterThanOrEqual(4);
      expect(px(parts[2])).toBeGreaterThan(0);
    }
  });
});
