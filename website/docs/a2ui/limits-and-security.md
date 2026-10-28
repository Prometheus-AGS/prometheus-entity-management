---
title: Limits and security
sidebar_position: 5
description: The default-deny action boundary and the resource limits that bound untrusted agent output.
---

# Bound what an agent can ask for

A2UI messages come from an agent or server your application does not control.
Two separate defenses apply, and neither depends on the other.

## Protocol validity never grants authority

Think of the catalog as an approved vocabulary, not a database credential. The
official processor can prove a surface and an action are valid A2UI. Only your
application can decide whether that action may touch a tenant, an entity, or a
field. The entity-graph policy therefore fails closed:

1. The action must match the official v0.9.1 schema.
2. The exact action name must be registered.
3. Its context must match your application schema.
4. The entity type, action and every written field must be allowlisted.
5. Your `authorize` callback must approve scope and tenant access.
6. `replace` and `remove` additionally need out-of-band human approval.
7. Only then may the policy call the graph store.

Agent-supplied context cannot approve itself. Unknown actions, tenants, entity
types and fields are denied. The default catalog also excludes `openUrl`:
navigation is never granted silently.

## Resource limits

The official `@a2ui/web_core` processor enforces no resource caps, so one faulty
or hostile producer could exhaust the browser. The runtime enforces limits **by
default**. Nothing is silently truncated.

| Limit | Default | Applies to |
| --- | --- | --- |
| `maxSurfaces` | 64 | surfaces held by one runtime |
| `maxComponentsPerSurface` | 2,000 | components in one surface |
| `maxComponentsTotal` | 10,000 | components across all surfaces |
| `maxComponentDepth` | 32 | levels in the longest component reference chain |
| `maxDataModelBytes` | 1,048,576 | serialized UTF-8 size of one surface's data model |
| `maxComponentBytes` | 1,048,576 | serialized UTF-8 size of one surface's components |
| `maxOperationsPerCall` | 500 | messages in one `processMessages` call |
| `maxCallBytes` | 1,048,576 | serialized UTF-8 size of one call |
| `maxTrackedMessages` | 1,000 | activity messages remembered for redelivery |
| `maxTombstones` | 1,000 | deleted surfaces remembered so a stale create cannot revive them |
| `maxBufferedDeltas` | 100 | deltas held while the version they build on is missing |
| `bufferTimeoutMs` | 5,000 | how long a held delta waits before a resync is requested |

The defaults are provisional estimates, not measurements, and are exported as
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

### When a limit is exceeded

The whole call is rejected before anything is applied, and every surface is left
unchanged. `onProducerFault` receives the limit name, the configured `max`, the
value the call would have produced (`attempted`), the value held before it
(`current`, for state limits) and the `surfaceId` for per-surface limits. The
call then throws a `PrometheusA2uiError` with code `limit-exceeded`.
`processAgUiEvent` goes through `processMessages`, so it is covered too.

`maxOperationsPerCall` and `maxCallBytes` are checked on the raw input. The state
limits are checked on the state the call *would* produce, measured on the same
shadow processor that preflights the batch, so the numbers are exact.

### Changing limits at runtime

```ts
runtime.setLimits({ maxSurfaces: 10 }); // for example on a constrained device
runtime.getLimitUsage(); // { maxSurfaces: { current, max }, ... }
```

`setLimits` applies to later calls only and never evicts a surface already held.
Calls that grow a value past a lowered cap are rejected, but calls that shrink it
or leave it unchanged, such as deleting a surface, still succeed, so the
application can get back under the cap.

:::warning Upgrading
Enforcement is on by default. A host that already renders surfaces larger than
these defaults must raise the relevant limits when upgrading, or those calls are
rejected with `limit-exceeded`.
:::

## Where this fits in the wider security model

See [Security and tenant boundaries](../operations/security.md) for the
graph-level boundaries, and [A2A and policy-controlled A2UI](../integrations/agent-protocols.md)
for the server side of the same trust model.
