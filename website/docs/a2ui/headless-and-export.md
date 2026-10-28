---
title: Headless runtime and export
sidebar_position: 6
description: Validate agent output on a server with the same rules as the browser, and export a surface as messages that rebuild it.
---

# Validate on the server exactly as the browser will

`@prometheus-ags/a2ui-react/headless` runs the same validation as the React
runtime with no React, no DOM and no renderer. A server mirror, a validator or a
compactor can check agent output with the identical rules the browser applies.

```ts
import { createPrometheusA2uiHeadlessRuntime } from "@prometheus-ags/a2ui-react/headless";

const runtime = createPrometheusA2uiHeadlessRuntime({ limits: { maxSurfaces: 16 } });
runtime.processMessages(messages); // throws the same PrometheusA2uiError the browser would
```

## One core, two entries

The headless and React runtimes share one core, and both build their catalog with
one function from the same default allowlists. The allowlist, the limits, the
schema checks, the ordering rules and the all-or-nothing batches are the same
code, so they cannot drift apart. Only the catalog's source differs: the headless
entry uses the official `@a2ui/web_core` basic catalog, which has no renderers.
Nothing it imports reaches `@a2ui/react` or React at run time. It holds and
validates state; it does not render.

The headless declaration files still reference shared option types whose default
names the React component type, so a type-checking consumer needs `@types/react`
available even though no React code runs.

## Export a surface

`exportSurfaceMessages(surfaceId, { pruneOrphans? })` is available on both
runtimes. It returns `{ surfaceId, messages, orphans }`: messages that rebuild the
surface in a fresh runtime. Exporting the rebuilt surface again yields the same
messages.

```ts
const { messages, orphans } = runtime.exportSurfaceMessages("order-review");
const mirror = createPrometheusA2uiHeadlessRuntime();
mirror.processMessages(messages);
```

| Surface | Exported as |
| --- | --- |
| v0.9.1 | Three official messages: `createSurface` (catalog, theme, `sendDataModel`), `updateComponents` (every component, with its own `catalogId` where it differs from the surface's) and `updateDataModel` at `/` |
| v1.0 | One inline `createSurface` carrying its components and data model, with each action's `wantResponse` and `responsePath` put back where the producer wrote them. The v1.0 schema cannot express a theme, so a v1.0 surface has none to lose |

An explicit `wantResponse: false` comes back as an absent field, which means the
same thing.

## Orphans

The official processor never removes a component a producer stops mentioning, so
unreferenced components accumulate in a long-lived surface. The export treats the
component with id `root` as the anchor and preserves it by id. Components that no
reachable component refers to are **orphans**: they are left out of the export,
unless you pass `pruneOrphans: false`, and listed in `orphans` so you can see what
was dropped. A surface with no `root` component has nothing to anchor to, so
nothing is pruned and `orphans` is empty.

An unknown surface throws a `PrometheusA2uiError` with code `surface-not-found`.

## Typical uses

- **Server mirror:** apply the same AG-UI events on the server to hold
  authoritative `(epoch, version)` state, and answer a client's resync request.
- **Compaction:** export a long-lived surface, drop the orphans, and send the
  result as a fresh snapshot.
- **Validation:** reject an agent's output before it reaches any browser.
