# Agentic A2A + A2UI example

This React 19/Vite 8 application demonstrates the complete safe agentic path for
the shared Prometheus entity-management domain:

```text
Component → hook → session store → A2A client/server adapter
                                ↓ streamed A2UI artifact
Official A2UI renderer → exact action policy → command store → canonical graph
```

The default path runs a deterministic in-process A2A v1 reference agent. It
requires no model credential and emits official A2UI v0.9.1 messages. The
rendered actions demonstrate:

- a valid `task.update` that updates both the ID-backed list and detail view;
- application authorization denial for `task.delete`;
- explicit human approval for `task.archive`;
- context validation failure for a malformed `task.update`;
- default-deny rejection of the undeclared `system.run` action;
- rejection of an artifact containing an unapproved A2UI component; and
- cancellation while an A2A task is in the working state.

## Run locally

From the repository root:

```bash
pnpm install
pnpm run dev:agentic-a2ui
```

The application is served at <http://localhost:5174>.

## Optional external A2A agent

Set an explicit external endpoint to replace the deterministic executor:

```bash
VITE_EXTERNAL_A2A_URL=https://agent.example.com pnpm run dev:agentic-a2ui
```

The endpoint must expose standard AgentCard discovery and an A2A v1 JSON-RPC
interface that can return the Prometheus A2UI extension. Plain HTTP is accepted
only for loopback development by the A2A adapter. The browser example does not
accept or embed an agent token; authenticated production routing belongs in a
server-side gateway.

## Architecture invariants

- Components access application and graph state only through hooks.
- The project task list stores IDs only.
- Task entities live once in the canonical graph.
- A2A/A2UI input is validated at the protocol boundary.
- Protocol-valid actions do not acquire application authority automatically.
- No action can bypass the exact action catalog, tenant policy, or approval
  callback.
- Starting or resetting a scenario clears every prior agent surface through
  official A2UI deletion messages, so a failed run cannot display stale UI.
- Only one destructive approval may be pending; overlapping requests fail
  closed without replacing the active human decision.
