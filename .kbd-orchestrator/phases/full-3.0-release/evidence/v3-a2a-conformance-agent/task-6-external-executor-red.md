# Task 6 gap correction — external executor red receipt

Final acceptance auditing found that the documented and exported optional
external-agent executor had no direct behavioral receipt.

Command:

```bash
pnpm --filter @prometheus-ags/entity-graph-a2a exec vitest run \
  src/a2a-server.test.ts -t 'optional external agent executor' --reporter verbose
```

Expected red result: one failed, one passed, fourteen skipped. The injected
fetch was not used for AgentCard discovery, so the SDK attempted a real network
connection to `127.0.0.1:43119` and failed with `ECONNREFUSED`. This proved that
the public `fetch` option covered JSON-RPC transport but not discovery, contrary
to the documented seam.

