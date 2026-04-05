# Detailed comparison with TanStack libraries

This document compares `@prometheus-ags/prometheus-entity-management` with the relevant TanStack products as of **April 5, 2026**.

It is intentionally opinionated about product boundaries. These libraries solve adjacent problems, but they do not all compete on the same axis.

## Official references

- [TanStack DB docs](https://tanstack.com/db/latest/docs)
- [TanStack DB live queries guide](https://tanstack.com/db/latest/docs/guides/live-queries)
- [TanStack DB mutations guide](https://tanstack.com/db/latest/docs/guides/mutations)
- [TanStack DB 0.6 announcement, March 25, 2026](https://tanstack.com/blog/tanstack-db-0.6-app-ready-with-persistence-and-includes)
- [TanStack Query overview](https://tanstack.com/query/v5/docs)
- [TanStack Query query keys guide](https://tanstack.com/query/v5/docs/react/guides/query-keys)
- [TanStack Table overview](https://tanstack.com/table/latest/docs/overview)
- [TanStack AI overview](https://tanstack.com/ai/latest/docs/getting-started/overview)
- [TanStack AI tools guide](https://tanstack.com/ai/latest/docs/guides/tools)
- [TanStack AI tool approval flow](https://tanstack.com/ai/latest/docs/guides/tool-approval)
- [TanStack Intent overview](https://tanstack.com/intent/latest/docs/overview)
- [Introducing TanStack Intent, March 4, 2026](https://tanstack.com/blog/from-docs-to-agents)

## Short version

This library is strongest when the application needs a **single normalized entity graph** that remains consistent across detail screens, list views, sheets, inline edits, GraphQL, REST, and realtime updates.

TanStack’s strongest products split that problem into narrower responsibilities:

- **TanStack Query** is best at request lifecycle and server-state caching by query key.
- **TanStack Table** is best at headless tabular presentation and table state.
- **TanStack DB** is best at a client-side relational query/runtime model with live collections, transactions, includes, and offline persistence.
- **TanStack AI** is best at model/tool orchestration.
- **TanStack Intent** is best at shipping agent skills with npm packages.

The right positioning is not “this replaces all of TanStack.” The right positioning is “this owns normalized application-wide entity truth for React.”

## Comparison matrix

| Capability | This library | TanStack DB | TanStack Query | TanStack Table | TanStack AI | TanStack Intent |
|---|---|---|---|---|---|---|
| Canonical normalized entity graph | Strong | Partial, collection-oriented | Weak | None | None | None |
| Cross-view entity reactivity | Strong | Strong | Medium | None | None | None |
| Request lifecycle and retry ergonomics | Medium | Medium | Strong | None | None | None |
| Live relational query runtime | Medium | Strong | Weak | None | None | None |
| Hierarchical includes / projections | Medium | Strong | Weak | None | None | None |
| Explicit optimistic transaction pipeline | Medium | Strong | Medium | None | None | None |
| Offline persistence as core runtime | Medium | Strong | Medium | None | None | None |
| Table rendering / headless grid state | Medium | Weak | None | Strong | None | None |
| AI chat/tool orchestration | Weak | None | None | None | Strong | None |
| Agent-skill packaging / discovery | Medium | None | None | None | None | Strong |
| Mixed ingress support: REST + GraphQL + realtime + local-first | Strong | Medium | Medium | None | None | None |

## Product-by-product comparison

## This library

### Strengths

- Keeps one canonical `(type, id)` record for the whole app instead of letting each request path own its own copy.
- Works across **REST**, **GraphQL**, **realtime adapters**, **Prisma-shaped APIs**, and **ElectricSQL/PGlite** in one graph.
- Gives React teams a consistent data-flow architecture: `Components → Hooks → Stores → APIs/Realtime`.
- Solves the “same business object appears in five views” problem better than query-key caches.
- Has first-class list semantics based on ordered ID arrays, which makes cross-view reactivity predictable.
- Now includes graph-native runtime helpers: `queryOnce`, `selectGraph`, `createGraphTransaction`, `createGraphAction`, `createGraphEffect`, sync metadata, and AI export/tool helpers.

### Weaknesses

- More opinionated than TanStack Query about application architecture.
- Weaker than TanStack DB on collection-native live queries, persistent/offline runtime integration, and deeper relational query ergonomics.
- Weaker than TanStack Table as a table engine and ecosystem.
- Weaker than TanStack AI as an AI runtime and tool-execution system.
- React-centric. TanStack products generally span more frameworks.

## TanStack DB

### Strengths

- Purpose-built client database/runtime with **live queries**, **collection relationships**, **query builders**, and **reactive derived data**.
- Ships explicit transaction/action primitives and stronger mutation lifecycle abstractions than a plain cache.
- As of **March 25, 2026**, TanStack DB 0.6 publicly positions **persistence, offline support, and hierarchical includes** as major capabilities.
- Better fit when the application wants a client-side relational runtime instead of an entity graph plus hooks model.

### Weaknesses

- It is a broader runtime than many teams need.
- The mental model is closer to a client database than to “fetch into a normalized graph and read with hooks.”
- For teams already invested in a normalized entity-store architecture, adopting DB can be more of a re-platform than an incremental improvement.

### Where this library is better

- Simpler mental model when the problem is “keep every React view in sync around shared entities.”
- Better fit for mixed ingress environments where the app already receives updates from REST, GraphQL, sockets, Supabase, or ElectricSQL and wants one normalization layer.
- Better aligned with a hook-first React codebase that wants the graph, not the client database, to be the center of gravity.

### Where TanStack DB is better

- Live relational query composition.
- Offline persistence as a first-class product story.
- Includes/projection ergonomics.
- Richer client-runtime transactions and effect workflows.

## TanStack Query

### Strengths

- Best-in-class request lifecycle management for React: cache invalidation, retries, focus/reconnect refetch, suspense support, infinite queries, and router integration.
- Huge ecosystem adoption and mature operational patterns.
- Excellent when each query result can remain conceptually tied to its `queryKey`.

### Weaknesses

- Query-key caches do not create a single normalized application graph by default.
- Cross-view consistency often becomes manual `setQueryData`, invalidation fan-out, or duplicated cache entries.
- It solves server-state fetching very well, but not the “one entity, many synchronized views” problem as directly.

### Where this library is better

- One canonical entity record instead of multiple query-key copies.
- Better for apps with dense entity reuse across lists, sheets, badges, nested detail panes, and optimistic editing.
- More natural for relation-aware invalidation once schemas are registered.

### Where TanStack Query is better

- Broader community familiarity.
- More polished request/cache ergonomics in isolation.
- Better default answer when the team wants fetch caching, not a graph architecture.

## TanStack Table

### Strengths

- Best-in-class headless table engine with deep support for sorting, filtering, grouping, row models, selection, and virtualization integrations.
- Framework-agnostic.
- Extremely flexible for custom table UX.

### Weaknesses

- Not a data store.
- Not a normalized cache.
- Leaves the hard part of upstream data consistency to the rest of the app.

### Where this library is better

- The upstream data model is stronger. Table rows are joined from a single entity graph rather than owned by the table layer.
- Inline editing and detail flows can stay consistent across non-table UI surfaces.

### Where TanStack Table is better

- Table state machinery.
- Ecosystem maturity for data grids.
- Framework breadth and headless composability.

## TanStack AI

### Strengths

- Strong AI runtime/tooling story: model adapters, `useChat`, typed tools, approval flows, server/client tool execution, and agentic multi-step flows.
- Better fit for building AI applications directly.

### Weaknesses

- Not a normalized entity graph.
- Not a table library.
- Not a request cache.

### Where this library is better

- As the source of truth for application data that AI features should read from.
- For exporting stable graph snapshots and exposing graph-backed tools without coupling the core package to one AI runtime.

### Where TanStack AI is better

- Everything related to chat transports, tool execution, approval flows, provider adapters, and agent orchestration.

## TanStack Intent

### Strengths

- Solves a maintainer/distribution problem: shipping versioned agent skills inside npm packages.
- Strong fit for keeping agent guidance aligned with package releases.

### Weaknesses

- Not an application runtime.
- Not a data layer.
- Not relevant to feature parity in the same way DB, Query, and Table are.

### Where this library is already aligned

- This repo already maintains agent-facing documentation and export verification.
- Intent is complementary release tooling, not a competing runtime.

## Strengths and weaknesses summary

## Where this library is strongest today

- Mixed ingress normalization into one graph.
- Cross-view reactivity for shared business objects.
- Clear React architectural layering.
- CRUD workflows with relation-aware invalidation.
- A unified mental model across REST, GraphQL, realtime, and local-first sync.

## Where TanStack is strongest today

- **DB**: richer client query/runtime features.
- **Query**: request lifecycle polish and ecosystem maturity.
- **Table**: headless grid/table state.
- **AI**: agent/tool runtime.
- **Intent**: agent-skill packaging and discovery.

## How this library can be better and genuinely superior

Superiority should come from a sharper thesis, not from copying every TanStack feature.

## 1. Own the “application-wide entity truth” category

The clearest winning narrative is:

- TanStack Query owns request caches.
- TanStack DB owns client relational runtime.
- This library owns normalized React application truth across every ingress path.

That positioning is stronger than “TanStack Query alternative” and more honest than “TanStack DB competitor.”

## 2. Make graph-native projections excellent

This library should become the easiest way to take normalized entities and shape them into nested view models without denormalizing storage.

That means:

- richer `include` ergonomics
- relation helpers for common belongs-to / has-many patterns
- stable projection typing
- projection caching rules that stay graph-native

If this becomes excellent, the library can outperform TanStack DB for teams that want projections without adopting a full client DB runtime.

## 3. Make optimistic graph actions a first-class developer experience

The new `createGraphTransaction` and `createGraphAction` APIs are the right direction. To surpass alternatives, they need:

- clearer mutation state inspection
- action tracing/devtools visibility
- better list insertion/removal helpers
- stronger rollback ergonomics across related entities

If optimistic graph actions are simpler than TanStack DB actions and less manual than TanStack Query invalidation flows, that is a real product advantage.

## 4. Lean into multi-ingress superiority

This library can plausibly be better than TanStack DB or Query for apps that mix:

- REST
- GraphQL
- WebSocket/Supabase/Convex realtime
- ElectricSQL/PGlite local-first
- AI consumers that need graph snapshots

That is a differentiator worth pushing harder in docs, examples, and APIs.

## 5. Win on developer trust and architecture discipline

A major strength of this library is that it encodes a disciplined data-flow architecture. It should keep doing that rather than broadening into an all-purpose runtime.

The product gets better when it says “no” to the wrong responsibilities.

## 6. Add better observability before adding more breadth

Before chasing more categories, invest in:

- graph inspector/devtools depth
- action/effect tracing
- sync metadata visibility
- projection debugging
- stale/invalidation diagnostics

Teams adopt opinionated state systems when debugging them is easier than debugging ad hoc caches.

## Recommended positioning

Use this library when:

- the same entities appear in many views and must stay synchronized
- the app mixes multiple ingress patterns
- React hooks should remain the read boundary
- normalized graph truth matters more than query-key caching

Prefer TanStack Query when:

- the app mostly needs request caching and invalidation
- normalized entity reuse is limited
- the team already has strong query-key discipline

Prefer TanStack DB when:

- the app wants a client database/runtime with live relational queries, includes, and offline persistence as the center of the model

Prefer TanStack Table when:

- the main problem is headless table rendering and grid state, not data ownership

Use TanStack AI or Intent alongside this library when:

- the app needs AI tooling or package-distributed agent skills
- but the graph should remain the domain data source

## Recommended product message

> `@prometheus-ags/prometheus-entity-management` is the normalized entity graph for React applications that need one canonical source of truth across REST, GraphQL, realtime, local-first sync, and complex multi-view UI.

That message is narrower than TanStack’s total platform story, but stronger and more defensible.
