# Official A2UI protocol bridge

Use this reference when an agent creates, reviews, or documents an official
A2UI surface, catalog, action, or Prometheus graph projection.

The full engineering and evidence contract is
[`release/a2ui-protocol-bridge.md`](../../../release/a2ui-protocol-bridge.md).
The machine runtime-export ledger is
[`a2ui-library-exports.json`](a2ui-library-exports.json).

## First distinction

**Protocol validity never grants application authority.**

Official A2UI validation answers whether a message, catalog component, data
binding, or action is structurally valid. It does not authorize a tenant,
entity, field, graph write, URL navigation, or destructive operation.

A useful mental model is: the catalog is an approved vocabulary, not a database
credential.

## Package imports

Use the package root only for official A2UI:

```ts
import {
  PrometheusA2uiProvider,
  PrometheusA2uiSurface,
  createEntityGraphA2uiActionPolicy,
  createPrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
```

Use the explicit compatibility subpath for the alpha AG-UI chat/state APIs:

```ts
import {
  EntityApproval,
  EntityChat,
  useChatSession,
} from "@prometheus-ags/a2ui-react/ag-ui";
```

Never import `EntityChat` from the package root in 3.0 code. Never describe
AG-UI state/message events as A2UI surface conformance.

## Version rules

- Stable wire target: A2UI `v0.9.1`.
- Official packages: `@a2ui/react@0.10.2`,
  `@a2ui/web_core@0.10.5`, and `@a2ui/markdown-it@0.1.0`.
- Import only official `/v0_9` entry points.
- Treat package distribution versions and wire versions as separate axes.
- Do not add v1.0 behavior until a governed version adapter and its evidence
  exist.

## Architecture rules

```text
Components → A2UI hooks/provider → runtime policy → graph store
```

- Official `MessageProcessor`, schemas, surface/data model, catalog binder,
  and React renderer own protocol behavior.
- Do not implement another JSONL parser, surface model, or schema.
- Renderer components must not call the graph store directly.
- Application code owns runtime creation/disposal and transport delivery.
- Provide deterministic SSR fallback markup; do not claim the official
  renderer itself performs server rendering.

## Catalog and action rules

- Derive implementations from the official catalog.
- Allowlist exact components and functions.
- `openUrl` is excluded by default because navigation is a side effect.
- Start with deny-all action authority.
- Require exact action names and strict context schemas.
- For graph actions, allowlist entity types, action names, and fields.
- Always require application tenant/scope authorization.
- Require out-of-band approval for replace and remove.
- Record action decisions without exposing secrets.
- Never accept agent-supplied approval as authority.

## Required evidence

For package or API claims:

```bash
pnpm run test:a2ui-bridge
pnpm run verify:a2ui-bridge
pnpm run bdd:a2ui-bridge
pnpm --filter @prometheus-ags/a2ui-react run verify:skills
```

`verify:a2ui-bridge` uses packed tarballs and isolated ESM, CommonJS,
NodeNext, and server-render consumers. `verify:a2ui-visual` hash-checks the
built artifact, real browser screenshots, keyboard trace/video, and
accessibility receipt.

These receipts do not certify A2A conformance, the full agentic showcase,
Flutter/native renderers, documentation deployment, registry authority, or npm
`latest` promotion. Consult `examples/coverage.json` and the release
contract before expanding a claim.

