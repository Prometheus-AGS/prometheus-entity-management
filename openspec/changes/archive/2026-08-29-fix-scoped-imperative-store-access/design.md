## Context

See `proposal.md` for motivation. React context can select a vanilla Zustand
store only while React is rendering a component or custom hook. The callable
`useGraphStore` compatibility export currently combines that context-aware hook
with copied methods from the default singleton, so the two call forms have
different ownership semantics despite sharing one name.

The 3.0.4 patch must preserve existing 3.x imperative behavior. It cannot use a
module-level "active provider" because multiple roots and concurrent server
requests make that state ambiguous, and a JavaScript `Proxy` cannot recover a
React context that does not exist at the call site.

## Goals / Non-Goals

**Goals:**

- Make the singleton target of legacy attached methods visible at type-check and
  development runtime.
- Keep provider-scoped React hooks and callbacks correct through explicit
  `GraphStore` capture.
- Correct the repository's Next.js hydration example and lock the behavior with
  focused regression tests.
- Preserve the default singleton and callable hook runtime contract in 3.x.
- Accept strict A2UI 1.0-RC surface, action-response, and function-call
  envelopes in React and strict 1.0-RC surface envelopes in Flutter.
- Preserve the maintained published A2UI renderer engines behind explicit,
  tested compatibility adapters and consume AG-UI 0.0.59 A2UI activities.

**Non-Goals:**

- Removing the attached methods before the next major version.
- Introducing Node-only `AsyncLocalStorage` into the browser-capable React
  package.
- Selecting one global provider store for arbitrary module-level code.
- Making React context available to Server Components.
- Claiming native A2UI 1.0 renderer conformance before upstream publishes the
  documented v1 renderer entry points.

## Decisions

### Wrap the four attached methods with bounded development diagnostics

`getState`, `setState`, `subscribe`, and `getInitialState` remain delegates to
the public `graphStore`, but are no longer copied by reference. Each wrapper
emits at most one development warning that names the singleton target and tells
the caller to capture `useGraphStoreApi()` or inject a `GraphStore`.

This preserves 3.x behavior while eliminating the silent false green. A proxy
was rejected because it still lacks a correct `currentStore()` outside React
and would invite unsafe global-provider state.

### Express deprecation per attached method

The callable hook type declares the four compatibility methods explicitly with
`@deprecated` annotations rather than intersecting the hook with the opaque
whole `GraphStore` type. The methods remain callable and type-compatible.

### Capture the provider store at the React boundary

Client components call `useGraphStoreApi()` during render and retain the
returned vanilla store in effects or callbacks. Module-level helpers and other
Zustand stores receive that store as a dependency. Server code creates a
request-owned vanilla store directly and passes serializable state to the
client.

### Adapt A2UI 1.0-RC at the renderer boundary

The React runtime validates the RC envelope, decomposes embedded
`createSurface` components and data into the official v0.9.1 processor, and
retains response-aware action/function metadata outside the renderer model.
The Flutter showcase performs the same strict preflight and decomposition
before feeding GenUI's published v0.9 engine. Unknown components and authority
remain fail-closed.

AG-UI 0.0.59 `ACTIVITY_SNAPSHOT` events with activity type `a2ui-surface` are
transport input only. Their `a2ui_operations` populate or replace surfaces;
they do not bypass the A2UI catalog or application action policy.

## Risks / Trade-offs

- **Development warnings can add noise to legacy tests.** The diagnostic is
  bounded once per method per module instance and production behavior remains
  quiet.
- **Reference equality with `graphStore` methods changes.** Method behavior and
  signatures remain compatible; tests will assert delegation rather than
  identity, because identity was the source of the ambiguity.
- **Existing module-level consumers still require migration work.** The patch
  makes the limitation explicit but cannot infer a provider outside React;
  documentation includes capture and dependency-injection patterns.
- **The upstream A2UI 1.0 renderer entry points are not yet published.** The
  public contract is therefore described as RC compatibility, with the exact
  official v0.9 engine boundary documented instead of claiming native v1
  renderer conformance.

## Migration Plan

1. Release the wrappers, deprecation annotations, regression tests, example
   correction, and documentation in 3.0.4.
2. Consumers migrate React callbacks to a captured `useGraphStoreApi()` value
   and inject explicit stores into non-React modules.
3. Retain the singleton delegates throughout 3.x; consider removing them from
   the callable hook only in the next major release.
4. Rollback is a source revert; no persisted data or package dependency changes
   are involved.
5. Replace the compatibility adapters with native v1 entry points only after a
   published upstream release passes the existing v0.9 regression suite.
