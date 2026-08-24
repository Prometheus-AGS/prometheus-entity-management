# Official A2UI protocol bridge

Status: implemented change evidence; full 3.0 release certification remains in
progress.

`v3-a2ui-protocol-bridge` corrects the alpha package boundary and makes the
security model testable:

- the package root renders official A2UI v0.9.1 surfaces through the maintained
  official engine;
- the pre-3.0 AG-UI chat/state-event APIs live at the explicit `./ag-ui`
  compatibility subpath;
- graph mutations cross an application-owned, default-deny policy; and
- packed consumers and a real browser prove the boundary outside workspace
  source aliases.

## The plain-language model

A2UI answers: **“Is this a valid interface description that this client knows
how to render?”**

Prometheus policy answers: **“May this particular action modify this tenant,
entity, and set of fields?”**

Those are not the same question. A catalog is an approved vocabulary, not a
database credential. A valid boarding pass is not a key to the control tower.

**Protocol validity never grants application authority.**

This distinction is the core 3.0 contract. Catalog/schema validation blocks
unknown protocol structures; application authorization blocks valid but
unauthorized work.

## Ownership boundaries

| Concern | Owner |
| --- | --- |
| Message schemas and validation | Official `@a2ui/web_core/v0_9` |
| Surface and data-model state | Official `MessageProcessor` |
| React component implementations and rendering | Official `@a2ui/react/v0_9` |
| Stable protocol pin | Prometheus runtime wrapper |
| Catalog/component/function allowlist | Prometheus catalog adapter |
| Tenant/entity/action/field authority | Application callback through Prometheus policy |
| Normalized graph write | Prometheus entity-graph policy |
| AG-UI chat/state compatibility | `@prometheus-ags/a2ui-react/ag-ui` |
| A2A transport and conformance | Separate `v3-a2a-conformance-agent` change |

The wrapper does not parse JSONL, define a second A2UI schema, or maintain an
alternate surface/data model.

## Version contract

| Axis | Selected value | Why |
| --- | --- | --- |
| Wire protocol | A2UI `v0.9.1` | Current production patch in the stable v0.9 family |
| Official React package | `@a2ui/react@0.10.2` | Distribution containing the selected renderer entry point |
| Official core package | `@a2ui/web_core@0.10.5` | Distribution containing protocol processing and schemas |
| Markdown integration | `@a2ui/markdown-it@0.1.0` | Renderer context used for official Text markdown |
| Validation dependency | `zod@3.25.76` | Exact compatible schema runtime |

The `0.10.x` package numbers are distribution versions, not A2UI wire
versions. Root sources import explicit `/v0_9` entry points; v1.0 remains a
candidate and is excluded from the stable bridge until a governed adapter
change selects it.

## Package boundary

### Official root

```ts
import {
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  PrometheusA2uiProvider,
  PrometheusA2uiSurface,
  createEntityGraphA2uiActionPolicy,
  createPrometheusA2uiCatalog,
  createPrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
```

The root exposes runtime/catalog creation, official React surfaces/hooks,
generic default-deny action policy, the entity-graph policy, and selected
official types.

### AG-UI compatibility subpath

```ts
import {
  EntityApproval,
  EntityChat,
  useChatSession,
} from "@prometheus-ags/a2ui-react/ag-ui";
```

This is the explicit migration path for alpha consumers. AG-UI events may still
project state into the graph, but that transport behavior is not represented as
official A2UI conformance.

The machine ledger
[`a2ui-library-exports.json`](../prometheus-entity-skills/_shared/references/a2ui-library-exports.json)
records both runtime entry points. The package and root skills gates compare the
ledger with built ESM artifacts.

## Catalog and rendering rules

The default Prometheus catalog derives all implementations from the official
React basic catalog. It allowlists 18 component names and pure or validation
functions. Side-effecting `openUrl` is excluded by default and requires an
application opt-in.

The runtime:

1. validates message arrays with the official schemas;
2. enforces exact `v0.9.1` message versions;
3. checks components against the selected surface catalog;
4. delegates message processing to the official `MessageProcessor`; and
5. exposes a stable React subscription snapshot.

React wrappers provide the official Markdown renderer and a deterministic SSR
fallback. They do not directly access the graph.

## Action authorization

The generic policy uses exact action names, Zod context schemas, explicit
authorization, optional approval, and auditable outcomes. Missing authority is
denial.

The graph policy adds exact allowlists for:

- entity type;
- graph action;
- writable/unpatchable field; and
- application tenant or scope authorization.

Built-in names are `prometheus.entity.upsert`,
`prometheus.entity.replace`, `prometheus.entity.remove`,
`prometheus.entity.patch`, `prometheus.entity.unpatch`, and
`prometheus.entity.clear-patch`. Replace and remove are destructive and
require approval after authorization. An action context cannot approve itself.

## Evidence

| Receipt | What it proves |
| --- | --- |
| `pnpm run test:a2ui-bridge` | Official processing/rendering, catalog rejection, SSR fallback, policy allow/deny/approval, React hooks, and release assertions |
| `pnpm run verify:a2ui-bridge` | Packed root/subpath ESM, CommonJS, NodeNext, Node16, and server-render consumers without workspace aliases |
| `pnpm run bdd:a2ui-bridge` | Acceptance language remains coupled to executable receipts |
| `pnpm run verify:a2ui-visual` | Built-artifact hash plus desktop/mobile screenshots, keyboard trace/video, and WCAG evidence |
| `pnpm --filter @prometheus-ags/a2ui-react run verify:skills` | Root and `./ag-ui` runtime exports match the committed agent ledger |

Evidence is stored under
`.kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge/`.

## Limits

This change does not prove:

- A2A AgentCard/task/stream/cancel conformance;
- the complete keyless agentic example and its cancellation/streaming flows;
- Flutter or native A2UI rendering;
- the production Docusaurus/GitHub Pages site;
- release provenance or registry permissions; or
- approval to move npm `latest`.

Those remain owned by their declared downstream changes in
[`examples/coverage.json`](../examples/coverage.json) and the
[3.0 release contract](v3-release-contract.json).

## Upstream sources

The research audit used primary project sources:

- [A2UI v0.9 protocol specification](https://a2ui.org/specification/v0.9-a2ui/)
- [Official renderer implementation guide](https://a2ui.org/guides/renderer-development/)
- [Official action and security concepts](https://a2ui.org/concepts/actions/)
- [Official A2UI repository](https://github.com/a2ui-project/a2ui)
- [`@a2ui/web_core` package](https://www.npmjs.com/package/@a2ui/web_core)

The official repository calls the project early-stage while identifying v0.9.1
as its current production protocol. This documentation therefore says
“implemented and verified bridge,” not “the upstream protocol will never
change” or “the full Prometheus release is certified.”
