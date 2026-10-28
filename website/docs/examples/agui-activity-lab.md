---
title: AG-UI activity lab
sidebar_position: 5
description: Run a real AG-UI producer and React consumer to replay, reorder and overload the A2UI runtime.
---

# See the runtime handle a hostile stream

The `examples/agui-activity-lab` example pairs a real AG-UI 1.0 producer with a
React consumer so you can reproduce, by hand or from a test, what a real network
does to an agent stream: redelivery, reordering, gaps, retries and floods.

- The **producer** is a plain `node:http` server that streams AG-UI events over
  Server-Sent Events. Every event is checked against the `@ag-ui/core` 1.0
  schemas first, so the runtime sees a valid AG-UI stream.
- The **consumer** is a Vite and React app. A store owns the connections and the
  network calls, a hook feeds events to the runtime, and the components only
  render, following the repository's Components → Hooks → Stores → Services flow.

```bash
pnpm install
pnpm --filter prometheus-agui-activity-lab-example producer   # http://127.0.0.1:5176
pnpm --filter prometheus-agui-activity-lab-example dev        # http://localhost:5173
```

Open `http://localhost:5173/?producer=http://127.0.0.1:5176&stream=a,b` to follow
two streams at once, which reproduces two streams carrying the same activity.

Drive the producer with `POST /control/emit` and read what the consumer sent
back from `GET /control/envelopes`. The example README lists every endpoint.

## What the acceptance run proves

The hardening is verified against this real producer and consumer, not against
mocks: 17 browser flows, 4 headless checks and 6 Cucumber scenarios covering
redelivery, ordering, deltas, actions, limits and export. Verification is local;
see the example README for the commands.

Read the concepts first in [A2UI and AG-UI](../a2ui/index.md).
