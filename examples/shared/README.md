# Shared example contract

The five Prometheus 3.0 showcase applications use one presentation-neutral domain and scenario vocabulary. This directory is the canonical source for that vocabulary:

- `scenario-contract.json` defines deterministic Project, User, Task, Comment, and Activity fixtures, ID-only lists, keyless transport fixtures, security boundaries, and the scenario outcomes every showcase must preserve.
- `scenario-contract.schema.json` fails closed when the contract shape, required domain, deterministic transport kinds, or minimum scenario inventory drifts.

Run the semantic contract and its coverage checks from the repository root:

```bash
pnpm run verify:example-coverage
```

## Evidence boundary

The verifier is a small semantic oracle, not a substitute for an application test. It proves that the shared fixtures and expected outcomes are internally coherent and that every stable 3.0 capability is mapped to a runnable scenario. It does **not** certify that React, Next.js, A2UI, Flutter, or Tauri implements those outcomes.

Each showcase-owning change must still provide its own runtime, platform, accessibility, and truthful visual evidence. `examples/coverage.json` remains `in-progress` until every release-evidence entry and every showcase is implemented.

## Consumer rules

Showcases may differ in presentation, navigation, and platform integrations, but they must preserve these semantics:

1. Canonical entities live once in the graph, while lists retain IDs only.
2. UI-only patches remain separate from server-confirmed entity data.
3. Components read through framework hooks or bindings; stores and adapters own external I/O.
4. Optimistic mutation, rollback, relationship invalidation, completeness modes, realtime batching, persistence, hydration, and protocol policy use the named scenarios as their acceptance vocabulary.
5. Demo data is synthetic, tenant-scoped, deterministic, and contains no credentials or production endpoints.

When a showcase implements a scenario, update its `runtimeEvidence` and `visualEvidence` entries in `examples/coverage.json` with reproducible commands and non-empty evidence paths. Do not mark the overall coverage contract complete until the verifier accepts the completed state.
