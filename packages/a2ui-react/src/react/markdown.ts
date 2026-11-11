/*
 * Adapted from @a2ui/markdown-it 0.2.0 (raw-markdown.js, sanitizer.js, markdown.js).
 * Copyright 2024 Google LLC. Licensed under the Apache License, Version 2.0
 * (https://www.apache.org/licenses/LICENSE-2.0). Modified by Prometheus AGS:
 * ported to TypeScript and bound to this package's own exact `dompurify` pin, so
 * consumers sanitize with the patched release instead of the version that
 * @a2ui/markdown-it pins.
 */
import DOMPurify from "dompurify";
import markdownit from "markdown-it";

type TagClassMap = Record<string, readonly string[]>;
type RenderRule = NonNullable<ReturnType<typeof markdownit>["renderer"]["rules"][string]>;

const CLASSED_RULES = [
  "paragraph_open",
  "heading_open",
  "bullet_list_open",
  "ordered_list_open",
  "list_item_open",
  "link_open",
  "strong_open",
  "em_open",
] as const;

function createRenderer(): ReturnType<typeof markdownit> {
  const md = markdownit();
  for (const ruleName of CLASSED_RULES) {
    const originalRule = md.renderer.rules[ruleName];
    const classedRule: RenderRule = (tokens, idx, options, env, self) => {
      const token = tokens[idx]!;
      const tagClassMap = (env as { tagClassMap?: TagClassMap } | undefined)?.tagClassMap;
      for (const className of tagClassMap?.[token.tag] ?? []) {
        token.attrJoin("class", className);
      }
      return originalRule
        ? originalRule(tokens, idx, options, env, self)
        : self.renderToken(tokens, idx, options);
    };
    md.renderer.rules[ruleName] = classedRule;
  }
  return md;
}

let renderer: ReturnType<typeof markdownit> | undefined;
let purify: { sanitize(html: string): string } | undefined;

function sanitize(html: string): string {
  if (!purify) {
    if (typeof DOMPurify.sanitize === "function") {
      purify = DOMPurify;
    } else {
      const globalWindow = (globalThis as { window?: Parameters<typeof DOMPurify>[0] }).window;
      if (!globalWindow) {
        throw new Error(
          "DOMPurify requires a window object. If testing, provide a jsdom window as `globalThis`.",
        );
      }
      purify = DOMPurify(globalWindow);
    }
  }
  return purify.sanitize(html);
}

/** Render A2UI markdown to sanitized HTML (markdown-it, then DOMPurify). */
export async function renderMarkdown(
  value: string,
  options?: { tagClassMap?: TagClassMap },
): Promise<string> {
  renderer ??= createRenderer();
  return sanitize(renderer.render(value, { tagClassMap: options?.tagClassMap }));
}
