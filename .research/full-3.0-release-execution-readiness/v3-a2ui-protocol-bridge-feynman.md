# A2UI protocol bridge: teach-back and transfer assessment

Date: 2026-08-01  
Change: `v3-a2ui-protocol-bridge`

## Plain-language model

AG-UI and A2UI solve different problems. AG-UI is the courier carrying an agent run: lifecycle events, chat messages, tool calls, and shared-state snapshots or deltas. A2UI is the blueprint for a user interface: surfaces, an allowlisted component catalog, a data model, bindings, and user actions. A courier can deliver a blueprint, but a courier is not a building renderer.

The current `@prometheus-ags/a2ui-react` alpha is mostly a courier console. It consumes `MESSAGE_*`, `STATE_*`, and tool-call events, projects AG-UI state into the entity graph, and renders chat/approval components. It does not process official A2UI surface messages, construct a catalog-backed component tree, or render a `SurfaceModel`. Calling it A2UI-compliant would therefore be a category error, not merely stale branding.

For the stable package, the official A2UI engine is the building inspector and blueprint engine. `@a2ui/web_core/v0_9` already owns protocol schemas, validation, message processing, surfaces, data binding, actions, and structured errors. `@a2ui/react/v0_9` already owns the React component implementations and `A2uiSurface`. Prometheus should not redraw those blueprints. Its narrow job is the security desk between official A2UI actions/data and the normalized graph:

1. receive validated official messages through `MessageProcessor` configured for protocol `v0.9.1`;
2. render only registered, allowlisted catalog components through the official React renderer;
3. translate permitted entity actions through hooks and store/adapters, never directly from a component to graph state;
4. validate action names and payload schemas, deny unknown actions by default, and require approval for destructive operations;
5. expose the existing AG-UI chat/state behavior under an explicitly named compatibility surface so existing alpha consumers have a migration path.

There are two independent version numbers. `0.10.2` and `0.10.5` are npm distribution versions for `@a2ui/react` and `@a2ui/web_core`. `v0.9.1` is the target wire-protocol version. The React package's root export currently resolves to its v0.8 interface, so stable code must import the explicit `/v0_9` entry points and configure the processor for `v0.9.1`. A future v1 message must pass through an explicit version adapter or be rejected; it must not be silently interpreted as v0.9.1.

## Why the compatibility surface stays in this package

The frozen 3.0 release inventory declares twelve npm packages and names only `@prometheus-ags/a2ui-react` for this capability. Creating an unplanned `@prometheus-ags/ag-ui-react` artifact would invalidate the completed release contract. The compatible stable design is:

- package root: thin official A2UI v0.9.1 renderer and graph-policy bridge;
- explicit `./ag-ui` subpath: legacy AG-UI chat/state projection API, documented as compatibility/deprecated where appropriate;
- migration guide: unambiguous old-to-new import mapping and explanation that AG-UI transport and A2UI rendering can be composed but are not interchangeable.

If a later release wants a separately published AG-UI package, it must amend the release inventory as its own governed change.

## Security and architecture boundary

An A2UI action is a request, not authorization. Official schema validation can prove that a message has the expected protocol shape; it cannot decide that an agent may delete a tenant's entity. The application policy remains authoritative. Unknown catalog IDs, components, action names, entity types, fields, tenant scopes, and destructive actions fail closed. Approval is a policy state transition, not a decorative modal.

The repository's data-flow rule remains intact:

```text
Official A2UI component -> Prometheus hook -> policy bridge/store -> entity graph or external adapter
```

An official renderer component may emit an action. It may not import `useGraphStore`, mutate graph internals, or perform network I/O. Lists still store IDs only; canonical entities still live once; local patches remain separate.

## Transfer problems

1. **A chat window consumes AG-UI `STATE_DELTA` events and renders perfectly. Is it an official A2UI renderer?** No. It proves an AG-UI state projection and chat UI, not A2UI surface/catalog/data-model processing.
2. **An official A2UI button calls `upsertEntity` directly after schema validation. Is the bridge correct?** No. Protocol validity is not authorization, and the direct component-to-store mutation breaks the required layering. The action must cross the allowlisted policy/hook boundary.
3. **A local parser accepts JSONL and constructs a component tree without `web_core`. Is that acceptable if tests pass?** No. It duplicates protocol ownership, increases drift risk, and violates the candidate-adoption boundary. Use the official processor and renderer.
4. **A message advertises A2UI v1.0 candidate syntax. May the v0.9.1 bridge accept it opportunistically?** No. Route it through an explicit experimental adapter with separate evidence, or reject it with a structured version error.
5. **A catalog includes an unknown component or an action requests a destructive mutation without approval. What happens?** Deny it. Stable behavior is fail-closed; no fallback component or optimistic mutation may broaden authority.
6. **Workspace tests pass, but a tarball consumer cannot resolve `/v0_9` dependencies. Is the package certifiable?** No. The bridge must pass packed ESM/type consumers so workspace aliases cannot hide broken exports or missing runtime dependencies.

## Evidence expectations

This dependency task establishes the contract but does not claim rendered success. Implementation must add BDD/unit/integration and packed-consumer proof for protocol processing, catalog enforcement, action authorization, AG-UI migration, and package boundaries. Because this change produces a renderer, later verification must also capture a real browser rendering of an official v0.9.1 fixture, keyboard interaction, accessibility results, and action-policy outcomes. A screenshot alone cannot prove protocol or authorization behavior.

The downstream agentic example and Docusaurus changes must use this honest boundary in tutorials, API reference, migration tables, diagrams, and live visual examples. Documentation may not call the `./ag-ui` compatibility client an A2UI renderer.

## Source basis

- Official renderer development guide: https://a2ui.org/guides/renderer-development/
- Official A2UI roadmap: https://a2ui.org/roadmap/
- Official A2UI v0.9 specification: https://a2ui.org/specification/v0.9-a2ui/
- Official AG-UI event model: https://docs.ag-ui.com/concepts/events
- Official AG-UI architecture: https://docs.ag-ui.com/concepts/architecture
- Installed package declarations inspected in an isolated pnpm project: `@a2ui/react@0.10.2`, `@a2ui/web_core@0.10.5`, `@ag-ui/core@0.0.57`, and `@ag-ui/client@0.0.57`.
