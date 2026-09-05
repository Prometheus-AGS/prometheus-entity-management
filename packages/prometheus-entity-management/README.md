# @prometheus-ags/prometheus-entity-management

**This package is a compatibility alias. Install
[`@prometheus-ags/entity-graph-react`](https://www.npmjs.com/package/@prometheus-ags/entity-graph-react)
instead.**

```bash
npm install @prometheus-ags/entity-graph-react
```

## Why the name changed

Every framework binding in this workspace is named after the framework it
binds:

| Package | Framework |
|---|---|
| `@prometheus-ags/entity-graph-react` | React |
| `@prometheus-ags/entity-graph-solid` | Solid |
| `@prometheus-ags/entity-graph-svelte` | Svelte |
| `@prometheus-ags/entity-graph-alpine` | Alpine |
| `@prometheus-ags/entity-graph-htmx` | htmx |
| `@prometheus-ags/entity-graph-tauri` | Tauri |
| `@prometheus-ags/entity-graph-web-components` | Web Components |

React was the exception. Its source has always lived in
`packages/entity-graph-react/`, but it published under the *product* name —
so the one binding most people reach for first was the one whose install name
could not be guessed from its role, and whose directory name did not match the
package it produced.

That is now fixed. The directory and the package name agree.

## Nothing breaks

This package still publishes, still carries the same version as the rest of the
release group, and re-exports the React binding verbatim — all three
entrypoints:

```ts
import { useEntity } from "@prometheus-ags/prometheus-entity-management";
import { … }         from "@prometheus-ags/prometheus-entity-management/devtools";
import                     "@prometheus-ags/prometheus-entity-management/devtools/auto";
```

Each forwards to the matching `@prometheus-ags/entity-graph-react` entrypoint.
Existing code keeps working with no edit.

## Migrating

Change the dependency and the import specifier. The exported API is identical —
this package adds nothing and removes nothing.

```diff
- "@prometheus-ags/prometheus-entity-management": "^3.2.0"
+ "@prometheus-ags/entity-graph-react": "^3.2.0"
```

```diff
- import { useEntity } from "@prometheus-ags/prometheus-entity-management";
+ import { useEntity } from "@prometheus-ags/entity-graph-react";
```

## Licence

MIT
