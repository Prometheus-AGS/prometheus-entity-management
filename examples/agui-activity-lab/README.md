# AG-UI activity lab

A real AG-UI 1.0 producer and a real React consumer, built to show how
`@prometheus-ags/a2ui-react` behaves when activities are redelivered, arrive out
of order, carry deltas, or push the runtime past its limits. It is the
acceptance harness for the A2UI runtime hardening (GitHub #70 to #73), and it is
a working reference for wiring AG-UI to the runtime.

- **Producer** (`server/`): a plain `node:http` server that streams AG-UI events
  over Server-Sent Events. Every event is checked against the `@ag-ui/core` 1.0
  schemas before it is sent, so the runtime sees a valid AG-UI stream.
- **Consumer** (`src/features/lab/`): a Vite + React app. A Zustand store owns
  the `EventSource` connections and the `fetch` calls, a hook feeds events to
  `runtime.processAgUiEvent`, and the console component only renders. Components
  never touch the stores or the network directly.

## Run it

From the repository root (pnpm only):

```bash
pnpm install
pnpm --filter prometheus-agui-activity-lab-example producer   # http://127.0.0.1:5176
pnpm --filter prometheus-agui-activity-lab-example dev        # http://localhost:5173
```

Open the consumer with the producer and the streams to follow:

```text
http://localhost:5173/?producer=http://127.0.0.1:5176&stream=a,b
```

Naming two streams makes the consumer subscribe to both, which is how the lab
reproduces "two streams carry the same activity". `LAB_PRODUCER_PORT` changes the
producer port.

## Producer endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /events?stream=<name>` | SSE stream; the default stream is `default` |
| `POST /control/emit` | `{ stream?, event, copies? }` delivers a validated AG-UI event |
| `POST /actions` | receives the consumer's action envelope; idempotent by `actionId` |
| `POST /control/reject-next` | the next `/actions` reply carries a stale-action rejection |
| `GET /control/envelopes` | every envelope received, in order, with a `duplicate` flag |
| `POST /control/reset` | forget envelopes and drop open streams |
| `GET /health` | liveness |

The producer holds no scenario. A script, a test or a person with `curl` drives
it through `/control/emit` and reads the result from `/control/envelopes`.

```bash
curl -s -X POST http://127.0.0.1:5176/control/emit \
  -H 'content-type: application/json' \
  -d '{"event":{"type":"ACTIVITY_SNAPSHOT","messageId":"m1","activityType":"a2ui-surface","replace":true,"content":{"surfaceVersions":{"s1":{"version":1}},"a2ui_operations":[{"version":"v0.9.1","createSurface":{"surfaceId":"s1","catalogId":"urn:prometheus-ags:a2ui:catalog:v3","theme":{}}}]}}}'
```

## What the lab covers

The acceptance flows each name the scenario they prove (`AUI-1` to `AUI-19`):

- redelivery of the same activity, from a reconnect, a second stream, and a
  `MESSAGES_SNAPSHOT`, never rolls a surface back or loses typed input;
- out-of-order versions are ignored, a producer restart (a higher epoch) is
  honored, and same-key-different-content is reported as a producer fault;
- `ACTIVITY_DELTA` applies in order, waits when a version is missing, and
  requests a resync when the gap does not close;
- action envelopes carry a unique UUIDv7 `actionId` and `heldVersion`, a retry
  reuses the id, and the producer treats a repeated id as one action;
- a stale-action rejection repairs the surface;
- resource limits reject the whole call and leave every surface unchanged;
- the headless runtime and `exportSurfaceMessages` rebuild a surface losslessly.

## Verify it

Verification is local and runs against the assembled system; there is no CI
path. Build the consumer first, because the browser run serves the production
build:

```bash
pnpm --filter prometheus-agui-activity-lab-example build
pnpm exec playwright test --config tests/browser/v4-a2ui-runtime-hardening.playwright.config.ts
node --import tsx tests/headless/v4-a2ui-headless.run.ts
node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --config cucumber.mjs --tags '@v4-a2ui-runtime-hardening'
```

Receipts are written under
`.kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/evidence/`.

## Read next

- Guided documentation: the **A2UI and AG-UI** section of the documentation site
  (`website/docs/a2ui/`).
- Reference: [`packages/a2ui-react/README.md`](../../packages/a2ui-react/README.md).
- Wire contract for other runtimes:
  [`release/a2ui-protocol-bridge.md`](../../release/a2ui-protocol-bridge.md).
