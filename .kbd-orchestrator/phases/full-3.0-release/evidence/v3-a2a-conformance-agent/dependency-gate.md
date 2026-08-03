# Task 1 — dependency and execution-readiness gate

Date: 2026-08-01  
Change: `v3-a2a-conformance-agent`  
Verdict: **PASS TO IMPLEMENTATION; CURRENT ALPHA IS NOT A2A V1 CONFORMANT**

## Declared prerequisites

Both declared dependencies are complete, archived, promoted, and strictly valid.

| Dependency | Completion evidence | Promoted contract | Result |
| --- | --- | --- | --- |
| `v3-a2ui-protocol-bridge` | `openspec/changes/archive/2026-08-01-v3-a2ui-protocol-bridge`; all six tasks checked; `final-verification.json` says `pass-to-archive` | `openspec/specs/v3-a2ui-protocol-bridge/spec.md` | Pass |
| `v3-package-module-contracts` | `openspec/changes/archive/2026-08-01-v3-package-module-contracts`; all six tasks checked; packed 12-package verification passes | `openspec/specs/v3-package-module-contracts/spec.md` | Pass |

Reproduction:

```text
openspec validate v3-a2ui-protocol-bridge --strict
Specification 'v3-a2ui-protocol-bridge' is valid

openspec validate v3-package-module-contracts --strict
Specification 'v3-package-module-contracts' is valid
```

The A2UI prerequisite certifies official v0.9.1 rendering and the default-deny graph action boundary. It explicitly leaves agent transport, streaming, cancellation, and A2A conformance to this change. The package prerequisite proves loader/declaration/tarball behavior for the current twelve-package inventory; it does not make the A2A runtime protocol-correct.

## Deep-research and Feynman result

The change-specific ten-stage package is at `.research/v3-a2a-conformance-agent/`. The autonomous Feynman gate passes at `0.96` against `0.70`, with `misconceptions_absent: 1.0`. This records implementation understanding only and does not claim human mastery or completed conformance.

The background deep-research job `job-1785617542-b1bd0de1` remained at stage 0 and was cancelled. Official web sources, registry metadata, and pinned upstream source clones were used to complete the package manually. A direct Firecrawl tool was not callable in this session; no secondary-source assertion substitutes for the primary sources.

## Evidence-driven correction

The current `@prometheus-ags/entity-graph-a2a` alpha is not an A2A v1 implementation despite its package description and comments:

- discovery is `/.well-known/agent.json`, not `/.well-known/agent-card.json`;
- the AgentCard has bespoke root `specVersion`, `url`, `auth`, and capability fields instead of official v1 interfaces/security/skills;
- methods are `tasks/send`, `tasks/get`, and `tasks/cancel`, not v1 PascalCase operations;
- `ListTasks` is missing and `tasks/sendSubscribe` explicitly returns unsupported;
- task, part, artifact, and status models are locally invented;
- the server reaches the graph handler without a caller-scoped authorization boundary;
- existing tests exercise the bespoke surface, not official conformance.

Rebranding or aliasing those fields would preserve the runtime incompatibility. Task 2 must replace the stable wire surface and isolate any retained behavior behind an explicitly named legacy adapter.

## Pinned dependency and protocol facts

Registry check on 2026-08-01:

```json
{
  "version": "1.0.1",
  "engines": { "node": ">=20" },
  "dependencies": { "jose": "^6.2.3", "uuid": "^11.1.0" },
  "dist-tags": { "next": "1.0.1", "latest": "1.0.1" }
}
```

Selected baseline:

| Item | Pin / declaration | Consequence |
| --- | --- | --- |
| A2A protocol | v1 family; reviewed current patch 1.0.1 | declare `protocolVersion: "1.0"` per supported interface |
| JS SDK | `@a2a-js/sdk@1.0.1` | official types, handler, task store, executor, JSON-RPC transport, and event bus |
| SDK source | `f5ca7d05945a69cbf3dcd357203d4ce99201494f` | review and implementation reference |
| TCK source | `5996b79f9cefa6fc390980e383e358a66fb9e49e` | reproducible conformance scenarios and report contract |
| Stable binding claim | JSON-RPC only | SSE streaming; no implied REST/gRPC equivalence |
| A2UI payload | v0.9.1 validated messages | versioned adapter; dedicated official A2A extension remains v0.8 legacy |

## Sycophancy correction

The initial “adopt the official SDK” recommendation omitted meaningful costs and received a high-severity trade-off finding. The corrected strict result is zero:

- adopting the SDK adds `jose` and `uuid`, creates a breaking migration, and depends on a newly stable v1 API;
- exact pinning, packed module consumers, and deliberate upgrade review are required;
- JSON-RPC is the only binding this plan should claim;
- graph authorization remains Prometheus-owned and must execute before mutation;
- A2UI v0.9.1 transport cannot be mislabeled as conformance to a nonexistent verified v0.9 A2A extension;
- the TCK result must state binding, normative level, scenarios, skips, and exclusions.

## Authoritative implementation boundary for task 2

1. Use official v1 types and server transport primitives from exact `@a2a-js/sdk@1.0.1`; do not fork the wire schema.
2. Expose truthful JSON-RPC v1 discovery at `/.well-known/agent-card.json` and declare only implemented interfaces, skills, security, and capabilities.
3. Implement `SendMessage`, `SendStreamingMessage`, `GetTask`, `ListTasks`, `CancelTask`, and `SubscribeToTask`; SSE must produce observable ordered task/status/artifact events.
4. Parse credentials and execute caller/task/tenant/entity/action/field policy before any executor graph mutation. A denied or malformed call must leave graph state unchanged.
5. Preserve Components -> Hooks -> Stores/Adapters. A2A is an adapter boundary; it may call graph store methods after policy but cannot create a second canonical entity store.
6. Express graph and A2UI payloads through official structured parts plus explicit versioned extensions. Do not add proprietary members to the official Part union.
7. Provide an in-process deterministic reference executor requiring no API key and an optional external endpoint seam disabled in default CI.
8. Retain old methods only behind a documented compatibility subpath/adapter; never accept them silently as v1.
9. Pin the official TCK commit and defer its executable BDD/conformance receipt to task 3.
10. Do not claim or implement REST, gRPC, push notifications, signed cards, multi-tenant routing, production identity providers, publication, or a thirteenth npm package in this task.

## Evidence boundary

This task proves dependency completion and establishes a source-grounded implementation contract. It changes no UI, so visual evidence is not applicable yet. The downstream deterministic A2UI agent example and Docusaurus pages will require browser, accessibility, and visual receipts; the A2A package itself requires protocol, security, streaming, packed-consumer, and TCK evidence.

No registry, GitHub Pages environment, remote service, sibling repository, or publication state was mutated.

The canonical runtime now contains all six OpenSpec task definitions. Task 1 is complete and tasks 2-6 remain pending, so the change is correctly projected as 1/6 rather than complete. The immutable command IDs and before/after revisions are recorded in `control-plane-reconciliation.json`; no runtime-owned projection was hand-edited.
