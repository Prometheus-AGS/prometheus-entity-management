# Agentic A2A and A2UI example

The `v3-agentic-a2ui-example` change owns the dedicated React 19/Vite 8
application at `examples/agentic-a2ui-app`. It composes the independently
certified A2A v1 transport and official A2UI v0.9.1 renderer into one
application-owned entity-management flow.

## Runtime architecture

```text
Component
  -> hook
    -> agent session store
      -> A2A client/server adapter
        -> deterministic reference agent or explicit external endpoint
          -> streamed A2UI artifact

Official A2UI renderer
  -> exact action schema
    -> tenant authorization
      -> human approval when required
        -> task command store
          -> canonical entity graph
            -> ID-backed list and detail projections
```

Components render state and submit intent through hooks. The session store owns
the A2A lifecycle, the command store owns graph mutations, and lists retain
only entity IDs. Neither the renderer nor a component receives direct graph
mutation authority.

## Deterministic default and external opt-in

The default reference agent requires no model key. It emits submitted, working,
artifact, terminal, and cancellation events from fixed shared-domain fixtures.
Golden JSON fixtures pin both the accepted task-review surface and a rejected
surface containing an unapproved component.

`VITE_EXTERNAL_A2A_URL` is the only external-agent switch. The example accepts
HTTPS endpoints and loopback HTTP development; it does not embed an agent token.
Authenticated remote routing belongs in an application server or gateway.

## Application action matrix

| Action | Required boundary | Demonstrated result |
| --- | --- | --- |
| `task.update` | Exact context schema plus tenant authorization | Updates the canonical Task once; ID-backed list and detail projections both observe `done` |
| `task.delete` | Exact context schema plus tenant authorization | Denied by application policy without graph mutation |
| `task.archive` | Exact context schema, authorization, and trusted human approval | Denial preserves state; approval changes the canonical Task to `archived` |
| malformed `task.update` | Context validation | Rejected as `invalid-context` |
| undeclared `system.run` | Exact action catalog | Rejected as `unknown-action` |
| unapproved A2UI component | Catalog validation before render | Artifact rejected, no surface or graph mutation |

Agent-supplied context cannot grant authority or approve its own destructive
operation. Protocol validity is necessary but never sufficient for a graph
write.

Each scenario start clears surfaces from the prior run through official A2UI
deletion messages. Malformed and cancelled runs therefore cannot inherit a
successful surface. The application also admits only one pending destructive
approval; a concurrent request is denied without replacing or orphaning the
active human decision. Starting another scenario or resetting the session
denies and resolves that pending decision before state is replaced, so a stale
approval cannot mutate the next scenario's graph.

External endpoints must use HTTPS outside loopback development and cannot carry
URL-embedded username or password credentials. Authenticated production routing
belongs behind a server-side gateway; the browser example stores and renders no
agent credential.

## Implemented verification

Focused source-workspace tests are implemented:

```bash
pnpm run typecheck:agentic-a2ui
pnpm run test:agentic-a2ui:unit
```

They cover golden fixtures, keyless streaming, artifact processing,
normalized cross-view mutation, authorization denial, malformed and undeclared
actions, human approval, cancellation, component-to-hook layering, and ID-only
lists.

The complete deletion-aware gate is:

```bash
pnpm run verify:agentic-a2ui
```

It passes a frozen install; typecheck and lint; eleven focused example units; one
canonical A2UI atomic-batch regression; four external-endpoint policy tests;
core, React, A2A, and A2UI builds; both protocol export ledgers; the Vite
production build; three Chromium flows; coverage and coverage regressions;
production security; strict OpenSpec; and diff hygiene. The retained 19-command
task-5 receipt hash-binds the
happy/policy/approval, malformed-artifact, and cancelled-task screenshots plus
three always-on traces and records zero serious or critical axe findings. The
coverage ledger records the showcase runtime and visual evidence as
`implemented`.

The A2UI runtime preflights each complete message batch through a shadow
official processor seeded with the current surfaces. A rejected later message
cannot leave an earlier data or component update committed to an existing live
surface.

## Evidence boundary

This example adds no publishable package entry point, so the A2A and A2UI
runtime export ledgers do not change. Its source tests do not certify a packed
consumer, an external hosted agent, REST or gRPC bindings, push notifications,
Flutter rendering, native platforms, npm trusted publishing, or stable 3.0.0
promotion. Package-level A2A and A2UI claims continue to require their
independent conformance and packed-consumer gates.
