# @prometheus-ags/entity-graph-a2a

A2A (Agent-to-Agent) v1.0 server for the [Prometheus entity graph](../../README.md).

Exposes an `AgentCard` advertising entity-graph capabilities, routes incoming
A2A `Task` messages to graph mutations and queries, and returns structured
`Artifact` results.

## Installation

```bash
pnpm add @prometheus-ags/entity-graph-a2a @prometheus-ags/entity-graph-core
```

## Quick Start

```ts
import {
  createA2AServer,
  buildAgentCard,
  DefaultEntityGraphHandler,
} from "@prometheus-ags/entity-graph-a2a";
import { registerEntityTransport, makeRestTransport } from "@prometheus-ags/entity-graph-core";

// 1. Register entity transports (once at boot).
registerEntityTransport("Invoice", makeRestTransport({ supabase, table: "invoice" }));

// 2. Create the A2A server.
const server = createA2AServer({
  card: buildAgentCard({
    url: "https://api.example.com/a2a",
    name: "Invoice Graph Agent",
  }),
  handler: new DefaultEntityGraphHandler(),
});

// 3a. Cloudflare Workers / Bun / Deno — use the Fetch API handler.
export default { fetch: (req: Request) => server.fetch(req) };

// 3b. Hono
app.post("/a2a", (c) => server.fetch(c.req.raw));
app.get("/.well-known/agent.json", (c) =>
  c.json(server.getCard())
);

// 3c. Express / Fastify — use handleRequest() directly.
app.post("/a2a", async (req, res) => {
  const response = await server.handleRequest(req.body);
  res.status("error" in response ? 400 : 200).json(response);
});
```

## Supported A2A Methods

| Method | Description |
|--------|-------------|
| `tasks/send` | Create or continue a task. Dispatches `Part`s to the handler. |
| `tasks/get` | Retrieve a task by id, optionally trimming history. |
| `tasks/cancel` | Cancel a non-terminal task. |

## Built-in Graph Capabilities

| Capability | Description |
|------------|-------------|
| `graph/upsert` | Shallow-merge entities into the canonical graph. |
| `graph/replace` | Full-replace entities (stale keys dropped). |
| `graph/remove` | Remove entities from the graph. |
| `graph/patch` | Apply UI-only patch fields (not sent to server). |
| `graph/query` | Read entities or lists from the graph. |
| `graph/snapshot` | Export the full entity graph as a structured artifact. |

## Task Message Parts

The `DefaultEntityGraphHandler` understands these Part types:

### `graph/mutation`

```ts
const mutation: GraphMutationPart = {
  type: "graph/mutation",
  mutations: [
    { op: "upsert", entityType: "Invoice", id: "inv-1", data: { id: "inv-1", amount: 100 } },
    { op: "patch", entityType: "Invoice", id: "inv-1", patch: { _selected: true } },
    { op: "remove", entityType: "Invoice", id: "inv-old" },
  ],
};
```

### `graph/query`

```ts
const query: GraphQueryPart = {
  type: "graph/query",
  entityType: "Invoice",
  id: "inv-1",           // single-entity lookup
  // listKey: "invoices", // or list lookup
  // limit: 10,
};
```

### `text`

Text parts receive an "Acknowledged: …" echo reply.

## Custom Handler

```ts
import type { A2ATaskHandler, TaskHandlerContext, TaskHandlerResult } from "@prometheus-ags/entity-graph-a2a";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";

class MyHandler implements A2ATaskHandler {
  async handle(ctx: TaskHandlerContext): Promise<TaskHandlerResult> {
    const { message, graphState } = ctx;

    // Read from graph, call APIs, compute results...

    useGraphStore.getState().upsertEntity("Result", "r-1", { id: "r-1", value: 42 });

    return {
      status: { state: "completed" },
      artifacts: [{
        id: "my-artifact",
        type: "data",
        content: { answer: 42 },
        mimeType: "application/json",
        createdAt: new Date().toISOString(),
      }],
    };
  }
}
```

## AgentCard Discovery

Serve the AgentCard at `GET /.well-known/agent.json`:

```ts
// Express
app.get("/.well-known/agent.json", (_req, res) => res.json(server.getCard()));

// Fetch API
if (url.pathname === "/.well-known/agent.json") {
  return Response.json(server.getCard());
}
```

## Architecture

```
Client Agent ──POST /tasks──▶ A2AServer.handleRequest()
                                      │
                               tasks/send dispatcher
                                      │
                            A2ATaskHandler.handle(ctx)
                                      │
                        DefaultEntityGraphHandler
                          ┌───────────┴────────────┐
                   GraphMutationPart         GraphQueryPart
                          │                        │
                createGraphTransaction      useGraphStore.getState()
                          │                        │
                   Entity Graph (core)      Entity Graph (core)
```

Data flows strictly upward into the entity graph. The A2A server is a thin
dispatch layer — it never reimplements graph logic.

## License

MIT
