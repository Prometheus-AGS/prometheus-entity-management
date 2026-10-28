# Official A2UI protocol bridge

Status: implemented change evidence; full 3.0 release certification remains in
progress.

`v3-a2ui-protocol-bridge` corrects the alpha package boundary and makes the
security model testable:

- the package root accepts strict A2UI v1.0-RC and v0.9.1 surfaces through the
  maintained official v0.9.1 engine and an explicit compatibility adapter;
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
| v0.9.1 message schemas and validation | Official `@a2ui/web_core/v0_9` |
| v1.0-RC envelope and renderer adaptation | Prometheus compatibility boundary |
| Surface and data-model state | Official `MessageProcessor` |
| React component implementations and rendering | Official `@a2ui/react/v0_9` |
| Stable protocol pin | Prometheus runtime wrapper |
| Catalog/component/function allowlist | Prometheus catalog adapter |
| Tenant/entity/action/field authority | Application callback through Prometheus policy |
| Normalized graph write | Prometheus entity-graph policy |
| AG-UI 0.0.59 A2UI activity transport | Prometheus runtime wrapper |
| AG-UI chat/state compatibility | `@prometheus-ags/a2ui-react/ag-ui` |
| A2A transport and conformance | Separate `v3-a2a-conformance-agent` change |

The wrapper defines only the unpublished RC compatibility envelope. It does not
implement another renderer or maintain an alternate surface/data model.

## Version contract

| Axis | Selected value | Why |
| --- | --- | --- |
| Public wire input | A2UI `v1.0` RC and `v0.9.1` | RC compatibility without claiming an unpublished v1 renderer |
| Renderer engine | A2UI `v0.9.1` | Maintained entry point exported by the published packages |
| Official React package | `@a2ui/react@0.12.0` | Distribution containing the selected renderer entry point |
| Official core package | `@a2ui/web_core@0.12.0` | Distribution containing protocol processing and schemas |
| Markdown integration | `@a2ui/markdown-it@0.2.0` | Renderer context used for official Text markdown |
| AG-UI transport | `@ag-ui/core` peer `>=0.0.59 <0.1.0 \|\| ^1.0.0` (developed against `1.0.3`) | Activity snapshot, activity delta and messages-snapshot shapes used for A2UI operations |
| Validation dependency | `zod@3.25.76` | Exact compatible schema runtime |

The `0.12.x` package numbers are distribution versions, not A2UI wire
versions. Root sources import explicit `/v0_9` entry points because
`@a2ui/react@0.12.0` exports only `./v0_8` and `./v0_9` (no v1.0 renderer entry
point); `@a2ui/web_core@0.12.0` does export `./v1_0`, which this package does not
yet use. The
runtime validates v1.0-RC envelopes, decomposes embedded surface state for the
official processor, and keeps response-aware action/function metadata at the
adapter boundary.

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

1. validates v0.9.1 messages with official schemas and v1.0-RC envelopes with a
   strict compatibility schema;
2. normalizes RC embedded surface state to the official v0.9.1 processor;
3. checks components against the selected surface catalog;
4. delegates message processing to the official `MessageProcessor`; and
5. exposes a stable React subscription snapshot and typed RC response channel.

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

## AG-UI activity delivery

AG-UI 1.0 defines no version, sequence or idempotency field on activity events.
The runtime therefore reconciles instead of replaying:

- A held surface is deleted only by an explicit `deleteSurface` operation. A
  redelivered or restated activity (`replace: true` included) never removes a
  surface, and a message absent from a `MESSAGES_SNAPSHOT` leaves its surfaces
  alone.
- When two deliveries disagree about a data value, the producer wins and
  `onConflict` reports each leaf the user had also changed.
- The producer's ordering key rides in the activity `content`:
  `surfaceVersions: { "<surfaceId>": { "epoch": <integer>, "version": <integer> } }`.
  `epoch` is raised on every producer restart. A delta without a version is
  rejected; a version-less snapshot is only protected against identical
  redelivery.
- `ACTIVITY_DELTA` uses a deliberately small RFC 6902 subset: `add` to
  `/a2ui_operations/-`, and `test` on `/surfaceVersions/<surfaceId>/version`
  (and `/epoch`). A delta applies on top of version N and yields N + 1.
- Resource caps are enforced by default and can be changed with `limits` or
  `setLimits()`; a refused input leaves every surface unchanged and is reported
  through `onProducerFault`.

## Wire contract for other runtimes (including Flutter)

These shapes are what the web runtime sends and accepts. They are stated so a
Dart or other client can implement the same contract; no such client exists in
this repository.

| Direction | Location | Shape |
|---|---|---|
| Agent to client | activity `content.surfaceVersions` | `{ surfaceId: { epoch, version } }` |
| Client to agent | `forwardedProps.a2uiAction` | `{ userAction, actionId, heldVersion?, dataModel? }`; `actionId` is a UUIDv7 reused on retry |
| Client to agent | `forwardedProps.a2uiResync` | `{ held, reason? }` where `held` lists the `(epoch, version)` the client holds per surface |

`actionId` is the idempotency key and is separate from the v1.0 `actionId`
correlation field inside the action. The `a2uiResync` shape and the way an agent
returns operations for a stale action are proposals of this runtime and still
need agreement with the agent side.

## Headless runtime

`@prometheus-ags/a2ui-react/headless` validates agent output with the same
allowlist, limits and ordering as the React runtime, with no React or DOM.
`exportSurfaceMessages(surfaceId)` returns messages that rebuild a surface in a
fresh runtime, pruning components unreachable from `root`.

## Limits

This change does not prove:

- A2A AgentCard/task/stream/cancel conformance;
- the complete keyless agentic example and its cancellation/streaming flows;
- Flutter or native A2UI rendering (the wire contract below is stated for a future Dart consumer, not implemented or proven for one);
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
