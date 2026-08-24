# Cycle 6 correction feedback

The prior report found two critical trust-boundary defects. Both were reproduced
before correction and remain retained in `cycle-6/findings.json`.

1. `agent-session-store.ts` now calls
   `approvalStore.getState().resolve(false)` before both `run()` and `reset()`
   replace session state. The focused session regression begins an archive
   request, crosses each boundary, proves `pending` is cleared, and proves the
   policy promise resolves as `approval-denied`.
2. `external-executor.ts` now parses the endpoint and rejects any non-empty URL
   `username` or `password` before AgentCard discovery. The focused package
   regression covers username-only and username/password HTTPS URLs.

The regenerated deletion-aware gate passes 19 commands, 11 example units, four
endpoint-policy tests, package builds, three Chromium flows, coverage, security,
strict OpenSpec, and diff hygiene. Review the current packet for new defects; do
not repeat a resolved finding without evidence that the correction is incomplete.
