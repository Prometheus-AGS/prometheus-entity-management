# @prometheus-ags/entity-graph-a2a

Official A2A 1.0 JSON-RPC and streaming SSE for the Prometheus normalized entity graph.

The package uses `@a2a-js/sdk@1.0.1` for the wire model and transport dispatcher. Prometheus owns the application policy, graph adapter, deterministic reference executor, and its versioned A2UI artifact adapter.

## Supported boundary

| Surface | Stable 3.0 contract |
| --- | --- |
| Discovery | `GET /.well-known/agent-card.json` |
| Binding | JSON-RPC only, A2A protocol `1.0` |
| Methods | `SendMessage`, `SendStreamingMessage`, `GetTask`, `ListTasks`, `CancelTask`, `SubscribeToTask` |
| Streaming | Ordered task, status, artifact, and terminal envelopes over SSE |
| Graph authority | Default deny; application allowlists entity types, actions, and fields |
| Destructive writes | `replace` and `remove` require an out-of-band approval decision |
| A2UI | Prometheus-owned structured-data adapter carrying validated A2UI `v0.9.1` messages |
| Reference agent | Deterministic and keyless, with injectable IDs, clock, and delay |
| Remote agent | Optional HTTPS/loopback JSON-RPC executor seam; never required by default CI |

The AgentCard truthfully disables push notifications and extended cards. REST, gRPC, signed AgentCards, hosted identity, and production multi-tenant routing are not certified by this package gate.

## Installation

```bash
pnpm add @prometheus-ags/entity-graph-a2a @prometheus-ags/entity-graph-core
```

The A2A SDK is an exact production dependency of this package. Applications do not need to install a second SDK copy to use the public Prometheus API.

## Quick start

```ts
import {
  buildAgentCard,
  createA2AServer,
  createBearerTokenAuthenticator,
  createEntityGraphA2APolicy,
} from "@prometheus-ags/entity-graph-a2a";

const policy = createEntityGraphA2APolicy({
  entities: {
    Invoice: {
      actions: ["upsert", "replace", "remove", "query", "snapshot"],
      fields: ["id", "amount", "status"],
    },
    "*": { actions: ["snapshot"], fields: [] },
  },
  authorize: ({ caller, tenantId }) =>
    caller.isAuthenticated &&
    caller.scopes.includes("invoice:a2a") &&
    tenantId === caller.claims?.tenantId,
  requestApproval: async (context) =>
    approvalService.decide({
      callerId: context.caller.id,
      operation: context.operation,
      entityType: context.entityType,
      entityId: context.entityId,
    }),
});

const authenticator = createBearerTokenAuthenticator({
  verify: async (token) => {
    const identity = await verifyAccessToken(token);
    return identity
      ? {
          id: identity.subject,
          scopes: identity.scopes,
          claims: { tenantId: identity.tenantId },
        }
      : null;
  },
});

const server = createA2AServer({
  card: buildAgentCard({
    url: "https://api.example.com/a2a",
    name: "Invoice Graph Agent",
    authentication: "bearer",
  }),
  authenticator,
  policy,
});

// Fetch-compatible runtimes: Workers, Bun, Deno, Hono, or a Node adapter.
export default {
  fetch(request: Request) {
    return server.fetch(request);
  },
};
```

`server.fetch()` serves both the discovery route and the configured JSON-RPC endpoint. Do not add a second, hand-written AgentCard route.

## Security model

Protocol validity never grants application authority.

```text
HTTP credential
  -> caller identity
  -> request/task visibility policy
  -> official A2A dispatcher
  -> graph entity/action/field policy
  -> destructive approval
  -> one atomic graph transaction
```

- `createDefaultDenyA2APolicy()` allows ordinary task protocol operations but denies every graph read and write.
- `createDenyAllA2APolicy()` denies protocol dispatch and graph access.
- `createEntityGraphA2APolicy()` builds explicit application rules.
- A batch is authorized in full before its transaction begins. One forbidden field rejects the entire batch.
- Hidden and nonexistent tasks have the same lookup error class for callers outside the owning scope.
- Approval metadata supplied by an agent cannot approve its own destructive operation.
- Bearer credentials are passed to the application's verifier and are never logged by the package.

The supplied bearer helper is an adapter, not a hosted identity system. Signature, issuer, audience, expiry, revocation, and tenant validation remain the host application's responsibility.

## Entity graph messages

Graph operations use an ordinary official A2A data part plus the Prometheus extension URI. They do not add a private member to the A2A `Part` union.

```ts
import {
  PROMETHEUS_GRAPH_EXTENSION_URI,
  Role,
  type EntityGraphA2ARequest,
  type Message,
} from "@prometheus-ags/entity-graph-a2a";

const request: EntityGraphA2ARequest = {
  kind: "prometheus.entity-graph.request",
  version: "1.0",
  operation: "mutate",
  mutations: [
    {
      op: "upsert",
      entityType: "Invoice",
      id: "invoice-1",
      data: { id: "invoice-1", amount: 100, status: "open" },
    },
  ],
};

const message: Message = {
  role: Role.ROLE_USER,
  messageId: crypto.randomUUID(),
  taskId: "",
  contextId: "",
  parts: [{
    content: { $case: "data", value: request },
    mediaType: "application/json",
    filename: "",
    metadata: { extensionUri: PROMETHEUS_GRAPH_EXTENSION_URI },
  }],
  metadata: {},
  extensions: [PROMETHEUS_GRAPH_EXTENSION_URI],
  referenceTaskIds: [],
};
```

