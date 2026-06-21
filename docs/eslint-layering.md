# Enforcing Component → Hook → Store layering (ESLint)

> Change C8 of v2.0 · addresses GAP-7

The library's non-negotiable data-flow rule (see [CLAUDE.md](../CLAUDE.md)) is:

```
Components → Hooks → Stores
   (read)   (orchestrate) (fetch/sync)
```

**Components must never import the graph store directly.** Breaking this creates
data silos and defeats cross-view reactivity — the entire point of the entity
graph. This rule makes that violation a lint error instead of a code-review
catch.

This package does not bundle ESLint (it has no lint step of its own). The rule
below is a **copyable flat-config snippet** for consumer apps. A
ready-to-spread config object is also exported:
`prometheusEntityLayeringRule`.

## Copyable flat-config

```js
// eslint.config.js  (ESLint v9 flat config)
export default [
  {
    files: ["**/components/**/*.{ts,tsx}", "src/**/*.tsx"],
    // Components may NOT import the store directly — go through a hook.
    ignores: ["**/hooks/**", "**/*.hook.{ts,tsx}", "**/use-*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "@prometheus-ags/prometheus-entity-management",
            importNames: ["useGraphStore"],
            message:
              "Components must not import useGraphStore directly. Read data through a hook (Component → Hook → Store).",
          },
        ],
        patterns: [
          {
            group: ["**/graph", "**/graph.*"],
            message:
              "Components must not import the graph store module directly. Use a hook.",
          },
        ],
      }],
    },
  },
];
```

## Programmatic config

```ts
import { prometheusEntityLayeringRule } from "@prometheus-ags/prometheus-entity-management";

export default [
  prometheusEntityLayeringRule(),
  // ...your other config
];
```

Pass options to customize the storefront import name or the hook allowlist:

```ts
prometheusEntityLayeringRule({
  packageName: "@my-org/entities",
  hookGlobs: ["**/hooks/**", "**/*.hook.tsx"],
});
```

## Why a config snippet, not a custom plugin

A single `no-restricted-imports` rule expresses the constraint with zero new
dependencies. A bespoke `eslint-plugin-prometheus-entity` (with AST-level
analysis of, say, the hook→no-direct-API rule) is only worth the maintenance if
this proves insufficient. Start here.
