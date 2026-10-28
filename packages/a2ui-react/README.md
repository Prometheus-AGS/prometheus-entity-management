# @prometheus-ags/a2ui-react

Strict A2UI v1.0 release-candidate compatibility for React over the maintained
official v0.9.1 renderer, with a default-deny Prometheus entity-graph action
bridge and an idempotent AG-UI A2UI activity transport (AG-UI 0.0.59 through
1.x).

> This package carries a 1.0-RC compatibility boundary. It does not claim an
> unpublished native upstream v1 renderer.

Guided documentation, with diagrams of the flows below, is on the documentation
site under **A2UI and AG-UI** (`website/docs/a2ui/`). This README is the
reference.

## Two protocol surfaces

| Import | Contract |
| --- | --- |
| `@prometheus-ags/a2ui-react` | A2UI v1.0-RC and v0.9.1 messages, catalogs, surfaces, React rendering, action policy, and AG-UI A2UI activities |
| `@prometheus-ags/a2ui-react/ag-ui` | Compatibility APIs for the pre-3.0 AG-UI chat/state-event surface |

A2UI and AG-UI solve different problems. A2UI describes and renders a
catalog-constrained interface. AG-UI transports run, message, tool, and state
events. The package root no longer labels the legacy AG-UI chat components as
official A2UI.

## Pinned version axes

These numbers are related but are not interchangeable:

| Axis | Selected target |
| --- | --- |
| Public A2UI input | `v1.0` RC and `v0.9.1` |
| Official renderer engine | `v0.9.1` compatibility boundary |
| `@a2ui/react` distribution | `0.12.0` |
| `@a2ui/web_core` distribution | `0.12.0` |
| `@a2ui/markdown-it` distribution | `0.2.0` |
| AG-UI activity transport | `@ag-ui/core` peer `>=0.0.59 <0.1.0 \|\| ^1.0.0` (developed against `1.0.3`) |

