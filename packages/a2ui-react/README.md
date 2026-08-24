# @prometheus-ags/a2ui-react

Official A2UI v0.9.1 React rendering with a default-deny Prometheus entity-graph
action bridge.

> Release status: the workspace package is `3.0.0-rc.1`. The bridge is
> implemented and verified, but the full repository-wide 3.0 certification and
> npm publication or `latest` promotion have not happened.

## Two protocol surfaces

| Import | Contract |
| --- | --- |
| `@prometheus-ags/a2ui-react` | Official A2UI v0.9.1 messages, catalogs, surfaces, React rendering, and action policy |
| `@prometheus-ags/a2ui-react/ag-ui` | Compatibility APIs for the pre-3.0 AG-UI chat/state-event surface |

A2UI and AG-UI solve different problems. A2UI describes and renders a
catalog-constrained interface. AG-UI transports run, message, tool, and state
events. The package root no longer labels the legacy AG-UI chat components as
official A2UI.

## Pinned version axes

These numbers are related but are not interchangeable:

| Axis | Stable target |
| --- | --- |
| A2UI wire protocol | `v0.9.1` |
| `@a2ui/react` distribution | `0.10.2` |
| `@a2ui/web_core` distribution | `0.10.5` |
| `@a2ui/markdown-it` distribution | `0.1.0` |

The bridge imports the official `/v0_9` entry points. It does not implement a
second JSONL parser, schema validator, data model, or surface store.

## Install

This monorepo is pnpm-only:

```bash
pnpm add @prometheus-ags/a2ui-react @prometheus-ags/entity-graph-core react react-dom
```

React 19 is the supported 3.0 line. The package provides ESM and CommonJS
runtimes plus declarations verified in strict NodeNext and Node16 consumers.

## Quick start

Create application authority explicitly, then pass official messages to the
runtime and render the resulting surface:

```tsx
import {
  ENTITY_GRAPH_A2UI_ACTIONS,
  PrometheusA2uiProvider,
  PrometheusA2uiSurface,
  createEntityGraphA2uiActionPolicy,
  createPrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
import { graphStore } from "@prometheus-ags/entity-graph-core";

const policy = createEntityGraphA2uiActionPolicy({
  graphStore,
  entities: {
    Order: {
      actions: [ENTITY_GRAPH_A2UI_ACTIONS.upsert],
      fields: ["status", "total"],
    },
  },
  authorize: ({ tenantId, entityType }) =>
    tenantId === "tenant-acme" && entityType === "Order",
  requestApproval: async ({ action }) => {
    // Replace/remove rules reach this callback after authorization.
    return window.confirm(`Approve ${action.name}?`);
  },
});

export const a2uiRuntime = createPrometheusA2uiRuntime({
  actionPolicy: policy,
  onActionDecision: (decision) => {
    // Persist this receipt in your application audit trail.
    console.info("A2UI decision", decision);
  },
});

a2uiRuntime.processMessages([
  {
    version: "v0.9.1",
    createSurface: {
      surfaceId: "order-review",
      catalogId: "urn:prometheus-ags:a2ui:catalog:v3",
    },
  },
  {
    version: "v0.9.1",
    updateComponents: {
      surfaceId: "order-review",
      components: [
        { id: "root", component: "Column", children: ["title"] },
        { id: "title", component: "Text", text: "Review order" },
      ],
    },
  },
]);

export function OrderAgentSurface() {
  return (
    <PrometheusA2uiProvider runtime={a2uiRuntime}>
      <PrometheusA2uiSurface
        surfaceId="order-review"
        fallback={<p role="status">Preparing agent surface…</p>}
      />
    </PrometheusA2uiProvider>
  );
}
```

Call `a2uiRuntime.dispose()` when the application-owned runtime is no longer
needed.

`processMessages()` treats each supplied message list as one transaction. It
preflights the complete batch against a shadow official processor seeded from
the current surfaces; a later schema, catalog, component, or official state
error therefore cannot partially commit an earlier message to the live runtime.

## The security boundary

**Protocol validity never grants application authority.**

Think of the catalog as an approved vocabulary, not a database credential. The
official processor can prove that a surface and action are valid A2UI. Only the
application can decide whether that action may affect a tenant, entity, or
field.

