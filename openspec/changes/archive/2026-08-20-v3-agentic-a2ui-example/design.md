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

## Implementation design (2026-08-20)

### Shape

A dedicated Vite 8 + React 19 example at `examples/agentic-a2ui` (the path the coverage contract already declares). It is deliberately lean: no PGlite/Loro/TanStack — those lanes are certified by the Vite showcase. Dependencies are only the four workspace packages under test plus React/Tailwind.

### Agent host (in-page, keyless)

- `createA2AServer` + `buildAgentCard` + `DeterministicEntityGraphExecutor` run in the page; the client calls `server.handleRequest` directly (the server is Fetch/JSON-RPC native, so no HTTP hop and no model credential are needed). Streaming task state is consumed from the server's real async event stream; cancellation goes through the official `CancelTask` operation.
- Policy: `createEntityGraphA2APolicy` with `Task` allowlisted for upsert/patch/query/snapshot on exact fields; `remove` absent from the allowlist (denial scenario); `replace`/`remove` classed destructive with out-of-band approval; tenant/scope authorization fail-closed.

### A2UI rendering and action authority

- One `createPrometheusA2uiRuntime` with the default Prometheus catalog and `createEntityGraphA2uiActionPolicy` bound to the canonical `graphStore`. Agent-emitted `surface-task-sync` renders through `PrometheusA2uiSurface`.
- Action catalog cannot be bypassed: surface buttons emit official client actions that the runtime routes through the action policy; allowlist/field/tenant checks and the approval bridge execute before any graph write. Every decision is appended to an on-page audit log (`onDecision`).
- Human approval: `requestApproval` returns a promise resolved by an explicit Approve/Deny dialog — no auto-approval.

### Demonstrated scenario IDs (from `examples/shared/scenario-contract.json`)

`example.protocol.a2a-a2ui-policy` (happy/denied/malformed/cancelled/streaming/approval, keyless, surface `surface-task-sync`, `task.update` approved, `task.delete` denied), `example.graph.normalized-cross-view` (agent mutation updates ID-joined list + detail), `example.crud.optimistic-confirm` (patch → confirm → clear), `example.realtime.coalesced-cross-view` (`getRealtimeManager` 16 ms coalescing window), `example.runtime.lifecycle-security` (stale/fetching/success/terminal-error log, tenant mismatch rejected, destructive approval, secret-free evidence).

### Verification

- Golden protocol fixtures (`examples/agentic-a2ui/tests/golden/*.json`) replayed deterministically (fixed clock/IDs) by a node:test suite: happy, denied, malformed, cancelled.
- Playwright Chromium E2E (port 4181) covering the five flows with screenshots/traces and axe (no serious/critical).
- Release contract test + BDD feature/steps, single-command verifier, and coverage.json flipped to `implemented` — mirroring the certified Vite/Next.js precedent, with evidence labeled source-workspace and `countsAsPackedPackageEvidence: false`.

### Explicit exclusions

No model API key anywhere; no live external agent in CI (the external-executor configuration panel is demonstrable UI with loopback-only enforcement, not a certified integration); no library API changes; packed-tarball evidence stays with `v3-package-module-contracts` / `v3-release-pipeline-rc`.