The published A2UI packages do not expose the documented v1 renderer entry
points yet. The bridge therefore validates the v1.0-RC envelope, decomposes its
embedded surface into the official `/v0_9` processor, and retains v1-only
action/function metadata at the runtime boundary. It does not implement a
second renderer, data model, or surface store.

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
    version: "v1.0",
    createSurface: {
      surfaceId: "order-review",
      catalogId: "urn:prometheus-ags:a2ui:catalog:v3",
      components: [
        { id: "root", component: "Column", children: ["title"] },
        { id: "title", component: "Text", text: "Review order" },
      ],
      dataModel: { status: "ready" },
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

`processAgUiEvent(event)` consumes the AG-UI A2UI activity convention
(0.0.59 and 1.x): `ACTIVITY_SNAPSHOT` and `ACTIVITY_DELTA`, activity type
`a2ui-surface`, and `content.a2ui_operations`. Transport acceptance never bypasses the same
schema, catalog, action-policy, or approval gates used by direct messages. It
also accepts `MESSAGES_SNAPSHOT` (see below).

### Redelivery, restatement and ordering

AG-UI clients redeliver: on reconnect replay, when a `MESSAGES_SNAPSHOT`
restates a thread, and when two streams carry the same activity. Delivery is
idempotent, so a redelivered activity never rolls a surface back or loses typed
input.

- **A surface is only deleted by an explicit `deleteSurface` operation.** A
  `replace:true` snapshot restates the producer's statement; it is applied to
  the held surface as updates and never deletes surfaces or recreates them.
  Surfaces and components the restatement leaves out stay (the official
  processor never removes a component the producer stops mentioning).
  `replace:false` still means "ignore if this message is already known".
- **Ordering is optional and per surface.** AG-UI 1.0 defines no version field,
  so a producer carries one in the activity's own content:
  `content.surfaceVersions: { "<surfaceId>": { epoch?: n, version: n } }`.
  Versions order a surface's activities: an older one is ignored, an identical
  redelivery is ignored, a newer one is applied. `epoch` is an integer the
  producer raises on every restart, so a restarted producer that numbers from 1
  again is not mistaken for an old one; a missing epoch means 0. One activity can
  touch several surfaces, and each is decided on its own.
- **Same key, different content is a producer fault** (`version-conflict`): the
  first is kept, the second is ignored, and the two are never merged.
- **Versionless producers** are only protected against an identical redelivery of
  the same message. Out-of-order delivery of versionless activities is not
  detected.
- **Restating `createSurface` for a held surface** applies its inline components
  and data model as updates. If it changes the catalog, theme or
  `sendDataModel`, that surface's operations in that activity are ignored and a
  `surface-config-mismatch` fault is reported.
- **Typed input survives.** The runtime remembers the last value the producer
  wrote at each data leaf and writes only leaves whose producer value changed, so
  an unchanged value cannot overwrite what the user typed. If the producer
  changes a leaf the user also changed, the **producer wins** and `onConflict`
  reports it. A leaf the producer wrote before and no longer states is removed.
  Per-leaf tracking is dropped for a surface with more than 20,000 data leaves;
  its later restatements simply overwrite.
- **A deleted surface stays deleted** against any version at or below the one
  that deleted it, so a redelivered create or update cannot revive it. Only
  versioned deletions are remembered (bounded by `maxTombstones`).
- **`MESSAGES_SNAPSHOT`** that carries activity messages is the complete set of
  activity messages. Each A2UI activity goes through the same path, so replaying
  a thread changes nothing already applied. A tracked message the snapshot
  omits is forgotten as a message only; its surfaces stay. A snapshot with no
  activity messages is not handled.

### Incremental updates (`ACTIVITY_DELTA`)

A producer can update a long-lived surface without resending it. A delta applies
on top of the version it names and produces the next one:

```json
{
  "type": "ACTIVITY_DELTA",
  "messageId": "m1",
  "activityType": "a2ui-surface",
  "patch": [
    { "op": "test", "path": "/surfaceVersions/s1/version", "value": 3 },
    { "op": "add", "path": "/a2ui_operations/-", "value": { "version": "v0.9.1", "updateComponents": { "surfaceId": "s1", "components": [] } } }
  ]
}
```

Only these two patch operations are accepted. A delta using any other operation,
or touching a surface it carries no version for, is rejected (`invalid-message`):
a delta without a version cannot be ordered, and `remove` cannot be honored
because the official processor cannot remove a component. An optional
`/surfaceVersions/<surfaceId>/epoch` test names the epoch; without it the held
epoch is assumed.

- **In order** (the named version is the one held): applied, and the surface is
  now at the next version.
- **Already applied or behind**: ignored.
- **Ahead of what is held, or for a surface with no versioned state**: held in a
  bounded buffer (`maxBufferedDeltas`, `bufferTimeoutMs`). When the missing
  version arrives the held deltas are applied in order. If it does not arrive in
  time, or the buffer overflows, `onResyncNeeded` is called. A delta that
  touches several surfaces waits as a whole until every one of them is in order.

`onResyncNeeded(request)` also fires when the runtime **refuses** a batch the
producer had accepted (a disallowed component, a topology error, a limit): the
surface would otherwise sit at its last version with no signal. The same event
reports a `batch-refused` producer fault (limit rejections report their own).
AG-UI has no resync event, so send the request upstream in `forwardedProps`:

```ts
const runtime = createPrometheusA2uiRuntime({
  onResyncNeeded: (request) => {
    // request.reason: "gap" | "missing-surface" | "buffer-overflow" | "refused" | "stale-action"
    sendRunInput({ forwardedProps: buildA2uiForwardedProps({ resync: { held: request.held } }) });
  },
});

runtime.getHeldVersions(); // { s1: { epoch: 0, version: 3 } }
runtime.getResyncForwardedProps(); // the same, shaped for forwardedProps
```

`dispose()` clears the buffer and every pending timer.

Only `processAgUiEvent` tracks and reconciles. Messages passed straight to
`processMessages` are applied as before and are not versioned or deduplicated.

`processMessages()` treats each supplied message list as one transaction. It
preflights the complete batch against a shadow official processor seeded from
the current surfaces; a later schema, catalog, component, or official state
error therefore cannot partially commit an earlier message to the live runtime.

### Actions: ids, retry and stale rejection

`onActionEnvelope(envelope)` is called for every action the action policy
**executed**, on v0.9.1 and v1.0 surfaces alike. A denied action never leaves
the runtime. Put `envelope.forwardedProps` into the next AG-UI run input:

```json
{
  "a2uiAction": {
    "userAction": { "name": "save", "surfaceId": "s1", "sourceComponentId": "b1", "timestamp": "...", "context": {} },
    "actionId": "01a1828e-cdf8-7204-9517-4a7080fc09d9",
    "heldVersion": { "epoch": 0, "version": 3 },
    "dataModel": { "version": "v0.9.1", "surfaces": { "s1": {} } }
  }
}
```

- `userAction` is the A2UI action exactly as the renderer produced it; it is
  never modified.
- `actionId` is a globally unique id (a UUIDv7) minted once per interaction, so
  two tabs, or one tab after a reload, never share one. A server uses it to make
  action handling idempotent. The runtime does not arbitrate duplicates; that is
  the server's job.
- `heldVersion` is the version the surface held when the action fired, so a
  server can tell a stale action from a current one. It is absent for a surface
  with no versioned state.
- `dataModel` is present only when the surface sets `sendDataModel`.

**Two different ids.** The v1.0 `onRendererMessage` action message can also
carry an `actionId`. That is a *correlation* id for `wantResponse` actions
(`surface:component:n`, unique only within one runtime instance) that matches an
`actionResponse` to its action. It is unchanged. The envelope's `actionId` is an
*idempotency* id and is global. They do different jobs; do not use one for the
other.

`runtime.retryAction(actionId)` resends the original envelope under the same id.
The runtime owns the retry because a host that resent on its own would mint a
new id and defeat idempotency. The resent envelope keeps the `heldVersion` and
data model from when the action fired. It returns `false` for an unknown id (the
last 100 envelopes are retained) or when no handler is installed.

When a server rejects an action as stale, pass what it returns to
`runtime.applyStaleActionRejection`:

```json
{
  "actionId": "01a1828e-cdf8-7204-9517-4a7080fc09d9",
  "a2ui_operations": [],
  "surfaceVersions": { "s1": { "epoch": 0, "version": 5 } }
}
```

`a2ui_operations` are the operations since the version the client held, and
`surfaceVersions` the versions they bring each surface to. They go through the
same ordering and limits as any activity, so a repeated rejection changes
nothing. A rejection carrying no operations cannot repair the surface, so the
runtime calls `onResyncNeeded` with reason `"stale-action"`.

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

## Resource limits

A2UI messages come from an agent or server the application does not control.
The official `@a2ui/web_core` processor enforces no resource caps, so one
faulty or hostile producer could exhaust the browser's memory or CPU. The
runtime therefore enforces limits **by default**. An application that needs
more room raises specific limits; nothing is silently truncated.

| Limit | Default | Applies to |
|---|---|---|
| `maxSurfaces` | 64 | surfaces held by one runtime |
| `maxComponentsPerSurface` | 2,000 | components in one surface |
| `maxComponentsTotal` | 10,000 | components across all surfaces |
| `maxComponentDepth` | 32 | levels in the longest component reference chain |
| `maxDataModelBytes` | 1,048,576 | serialized UTF-8 size of one surface's data model |
| `maxComponentBytes` | 1,048,576 | serialized UTF-8 size of one surface's components |
| `maxOperationsPerCall` | 500 | messages in one `processMessages` call |
| `maxCallBytes` | 1,048,576 | serialized UTF-8 size of one `processMessages` call |
| `maxTrackedMessages` | 1,000 | activity messages remembered for redelivery; oldest forgotten first |
| `maxTombstones` | 1,000 | deleted surfaces remembered so a stale create cannot revive them; oldest forgotten first |
| `maxBufferedDeltas` | 100 | deltas held while the version they build on has not arrived; oldest dropped first |
| `bufferTimeoutMs` | 5,000 | how long a held delta waits before a resync is requested |

The defaults are provisional estimates, not measurements. They are exported as
`DEFAULT_PROMETHEUS_A2UI_LIMITS`.

```ts
const runtime = createPrometheusA2uiRuntime({
  limits: { maxSurfaces: 200, maxComponentsPerSurface: 5_000 },
  onProducerFault: (fault) => {
    // { kind: "limit-exceeded", limit, max, attempted, current?, surfaceId? }
    reportToTelemetry(fault);
  },
});
```

Every limit must be a positive safe integer, and an unknown limit name throws at
construction.

**When a limit is exceeded.** The whole call is rejected before anything is
applied and every surface is left unchanged. `onProducerFault` receives the
limit name, the configured `max`, the value the call would have produced
(`attempted`), the value held before it (`current`, for state limits) and the
`surfaceId` for per-surface limits. The call then throws a
`PrometheusA2uiError` whose `code` is `"limit-exceeded"`. `processAgUiEvent`
goes through `processMessages`, so it is covered too.

**What is measured.** `maxOperationsPerCall` and `maxCallBytes` are checked on
the raw input. The state limits are checked on the state the call *would*
produce, measured on the same shadow processor that preflights the batch, so
the numbers are exact.

**Action responses.** A v1.0 `actionResponse` value written to a surface's
`responsePath` is producer input and goes through the same check. A rejection
there is reported through `onProducerFault`, leaves the surface unchanged, and
does not undo the messages of the surrounding call that were already applied.

**Changing limits at runtime.**

```ts
runtime.setLimits({ maxSurfaces: 10 }); // for example on a constrained device
runtime.getLimitUsage(); // { maxSurfaces: { current, max }, ... }
```

`setLimits` applies to later calls only and never evicts a surface already
held. If a cap is lowered below what is held, calls that would grow that value
past the cap are rejected, but calls that shrink it or leave it unchanged (for
example deleting a surface) still succeed, so the application can get back under
the cap. `getLimitUsage` reports held usage against each state limit; for the
per-surface limits it reports the largest surface.

**Upgrading.** Enforcement is on by default. A host that already renders
surfaces larger than these defaults must raise the relevant limits when
upgrading, or those calls will be rejected.

## Headless runtime and surface export

`@prometheus-ags/a2ui-react/headless` runs the same validation with no React, no
DOM and no renderer, so a server or a tool can check agent output exactly as the
browser will, and compact a long-lived surface.

```ts
import { createPrometheusA2uiHeadlessRuntime } from "@prometheus-ags/a2ui-react/headless";

const runtime = createPrometheusA2uiHeadlessRuntime({ limits: { maxSurfaces: 16 } });
runtime.processMessages(messages); // throws the same PrometheusA2uiError the browser would
```

The headless and React runtimes share one core and build their catalogs with the
same function from the same default allowlists, so the allowlist, the limits,
the schema checks, the ordering rules and the all-or-nothing batches are the same
code. Only the catalog's source differs: the headless entry uses the official
`@a2ui/web_core` basic catalog, which has no renderers. Nothing it imports
reaches `@a2ui/react` or React at run time. It has no `getSurface` rendering; it
holds and validates state only.

**`runtime.exportSurfaceMessages(surfaceId, { pruneOrphans? })`** (on both
runtimes) returns `{ surfaceId, messages, orphans }`: messages that rebuild the
surface in a fresh runtime, and exporting the rebuilt surface again yields the
same messages.

- A v0.9.1 surface exports as three official messages: `createSurface` (catalog,
  theme, `sendDataModel`), `updateComponents` (every component, with its own
  `catalogId` where it differs from the surface's) and `updateDataModel` at `/`.
- A v1.0 surface exports as **one inline `createSurface`** carrying its
  components and data model, with each action's `wantResponse` and
  `responsePath` put back where the producer wrote them. The v1.0 schema cannot
  express a theme, so a v1.0 surface has none to lose. An explicit
  `wantResponse: false` comes back as an absent field, which means the same.
- The root is the component with id `root` and is preserved by id.
- **Orphans.** The official processor never removes a component a producer stops
  mentioning, so unreferenced components accumulate. Components no reachable
  component refers to are left out of the export (unless `pruneOrphans: false`)
  and listed in `orphans`. A surface with no `root` component has nothing to
  anchor to, so nothing is pruned and `orphans` is empty.
- An unknown surface throws a `PrometheusA2uiError` with code `surface-not-found`.

The headless declaration files still reference this package's shared option
types, whose default names the React component type, so a type-checking consumer
needs `@types/react` available even though no React code runs.

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

The AG-UI hardening (redelivery, versioned deltas, action ids, limits, headless
export) is verified end to end against a real producer by the
[`agui-activity-lab`](../../examples/agui-activity-lab/README.md) example:
17 browser flows, 4 headless checks and 6 Cucumber scenarios.

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
