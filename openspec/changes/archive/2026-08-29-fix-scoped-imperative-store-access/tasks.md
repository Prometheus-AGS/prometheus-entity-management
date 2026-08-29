## 1. Contract and regression

- [x] 1.1 Add focused React tests that reproduce the provider/singleton split, verify captured `useGraphStoreApi()` callbacks write only to the scoped graph, and verify each compatibility diagnostic is bounded.

## 2. React binding

- [x] 2.1 Replace copied imperative method references with deprecated singleton delegates and verify the React package TypeScript check and focused `graph-store` tests pass.

## 3. Next.js integration

- [x] 3.1 Change the hydration boundary to capture the provider-owned `GraphStore`, add a regression proving the singleton remains unchanged, and pass the focused Next.js unit/contract checks.

## 4. Documentation and compatibility

- [x] 4.1 Update the React/Next.js API guidance and changelog with callback capture, non-React dependency injection, Server Component limits, and the 3.x deprecation path; verify documentation contract tests pass.

## 5. A2UI 1.0-RC and AG-UI compatibility

- [x] 5.1 Accept and normalize strict A2UI 1.0-RC surface messages in the React runtime, including response-aware actions and app-owned function calls.
- [x] 5.2 Consume AG-UI 0.0.59 `a2ui-surface` activity snapshots with deterministic replacement semantics and no authority bypass.
- [x] 5.3 Upgrade the Flutter showcase to validate A2UI 1.0-RC surface input and normalize it to the published GenUI renderer boundary; update focused tests and dependency pins.
- [x] 5.4 Document the compatibility boundary without claiming unpublished native A2UI 1.0 renderer conformance.

## 6. Completion gates

- [x] 6.1 Run scoped T0 checks, targeted T1 tests, relevant package/packed-consumer T2 gates, strict OpenSpec validation, and release verification; record evidence before archive and 3.0.4 publication.
  - The configured harness prohibited subagent delegation, so the final artifact review was performed locally and is not represented as an isolated-agent review.