The entity-graph policy therefore fails closed:

1. The action must match the official v0.9.1 schema.
2. The exact action name must be registered.
3. Its context must match the application schema.
4. The entity type, action, and every written field must be allowlisted.
5. The application `authorize` callback must approve scope and tenant access.
6. `replace` and `remove` additionally require out-of-band approval.
7. Only then may the policy call the graph store.

Agent-supplied context cannot self-assert approval. Unknown actions, tenants,
entity types, and fields are denied.

## Catalog policy

`createPrometheusA2uiCatalog()` derives implementations from the official
React basic catalog and exposes only explicit component and function
allowlists. The default catalog includes the standard presentation and input
components but deliberately excludes `openUrl`. Applications may opt into
that function explicitly; navigation is never silently granted.

```ts
import { createPrometheusA2uiCatalog } from "@prometheus-ags/a2ui-react";

const catalog = createPrometheusA2uiCatalog({
  id: "urn:acme:a2ui:catalog:v1",
  components: ["Text", "Column", "Button"],
  functions: ["formatString"],
});
```

## React and SSR

- `PrometheusA2uiProvider` supplies the application-owned runtime and official
  Markdown renderer.
- `PrometheusA2uiSurface` renders one official surface.
- `PrometheusA2uiSurfaces` renders the current surface collection.
- `usePrometheusA2ui` processes messages and reads client capabilities/data.
- `usePrometheusA2uiRuntime` and `usePrometheusA2uiSurfaces` expose focused
  orchestration reads.

The surface wrapper emits deterministic fallback markup during server
rendering and lets the official renderer take over after hydration. This avoids
claiming that the current official renderer itself is server-renderable.

The architectural boundary remains:

```text
Components → Prometheus A2UI hooks/provider → runtime policy → graph store
```

Renderer components do not read or write the graph store directly.

## Migrating alpha chat consumers

3.0 intentionally changes the package root. This is a deliberate breaking
change that corrects the alpha naming mismatch. Move the pre-3.0 AG-UI APIs to
the compatibility subpath:

```tsx
// Before: 3.0 alpha package root
import { EntityChat, EntityApproval } from "@prometheus-ags/a2ui-react";

// After: explicit AG-UI compatibility boundary
import {
  EntityChat,
  EntityApproval,
} from "@prometheus-ags/a2ui-react/ag-ui";
```

The compatibility subpath retains `EntityChat`, `EntityCopilot`,
`EntityStream`, `EntityDiff`, `EntityApproval`,
`EntityToolProviderContext`, `useChatSession`, `useEntityDiff`, and
`useEntityToolProvider`. It does not become an official A2UI renderer merely
because it ships in the same package.

## Public runtime exports

The machine-readable root and `./ag-ui` runtime export sets live in
[`a2ui-library-exports.json`](../../prometheus-entity-skills/_shared/references/a2ui-library-exports.json).
Build and verify them with:

```bash
pnpm --filter @prometheus-ags/a2ui-react run refresh:exports
pnpm --filter @prometheus-ags/a2ui-react run verify:skills
```

Type-only exports include the official message, catalog, surface, capability,
and data-model contracts plus Prometheus runtime, policy, graph authorization,
provider, and hook option/result types.

## Verification

```bash
pnpm run test:a2ui-bridge
pnpm run verify:a2ui-bridge
pnpm run bdd:a2ui-bridge
```

The current package evidence covers official atomic message processing/rendering,
default-deny graph actions, packed ESM/CommonJS/NodeNext/Node16/SSR consumers,
keyboard-only browser behavior, desktop/mobile screenshots, and accessibility.
The repository's dedicated
[`agentic-a2ui-app`](../../examples/agentic-a2ui-app/README.md) demonstrates how
to compose this renderer with the official A2A package and an application-owned
action boundary. Its focused tests are implemented, but its clean production
browser gate now passes all three flows with zero serious or critical axe
findings and hash-bound screenshots and traces. That implements the showcase
without broadening this package's separate packed evidence boundary. The
Docusaurus deployment, registry authority, and stable publication also remain
separate.

See [the release bridge contract](../../release/a2ui-protocol-bridge.md) for the
complete evidence boundary and upstream references.