Supported graph operations are `upsert`, `replace`, `remove`, `patch`, `clearPatch`, `query`, and `snapshot`. Local patches remain graph-local and are never represented as server-confirmed canonical data.

## Deterministic A2UI artifacts

The built-in executor can emit an A2UI surface without a model credential when the client requests `PROMETHEUS_A2UI_EXTENSION_URI`.

```ts
import {
  PROMETHEUS_A2UI_EXTENSION_URI,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  createA2UIArtifact,
  createDeterministicA2UIMessages,
} from "@prometheus-ags/entity-graph-a2a";

const messages = createDeterministicA2UIMessages(
  "The invoice is ready for review.",
  "invoice-review",
);
const artifact = createA2UIArtifact(messages, {
  artifactId: "invoice-review-artifact",
});

if (PROMETHEUS_A2UI_PROTOCOL_VERSION !== "v0.9.1") {
  throw new Error("unexpected protocol baseline");
}
void artifact;
void PROMETHEUS_A2UI_EXTENSION_URI;
```

This is a Prometheus-owned versioned adapter. It does not claim that the legacy upstream A2UI-for-A2A v0.8 extension defines v0.9.1 transport semantics. Renderer action authorization is still enforced by `@prometheus-ags/a2ui-react`.

For repeatable tests, pass `deterministicExecutor` options to `createA2AServer`:

```ts
const server = createA2AServer({
  card: buildAgentCard({ url: "http://127.0.0.1/a2a" }),
  deterministicExecutor: {
    clock: () => "2030-01-15T12:00:00.000Z",
    idFactory: (() => {
      let id = 0;
      return () => `fixture-${++id}`;
    })(),
    stepDelayMs: 25,
  },
});
```

## Optional external executor

`createExternalA2AExecutor()` discovers an AgentCard from an HTTPS or loopback base URL, selects JSON-RPC, streams the remote lifecycle, and remaps remote IDs into the local task boundary.

```ts
import {
  buildAgentCard,
  createA2AServer,
  createExternalA2AExecutor,
} from "@prometheus-ags/entity-graph-a2a";

const server = createA2AServer({
  card: buildAgentCard({ url: "https://gateway.example.com/a2a" }),
  executor: createExternalA2AExecutor({
    baseUrl: "https://agent.example.com",
    serviceParameters: { Authorization: `Bearer ${await issueAgentToken()}` },
  }),
});
```

The external endpoint is an opt-in runtime dependency. Default CI and the reference agent remain keyless and local.

## Migrating alpha consumers

The pre-v3 slash methods are intentionally absent from the package root and the A2A 1.0 endpoint.

| Alpha surface | Stable replacement |
| --- | --- |
| `/.well-known/agent.json` | `/.well-known/agent-card.json` |
| `tasks/send` | `SendMessage` |
| `tasks/sendSubscribe` | `SendStreamingMessage` over SSE |
| `tasks/get` | `GetTask` |
| `tasks/cancel` | `CancelTask` |
| bespoke part/status/task types | official `@a2a-js/sdk` types re-exported from the package root |
| `DefaultEntityGraphHandler` | `DeterministicEntityGraphExecutor` plus an application policy |

For a bounded migration window, import the explicit adapter:

```ts
import { createLegacyA2AAdapter } from "@prometheus-ags/entity-graph-a2a/legacy";

const legacy = createLegacyA2AAdapter({ server });
const response = await legacy.handleRequest(oldSlashMethodRequest, {
  requestedVersion: "1.0",
});
```

The legacy adapter translates retained send/get/cancel shapes. It does not expose legacy streaming; migrate streaming callers to the official SSE method. New code must not use this subpath.

## Verification

From the repository root:

```bash
pnpm run test:a2a-conformance
pnpm run verify:a2a-conformance
pnpm run test:a2a-tck
pnpm run bdd:a2a-conformance
pnpm --filter @prometheus-ags/entity-graph-a2a run verify:skills
```

The upstream gate pins `a2aproject/a2a-tck` at commit `5996b79f9cefa6fc390980e383e358a66fb9e49e`. Its receipt separates MUST, SHOULD, MAY, binding, capability exclusions, and candidate artifact hashes. A failed applicable MUST or unexplained selected-binding skip blocks the gate.

These checks certify the headless package boundary. Browser rendering, accessibility, and visual evidence are owned by the `v3-agentic-a2ui-example` showcase; no screenshot is evidence for a headless transport.

The runtime export ledger is [`a2a-library-exports.json`](../../prometheus-entity-skills/_shared/references/a2a-library-exports.json). Public root or `./legacy` export changes must update it.

## License

MIT
