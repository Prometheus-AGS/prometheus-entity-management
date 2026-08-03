# A2A 1.0 JSON-RPC conformance and deterministic reference agent

`v3-a2a-conformance-agent` replaces the alpha package's bespoke, nonconforming task protocol with the official A2A 1.0 wire model and a deliberately bounded JSON-RPC implementation.

## Release decision

| Decision | Stable 3.0 position |
| --- | --- |
| Official SDK | exact `@a2a-js/sdk@1.0.1` |
| Protocol | A2A `1.0` |
| Binding | JSON-RPC only |
| Discovery | `/.well-known/agent-card.json` |
| Streaming | SSE |
| Reference behavior | deterministic, local, no model credential |
| Graph policy | default deny; application-owned entity/action/field authority |
| A2UI transport | Prometheus-owned v0.9.1 structured-data adapter |
| Legacy API | explicit `@prometheus-ags/entity-graph-a2a/legacy` subpath only |
| Upstream proof | official TCK pinned at `5996b79f9cefa6fc390980e383e358a66fb9e49e` |

The previous alpha's `/.well-known/agent.json`, slash methods, custom Task/Part unions, and promise-only pseudo-streaming were not A2A v1 despite their labels. The stable correction is intentionally breaking.

## Implemented lifecycle

The official request handler and store implement:

- `SendMessage`;
- `SendStreamingMessage`;
- `GetTask` with history limits;
- `ListTasks` with context/status/page filters;
- `CancelTask` with terminal-state guards; and
- `SubscribeToTask` with task visibility and terminal-state guards.

Streaming sends task, working status, artifact, and terminal status envelopes in order over SSE. The server primes the upstream async generator before committing an SSE response, so immediate task-not-found or terminal-subscription errors remain structured JSON-RPC errors rather than false-success streams.

AgentCard responses include protocol-version, cache, ETag, and Last-Modified headers. The card declares streaming and the two Prometheus extensions, while truthfully disabling push notifications and extended cards.

## Security boundary

The stable order is:

```text
credential -> caller -> request/task visibility -> official dispatcher
           -> graph entity/action/field policy -> approval -> atomic transaction
```

Protocol parsing is not authorization. Protocol validity never grants application authority. A syntactically valid message and a valid bearer credential grant no graph authority.

The focused tests prove:

- failed authentication returns before dispatch and cannot mutate the graph;
- graph access is default-denied;
- a mixed batch is preauthorized in full, so one forbidden field rolls back every mutation;
- replace/remove operations require an out-of-band approval hook;
- caller-scoped task storage does not reveal hidden tasks; and
- policy reasons are retained for trusted audit code but not reflected verbatim to untrusted callers.

The bearer helper only parses and delegates token verification. The host remains responsible for signature, expiry, issuer, audience, scope, revocation, tenant, and key rotation.

## A2UI boundary

A2A artifacts carry validated A2UI v0.9.1 messages inside official structured-data Parts. The extension URI is Prometheus-owned and versioned because the dedicated upstream A2UI-for-A2A page still documents a legacy v0.8 contract.

This adapter proves deterministic payload version, extension, catalog, and media metadata. It does not replace the official A2UI renderer, and it never bypasses the renderer's graph action policy. Browser rendering and accessibility remain separate evidence.

## Package and declaration proof

`pnpm run verify:a2a-conformance` packs the core and A2A candidates, validates their manifests and payloads, installs them without workspace aliases, and exercises:

- ESM discovery and official task lifecycle;
- CommonJS root and migration subpath loading;
- TypeScript NodeNext declarations;
- TypeScript Node16 declarations;
- injected external AgentCard discovery, JSON-RPC streaming, service
  parameters, and local lifecycle-ID remapping;
- exact SDK dependency rewriting; and
- isolation of legacy exports from the stable root.

The SDK supplies CommonJS runtime conditions but ESM-tagged declarations. The A2A build therefore normalizes its generated `.d.cts` SDK references with TypeScript `resolution-mode: import`. The strict consumers use `skipLibCheck: false`; this is tested declaration behavior, not a hidden compiler exception.

## Official TCK evidence

`pnpm run test:a2a-tck` performs a fresh, immutable checkout of the official TCK, builds the candidate, starts a real loopback HTTP server, runs the JSON-RPC compatibility suite, and writes:

- `compatibility.json`;
- `compatibility.html`;
- self-contained pytest HTML;
- JUnit XML;
- raw stdout/stderr; and
- a hashed receipt binding the exact built ESM/CJS/declaration artifacts.

The current task-3 receipt records 93 passed tests and 172 upstream skips. In the requirement ledger, 59 selected JSON-RPC MUST requirements pass and zero fail. AgentCard has zero MUST failures. Fourteen JSON-RPC requirements are explicitly inapplicable because the truthful card enables streaming, has no required extension, and disables push notifications and extended cards.

The runner blocks on:

- any failed process;
- any failed applicable JSON-RPC or AgentCard MUST; or
- any selected-binding skip without a checked-in rationale.

REST, gRPC, and capabilities not declared by the card are exclusions, not passes.

## Migration map

| Alpha | Stable 3.0 |
| --- | --- |
| `/.well-known/agent.json` | `/.well-known/agent-card.json` |
| `tasks/send` | `SendMessage` |
| `tasks/sendSubscribe` | `SendStreamingMessage` over SSE |
| `tasks/get` | `GetTask` |
| `tasks/cancel` | `CancelTask` |
| custom `GraphMutationPart` | official data Part + `PROMETHEUS_GRAPH_EXTENSION_URI` |
| custom handler | official `AgentExecutor` boundary / deterministic executor |
| root compatibility symbols | explicit `./legacy` import |

The legacy adapter provides bounded send/get/cancel translation. It intentionally rejects legacy streaming. Stable consumers should migrate immediately because the subpath is a compatibility seam, not a second protocol.

## Commands

```bash
pnpm run test:a2a-conformance
pnpm run verify:a2a-conformance
pnpm run test:a2a-tck
pnpm run bdd:a2a-conformance
pnpm --filter @prometheus-ags/entity-graph-a2a run verify:skills
```

## Evidence

- focused and packed receipt: `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent/task-3-test-receipt.md`
- packed consumer JSON: `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent/packed-consumer-report.json`
- official TCK receipt: `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent/tck/receipt.json`
- BDD feature: `tests/features/release/v3-a2a-conformance-agent.feature`
- runtime ledger: `prometheus-entity-skills/_shared/references/a2a-library-exports.json`
- final verification: `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent/verification.md`
- artifact-refiner QA: `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent/artifact-refiner-qa.md`
- release impact: `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2a-conformance-agent/release-impact.md`

## Certification limits

This gate certifies the headless A2A 1.0 JSON-RPC package boundary and deterministic A2UI artifact metadata. It does not certify:

- REST or gRPC bindings;
- push notifications, signed or extended cards, and extension signing;
- a hosted identity provider or portable Flint issuer/RLS contract;
- a remote model or third-party agent service;
- the complete agentic A2UI showcase;
- rendered browser, accessibility, keyboard, or visual behavior;
- Flutter/Tauri platform flows;
- GitHub Pages deployment;
- registry authority, provenance, RC recovery, or stable publication.

Those claims remain owned by their named downstream changes. This gate alone does not authorize npm publication.
