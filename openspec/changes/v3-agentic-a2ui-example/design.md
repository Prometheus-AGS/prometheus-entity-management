# Design: v3-agentic-a2ui-example

## Candidate reuse decisions

### cand-003 — Official A2UI web stack (@a2ui/react + @a2ui/web_core)

- **Verdict:** adopt
- **Decision:** Adopt the maintained 0.10.x package distributions, target their documented v0.9.1/current-production protocol entry point, and keep v1.0 candidate support behind a version adapter. Prometheus should own only graph projection, transport, policy, and themed catalog integration.
- **Evidence:**
  - Tier 3: The official React renderer was published as 0.10.2 from a2ui-project/a2ui. (https://www.npmjs.com/package/@a2ui/react)
  - Tier 4: Official guidance says web renderers should reuse web_core for JSONL parsing, schemas, surface state, data binding, and actions instead of reimplementing roughly 3,000 lines. (https://a2ui.org/guides/renderer-development/)
  - Tier 4: The version-aware official guide labels protocol v0.9.1 current production, v0.9 previous stable, and v1.0 candidate; the 0.10.x npm distribution version is a separate version axis. (https://a2ui.org/guides/renderer-development/)

### cand-019 — Existing @prometheus-ags/entity-graph-a2a alpha

- **Verdict:** adapt
- **Decision:** Use it as the deterministic local reference-agent base only after an upstream A2A conformance/version check. Add an A2UI artifact/metadata adapter rather than inventing a second task server.
- **Evidence:**
  - Tier 1: The package implements AgentCard creation, tasks/send|get|cancel, graph mutation/query parts, in-memory task storage, and artifact responses over a Fetch-compatible server. (https://github.com/Prometheus-AGS/prometheus-entity-management/tree/main/packages/entity-graph-a2a)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

