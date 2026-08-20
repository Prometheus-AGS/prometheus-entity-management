# Verification — `v3-agentic-a2ui-example`

Date: 2026-08-20
Verdict: **PASS — IMPLEMENTATION CERTIFIED AND OPENSPEC ARCHIVED**

## Acceptance matrix

| Plan acceptance criterion | Evidence | Result |
| --- | --- | --- |
| CI needs no model API key | `verification.json` protocol block: `keyless: true`, `modelCredentialRequired: false`; release test scans the example for credential references | Pass |
| Golden protocol fixtures cover happy/denied/malformed/cancelled | `examples/agentic-a2ui/tests/golden/*.json` replayed byte-for-byte by `golden-replay.test.ts` (6/6) with fixed clock and deterministic IDs | Pass |
| Browser E2E covers the flows | 4/4 Chromium tests: happy stream + cross-view mutation, A2UI policy boundary, denied/malformed/cancelled, tenant/optimistic/realtime/lifecycle | Pass |
| Agent-generated UI cannot bypass the action catalog | `createEntityGraphA2uiActionPolicy` allowlist + tenant authorize + approval bridge; browser proof: `task.update` approved, `task.delete` denied, destructive replace gated by dialog; `actionCatalogBypassed: false` | Pass |
| Streaming task state, artifact rendering, validation failures, authorization denial, human approval, cancellation, optional external-agent configuration | A2A timeline panel (submitted/working/completed/rejected/canceled), A2UI surface rendering, JSON-RPC error path, 403 tenant refusal, approval dialog, loopback/HTTPS-only external endpoint field | Pass |

## Gates run (all exit 0)

- `pnpm --filter prometheus-entity-management-agentic-a2ui typecheck`
- `pnpm run test:agentic-a2ui:golden` — 6/6 node:test golden replays (both
  generate and compare modes)
- `pnpm --filter prometheus-entity-management-agentic-a2ui build` — production Vite build
- `pnpm run test:agentic-a2ui:browser` — 4/4 Playwright Chromium (production preview)
- `pnpm run verify:agentic-a2ui` — full chain, wrote `verification.json` with
  sha256-pinned artifacts
- `pnpm run verify:example-coverage` — errors: []
- `pnpm run test:v3-agentic-a2ui-example` — 7/7 release contract tests
- `pnpm run bdd:agentic-a2ui` — 3 scenarios / 15 steps
- `pnpm run lint`, `pnpm run validate` — clean
- `openspec validate v3-agentic-a2ui-example --strict` — valid
- `pnpm changeset status` — pass (no package bump; example-only change covered
  by the existing empty changeset disposition)

Per A-9 tier discipline and the certified-example precedent, the focused gate
set above is the change-completion gate; the repo-wide battery stays with
later release phases and is not claimed here.

## Unresolved limits

- Browser certification is Chromium desktop only.
- The agent is the deterministic reference executor; live LLM-backed agents and
  live external A2A endpoints are demonstrable configuration surface, not
  certified integrations.
- Evidence is source-workspace based (`countsAsPackedPackageEvidence: false`);
  packed-tarball consumer proof stays with `v3-package-module-contracts` /
  `v3-release-pipeline-rc`.
- The demo realtime adapter is in-memory; live Supabase/WebSocket sources are
  covered by other lanes.

## Visual evidence

Four pinned Chromium screenshots (`browser-happy-cross-view.png`,
`browser-a2ui-policy.png`, `browser-denied-malformed-cancel.png`,
`browser-tenant-realtime-lifecycle.png`) with Playwright traces, zero
serious/critical axe violations, and zero console errors.
