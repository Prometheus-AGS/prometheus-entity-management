# v3-a2a-conformance-agent — implementation evidence

Date: 2026-08-01  
OpenSpec task: 2 of 6  
Status: implementation complete; conformance fixtures and release verification remain tasks 3–6

## Implemented protocol boundary

- Replaced the bespoke slash-method wire surface with the official `@a2a-js/sdk@1.0.1` A2A v1 JSON-RPC codecs, request handler, task store, task lifecycle, errors, and SSE framing.
- Serves the official AgentCard discovery document at `/.well-known/agent-card.json` and advertises only a JSON-RPC `1.0` interface.
- Dispatches the official `SendMessage`, `SendStreamingMessage`, `GetTask`, `ListTasks`, `CancelTask`, and `SubscribeToTask` method family through the pinned SDK.
- Rejects an absent/unsupported A2A version with the official JSON-RPC version error. The Fetch surface requires `application/json`, caps request bodies, and returns SSE for streaming calls.
- Uses the SDK task store's tenant/user ownership scope so an inaccessible task resolves through the not-found path instead of disclosing its existence.

## Application security and graph behavior

- Authentication is a host-supplied adapter. AgentCard security declarations contain scheme metadata only; credentials remain in HTTP headers.
- Protocol validity does not grant graph authority. The default graph policy denies every graph operation, while `createEntityGraphA2APolicy` requires explicit entity, action, and field allowlists.
- All operations in a graph batch are authorized before opening the transaction. `replace` and `remove` additionally require an explicit out-of-band approval decision.
- Structured graph data uses a versioned Prometheus extension URI and official A2A data Parts. Mutations use the canonical core graph transaction; queries and snapshots read merged canonical entities and patches.
- A deterministic in-process executor needs no model key. It emits submitted/working/terminal task state and deterministic graph or A2UI artifacts, with a cancellation checkpoint.

## A2UI and remote seams

- A2UI v0.9.1 messages are carried as an official A2A Artifact data Part under a Prometheus-owned versioned adapter URI and media type.
- The adapter does not claim that the upstream legacy A2UI-for-A2A v0.8 extension defines v0.9.1 transport semantics.
- The optional external executor performs standard AgentCard discovery, selects JSON-RPC only, streams remote lifecycle events, remaps remote IDs at the local task boundary, and forwards cancellation while execution is active.

## Compatibility boundary

- Pre-v3 `tasks/send`, `tasks/get`, and `tasks/cancel` calls are available only from `@prometheus-ags/entity-graph-a2a/legacy`.
- The adapter translates legacy text/data/graph Parts to official A2A v1 shapes and maps client legacy IDs to server-generated task IDs.
- Legacy subscription returns an explicit migration error directing consumers to `SendStreamingMessage` plus SSE. The package root does not export the old slash-method protocol types or handlers.

## Explicit exclusions preserved

- No REST binding, gRPC binding, push notifications, signed AgentCards, or extended-card endpoint is advertised or implemented.
- No claim of verified multi-tenant application isolation is made beyond the pinned SDK store's caller/tenant scoping; broader tenant policy remains an application responsibility.
- No model provider, API key, hosted agent, or assistant-ui dependency is required.
- The AgentCard implementation version remains `3.0.0-alpha.0` until the complete release certification phase succeeds.

## Files

- `packages/entity-graph-a2a/src/server.ts`
- `packages/entity-graph-a2a/src/agent-card.ts`
- `packages/entity-graph-a2a/src/handler.ts`
- `packages/entity-graph-a2a/src/policy.ts`
- `packages/entity-graph-a2a/src/a2ui-artifact.ts`
- `packages/entity-graph-a2a/src/external-executor.ts`
- `packages/entity-graph-a2a/src/store.ts`
- `packages/entity-graph-a2a/src/types.ts`
- `packages/entity-graph-a2a/src/index.ts`
- `packages/entity-graph-a2a/src/legacy/index.ts`
- `packages/entity-graph-a2a/package.json`
- `packages/entity-graph-a2a/tsup.config.ts`
- `pnpm-lock.yaml`

## Commands and observed results

```text
pnpm add @a2a-js/sdk@1.0.1 --filter @prometheus-ags/entity-graph-a2a --save-exact
PASS — exact runtime dependency recorded with pnpm

pnpm --filter @prometheus-ags/entity-graph-a2a typecheck
PASS

pnpm --filter @prometheus-ags/entity-graph-a2a build
PASS — ESM/CJS/declarations emitted for root and legacy entrypoints

pnpm exec eslint packages/entity-graph-a2a/src packages/entity-graph-a2a/tsup.config.ts --max-warnings 0
PASS

node --input-type=module <built transport smoke probe>
PASS — 4 SSE events; A2UI v0.9.1 extension response header; legacy graph translation; unauthenticated HTTP 401; denied mutation absent from graph
```

`pnpm exec prettier --check ...` was unavailable because Prettier is not installed in this workspace; no formatting success is claimed. Task 3 owns replacement of the obsolete alpha tests with official protocol, authorization, cancellation, consumer, and TCK-derived fixtures. This implementation record therefore does not claim that the change acceptance criteria or archive gate are complete.
