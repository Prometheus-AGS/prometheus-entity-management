# A2A v1 conformance research report

## Executive verdict

**Proceed to implementation, but treat the existing alpha as migration material, not an A2A v1 base.** It is structurally nonconforming even though its package metadata and source comments say “v1.0.” The release should adopt `@a2a-js/sdk@1.0.1`, expose only the JSON-RPC v1 binding, put graph authorization before mutation, ship a deterministic reference executor, and verify a pinned official TCK subset with explicit scope.

The recommendation is intentionally narrower than the aspiration. This change does not need REST, gRPC, push notifications, signed Agent Cards, tenant routing, a hosted identity provider, or an external model API to satisfy the phase plan. Claiming those without implementation and evidence would weaken the 3.0 release.

## What the local audit found

| Surface | Current alpha | Required v1 direction |
| --- | --- | --- |
| Discovery | `/.well-known/agent.json` | `/.well-known/agent-card.json` |
| AgentCard | root `specVersion`, `url`, `auth`, capability array | official `supportedInterfaces`, capabilities object, skills, security schemes/requirements |
| Methods | `tasks/send`, `tasks/get`, `tasks/cancel`, unsupported `tasks/sendSubscribe` | `SendMessage`, `SendStreamingMessage`, `GetTask`, `ListTasks`, `CancelTask`, `SubscribeToTask` |
| Task model | bespoke session/history/artifact/status fields | official v1 Task, Message, Part, Artifact, status, timestamps, context |
| Streaming | explicitly unsupported | SSE event stream with ordered task/status/artifact events |
| Policy | handler reaches graph directly | authenticated/authorized call context before any executor graph mutation |
| Conformance | local fake requests only | focused tests plus pinned official TCK report |

This is a breaking correction. Hiding it behind renamed TypeScript aliases would leave runtime interoperability broken.

## Dependency decision

Use the stable official SDK at exact version `1.0.1` for this change. Registry inspection on 2026-08-01 reports Node `>=20`, runtime dependencies `jose ^6.2.3` and `uuid ^11.1.0`, and both `latest` and `next` at `1.0.1`. The repository's Node contract satisfies the SDK floor.

The official server package exposes the protocol types, `AgentExecutor`, `DefaultRequestHandler`, `InMemoryTaskStore`, `JsonRpcTransportHandler`, call context, and event bus. Prometheus should adapt these. It should not fork the protocol schema or dispatcher.

Costs and controls:

- New runtime dependencies and a public API migration are real costs.
- The v1 SDK became stable recently, so pin the exact version for 3.0 and review upgrades.
- Packed ESM, CommonJS, TypeScript NodeNext/Node16, and server-runtime consumers must run because package-source tests are insufficient.
- SDK adoption does not supply Prometheus graph authorization or deterministic business behavior; those remain application-owned.

## Binding and operation contract

The stable package should declare only JSON-RPC. Its AgentCard must accurately advertise the one implemented interface and its `protocolVersion: "1.0"`. The task scope requires discovery, send, get, list, cancel, streaming send, and task subscription. JSON-RPC streaming must use SSE.

Do not advertise a capability merely because the SDK has a type for it. Push notification configuration, extended cards, JWS signing, REST, gRPC, and multi-tenant routing remain absent until separately implemented and tested.

## Security contract

The request path is:

`HTTP credential validation -> caller context -> task visibility / graph policy -> official A2A dispatcher -> Prometheus executor -> graph store`

Denials before the executor must leave the graph unchanged. Entity operations need tenant/scope, entity-type, entity-id, action, and field checks. Destructive operations retain the explicit approval boundary established by the A2UI bridge. A task that is nonexistent and one that is invisible to a caller must not be distinguishable through resource lookup behavior.

## A2UI artifact boundary

A2A supports structured data in message/artifact parts and URI-identified extensions. A2UI v0.9.1 is this repository's stable renderer baseline. However, the dedicated official A2UI-for-A2A extension page currently labels its contract v0.8 and legacy. The A2UI catalog documentation still demonstrates the v0.8 extension URI alongside v0.9 catalog IDs.

Therefore task 2 must do one of two things, in this order:

1. Adopt an exact current upstream extension URI and schema only if the pinned upstream source proves it supports v0.9.1; or
2. Define a Prometheus-owned, versioned extension/metadata adapter that carries validated v0.9.1 messages as A2A structured data and explicitly says it is not upstream extension certification.

The adapter must never bypass the renderer/action policy boundary.

## Deterministic reference agent

The in-process agent should require no model key. Given fixed fixtures, it must emit repeatable task IDs or injectable IDs/time, lifecycle transitions, streamed status/artifact events, and A2UI artifacts. It should cover happy, malformed, denied, hidden, cancelled, and optional external-endpoint paths. The optional external seam must not run in default CI.

## Conformance proof

Pin the official TCK at commit `5996b79f9cefa6fc390980e383e358a66fb9e49e` until a reviewed protocol-update task moves it. The SDK source reviewed for this gate is v1.0.1 commit `f5ca7d05945a69cbf3dcd357203d4ce99201494f`.

The TCK receipt must include:

- target URL and immutable candidate SHA;
- A2A protocol family and TCK commit;
- JSON-RPC binding;
- MUST, SHOULD, and MAY counts separately;
- passed, failed, skipped, and unsupported scenarios;
- JSON, HTML, and JUnit artifacts where supported;
- an explicit exclusions list.

The release blocker is any failed applicable MUST or any silent skip. SHOULD/MAY results inform release notes but do not get rewritten as MUST certification.

## Task 2 implementation contract

1. Replace the bespoke public wire types with official SDK v1 types or narrow Prometheus wrappers around them.
2. Implement a Fetch-compatible JSON-RPC adapter using the official transport handler and SSE stream response.
3. Serve the official card at `/.well-known/agent-card.json` with only truthful interfaces, skills, capabilities, and security declarations.
4. Implement send, stream, get, list, cancel, and subscribe through the official handler/store/executor boundary.
5. Put credential parsing and application authorization before executor graph access; prove denied calls do not mutate state.
6. Translate graph requests through ordinary structured data plus a versioned Prometheus extension contract; do not add bespoke Part union members to the v1 wire model.
7. Add the deterministic no-key reference executor and an optional external endpoint seam.
8. Preserve old methods only behind a documented `./legacy`-style compatibility boundary, if retained at all.
9. Do not expand the package inventory or claim unsupported bindings/features.
10. Defer test ledgers, docs synchronization, clean-room gates, and archive evidence to their already planned tasks 3-6.

## Release status

This research gate authorizes task 2 implementation only. It does not certify the package, the complete 3.0 release, npm publication, GitHub Pages deployment, or any external environment mutation.

## Primary sources

- https://a2a-protocol.org/latest/specification/
- https://a2a-protocol.org/latest/whats-new-v1/
- https://a2a-protocol.org/latest/topics/agent-discovery/
- https://github.com/a2aproject/a2a-js/releases
- https://github.com/a2aproject/a2a-tck
- https://a2ui.org/specification/v0.9-a2ui/
- https://a2ui.org/specification/v0.8-a2a-extension/
