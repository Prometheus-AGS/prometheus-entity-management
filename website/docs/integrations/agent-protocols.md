---
title: A2A and policy-controlled A2UI
sidebar_position: 5
---

# Protocol validity never grants graph authority

The A2A package implements the JSON-RPC task lifecycle and caller-scoped task
access. A2UI renders official surface messages through a safe widget catalog.
An application-owned action catalog validates intent, checks policy, requests
human approval where required, and only then calls graph/store operations.

Malformed messages, unknown widgets, unauthorized actions, cancellation, and
denial fail closed. External agents may propose UI or intent; they cannot bypass
tenant boundaries, service validation, or the application action policy.

## Delivering A2UI over AG-UI

A2UI surfaces reach the browser as AG-UI activities. The runtime treats that
delivery as unreliable: redelivered, restated and out-of-order activities are
reconciled instead of replayed, versioned deltas apply in order, every executed
action carries a globally unique id, and resource limits bound what an agent can
ask for. The full guide is the [A2UI and AG-UI](../a2ui/index.md) section:

- [AG-UI delivery](../a2ui/agui-delivery.md)
- [Deltas and resync](../a2ui/deltas-and-resync.md)
- [Actions](../a2ui/actions.md)
- [Limits and security](../a2ui/limits-and-security.md)
- [Headless runtime and export](../a2ui/headless-and-export.md)
