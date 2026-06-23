# @prometheus-ags/entity-graph-htmx

Node.js SSE fragment server for [HTMX](https://htmx.org). Holds a Prometheus
entity graph server-side and streams HTML entity fragments over
Server-Sent Events so HTMX clients can apply
[idiomorph](https://github.com/bigskysoftware/idiomorph) morph swaps (or plain
OOB swaps) without a full-page reload.

Consumes `@prometheus-ags/entity-graph-sdl` for entity shape definitions so
your HTML renderers are always in sync with the schema.

---

## Quick start

```ts
import { createHtmxSseServer } from "@prometheus-ags/entity-graph-htmx";
import { parseSdlJson }        from "@prometheus-ags/entity-graph-sdl";
import { createServer }        from "node:http";

const ir = parseSdlJson(JSON.stringify({
  version: "1.0",
  entities: {
    Post: {
      fields: {
        id:        { type: "uuid",     primary: true },
        title:     { type: "string",   required: true },
        body:      { type: "string"  },
        published: { type: "boolean" },
      },
    },
  },
}));

const sseServer = createHtmxSseServer({
  ir,
  // Optional: supply your own HTML renderer per entity type.
  renderers: {
    Post: ({ entity }) =>
      `<article id="Post-${entity.id}" class="post">
        <h2>${entity.title}</h2>
        <p>${entity.body ?? ""}</p>
      </article>`,
  },
  swapStrategy: "morph", // idiomorph (default)
});

createServer((req, res) => sseServer.handleRequest(req, res)).listen(3000);

// Push changes from anywhere — a realtime adapter, a REST handler, a cron job:
await sseServer.push({
  op: "upsert",
  type: "Post",
  id: "1",
  entity: { id: "1", title: "Hello HTMX", body: "Streamed live." },
});
```

---

## HTMX client setup

```html
<!-- Include HTMX + idiomorph extension -->
<script src="https://unpkg.com/htmx.org@2"></script>
<script src="https://unpkg.com/htmx-ext-morph@2"></script>

<body hx-ext="morph">
  <!-- Subscribe to Post:1 via SSE -->
  <div hx-sse="connect:/sse?subscribe=Post:1 swap:entity-updated">
    <!-- The server pushes an OOB fragment; idiomorph morphs it in place -->
    <article id="Post-1" class="post">
      <h2>Initial title (SSR)</h2>
    </article>
  </div>
</body>
```

### Subscribe to multiple entities

```html
<div hx-sse="connect:/sse?subscribe=Post:1,Post:2,Tag:*">
  ...
</div>
```

`type:*` subscribes to **all** entities of that type (including future ones pushed
by the server).

---

## HTTP routes (built-in)

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/sse?subscribe=Type:id,...` | Open SSE stream |
| `POST` | `/entities/:type` | Create entity (id in body or auto-generated) |
| `PUT`  | `/entities/:type/:id` | Full replace |
| `PATCH`| `/entities/:type/:id` | Partial merge |
| `DELETE`| `/entities/:type/:id` | Remove entity |

All mutation endpoints write into the server-side graph and fan out SSE
`entity-updated` events to subscribed clients automatically.

---

## Custom renderer

```ts
import type { FragmentRenderer } from "@prometheus-ags/entity-graph-htmx";

const postRenderer: FragmentRenderer<{ id: string; title: string; body?: string }> = (ctx) => {
  const { entity, entityId, isRealtime } = ctx;
  return `<article id="Post-${entityId}"${isRealtime ? ' data-live="true"' : ""}>
    <h2>${entity.title}</h2>
    <p>${entity.body ?? "No body yet."}</p>
  </article>`;
};

const sseServer = createHtmxSseServer({ ir, renderers: { Post: postRenderer } });
```

Return `null` from a renderer to suppress the SSE event (e.g. ACL checks).

---

## Embedding in Express / Fastify

```ts
// Express
app.use((req, res, next) => {
  if (req.path.startsWith("/sse") || req.path.startsWith("/entities")) {
    sseServer.handleRequest(req, res);
  } else {
    next();
  }
});

// Fastify (raw mode)
fastify.addContentTypeParser("*", { parseAs: "string" }, (_req, body, done) => done(null, body));
fastify.all("/sse*", (request, reply) =>
  sseServer.handleRequest(request.raw, reply.raw)
);
```

---

## Options reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `ir` | `EntityGraphIR` | required | Parsed SDL intermediate representation |
| `renderers` | `Record<string, FragmentRenderer>` | `{}` | Per-type HTML renderers |
| `autoRender` | `boolean` | `true` | Auto-generate `<dl>` for types without a renderer |
| `swapStrategy` | `string` | `"morph"` | HTMX OOB swap strategy |
| `heartbeatIntervalMs` | `number` | `30000` | Ping interval to keep connections alive |
| `mutationHandler` | `function` | — | Intercept non-entity routes |

---

## Architecture

```
Browser (HTMX + idiomorph)
        │  SSE stream (text/event-stream)
        │  HTML fragment in event body
        ▼
createHtmxSseServer          ← Layer 3: HTTP + SSE routing
        │
        ▼
createServerGraph             ← Layer 1: entity graph (useGraphStore from core)
        │  onEntityChanged listener
        ▼
renderFragment                ← Fragment assembly
        │  custom renderer or autoRenderEntity
        ▼
wrapOobFragment               ← HTMX OOB envelope
        │  hx-swap-oob="morph:#Post-1"
        ▼
SseClient.send()              ← SSE wire frame
```

Data flow is strictly layered. The HTTP surface never touches the graph
directly; it calls graph methods which fire change events that the SSE layer
receives and fans out to clients.

---

## Development

```bash
pnpm install
pnpm --filter @prometheus-ags/entity-graph-htmx build
pnpm --filter @prometheus-ags/entity-graph-htmx typecheck
pnpm --filter @prometheus-ags/entity-graph-htmx test
```
