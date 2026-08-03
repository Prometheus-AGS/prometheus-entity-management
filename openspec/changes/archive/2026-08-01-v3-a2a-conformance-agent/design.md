# Design: v3-a2a-conformance-agent

## Candidate reuse decisions

### cand-019 — Existing @prometheus-ags/entity-graph-a2a alpha

- **Verdict:** adapt
- **Decision:** Use it as the deterministic local reference-agent base only after an upstream A2A conformance/version check. Add an A2UI artifact/metadata adapter rather than inventing a second task server.
- **Evidence:**
  - Tier 1: The package implements AgentCard creation, tasks/send|get|cancel, graph mutation/query parts, in-memory task storage, and artifact responses over a Fetch-compatible server. (https://github.com/Prometheus-AGS/prometheus-entity-management/tree/main/packages/entity-graph-a2a)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

