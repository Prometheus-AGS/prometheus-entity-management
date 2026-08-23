# Cycle 5 correction feedback

Both findings were reproduced before implementation.

For the critical finding, the existing session unit first streamed the happy
surface and then ran the malformed scenario. The assertion that the prior demo
surface was absent failed. The application runtime now exposes
`clearAgentSurfaces()`, which submits official `deleteSurface` messages for all
current surfaces. The session store invokes it at the start of every scenario
and on explicit reset. The sequential happy-then-malformed regression now passes.

For the warning, the existing approval unit issued a second archive request
while the first approval was pending. Before correction, the request overwrote
the pending ID and the test timed out because the first promise was orphaned.
`approvalStore.request()` now denies an overlapping request immediately while
leaving the first request and its resolver intact. The test proves the pending
ID is unchanged, the overlap returns `approval-denied`, and the original request
can still be approved and execute.

The two focused test files pass six tests, typecheck and scoped lint pass, and
the complete clean verifier then passed all 19 commands with ten example units,
three Chromium flows, per-flow axe receipts, package builds, ledgers, coverage,
security, strict OpenSpec, and diff hygiene. Review the complete corrected packet
without assuming these statements establish a PASS.
