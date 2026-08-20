# Agentic A2UI Showcase (`examples/agentic-a2ui`)

A dedicated, keyless end-to-end demonstration of the 3.0 agentic surface:

- A **deterministic A2A v1 agent** (`@prometheus-ags/entity-graph-a2a`) runs
  in-page over the official JSON-RPC wire — no HTTP hop, no model credential.
- Agent output renders as **official A2UI v0.9.1 surfaces**
  (`@prometheus-ags/a2ui-react`) through the maintained official renderer.
- Every surface action crosses the **declared action catalog**
  (entity/action/field allowlists, tenant authorization, human approval for
  destructive operations) before any graph write. The agent cannot bypass it.
- Mutations land in the normalized entity graph once; every joined view
  (lists, detail, comments) updates from the single canonical copy.

## Scenarios

| Button | Demonstrates |
| --- | --- |
| Stream authorized update | A2A `submitted → working → completed` streaming with an authorized graph upsert |
| Ask agent to delete (denied) | `remove` is outside the Task allowlist → `TASK_STATE_REJECTED`, entity survives |
| Send malformed payload | Invalid JSON-RPC params are rejected with a protocol error |
| Stream then cancel | `CancelTask` during the working window → `TASK_STATE_CANCELED` |
| Render A2UI task board | A2UI artifact over A2A plus the app-owned `surface-task-sync` projection |
| Optimistic complete | Local patch visible everywhere, canonical lags, confirm clears the patch |
| Realtime burst | Three adapter events coalesce into one 16 ms flush window |
| Simulate terminal error | Lifecycle log records `stale → fetching → terminal-error` |

The tenant selector switches the session tenant; `tenant-b` is refused before
any graph access. The external-agent panel accepts HTTPS or loopback endpoints
only and stores no credentials.

## Verification

```bash
pnpm run verify:agentic-a2ui        # typecheck, golden replay, builds, browser E2E
pnpm run test:agentic-a2ui:golden   # golden protocol transcripts only
pnpm run test:agentic-a2ui:browser  # Playwright Chromium suite only
```

Golden fixtures in `tests/golden/` pin the happy/denied/malformed/cancelled
transcripts. Regenerate intentionally with
`UPDATE_GOLDEN=1 pnpm --filter prometheus-entity-management-agentic-a2ui test:golden`.
