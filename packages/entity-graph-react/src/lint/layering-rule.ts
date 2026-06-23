/**
 * lint/layering-rule.ts — Copyable ESLint flat-config for the
 * Component → Hook → Store layering rule (GAP-7 / change C8).
 *
 * This package ships no lint step of its own; this helper returns a flat-config
 * object a consumer can spread into their `eslint.config.js`. It encodes the
 * non-negotiable rule from CLAUDE.md: component files must not import the graph
 * store directly — data is read through hooks.
 *
 * It is plain data (no `eslint` import), so it adds zero dependencies and is
 * trivially unit-testable.
 */

export interface LayeringRuleOptions {
  /** Package name whose `useGraphStore` export is banned in components. */
  packageName?: string;
  /** File globs treated as components (rule applies here). */
  componentGlobs?: string[];
  /** File globs exempted as hooks (rule does NOT apply). */
  hookGlobs?: string[];
  /** Local module path globs for the graph store (banned in components). */
  storeModuleGlobs?: string[];
}

/** Shape of the returned ESLint flat-config entry (structurally typed — no eslint dep). */
export interface FlatConfigEntry {
  files: string[];
  ignores: string[];
  rules: Record<string, unknown>;
}

const DEFAULTS: Required<LayeringRuleOptions> = {
  packageName: "@prometheus-ags/prometheus-entity-management",
  componentGlobs: ["**/components/**/*.{ts,tsx}", "src/**/*.tsx"],
  hookGlobs: ["**/hooks/**", "**/*.hook.{ts,tsx}", "**/use-*.{ts,tsx}"],
  storeModuleGlobs: ["**/graph", "**/graph.*"],
};

/**
 * Build the flat-config entry enforcing Component → Hook → Store.
 *
 * @example
 * ```js
 * import { prometheusEntityLayeringRule } from "@prometheus-ags/prometheus-entity-management";
 * export default [ prometheusEntityLayeringRule() ];
 * ```
 */
export function prometheusEntityLayeringRule(
  options: LayeringRuleOptions = {},
): FlatConfigEntry {
  const o = { ...DEFAULTS, ...options };
  return {
    files: o.componentGlobs,
    ignores: o.hookGlobs,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: o.packageName,
              importNames: ["useGraphStore"],
              message:
                "Components must not import useGraphStore directly. Read data through a hook (Component → Hook → Store).",
            },
          ],
          patterns: [
            {
              group: o.storeModuleGlobs,
              message:
                "Components must not import the graph store module directly. Use a hook.",
            },
          ],
        },
      ],
    },
  };
}
