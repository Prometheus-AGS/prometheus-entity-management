# Task 3 — integration and consumer certification

Date: 2026-08-01  
Runtime exercised: Node `v24.16.0`  
Task verdict: **PASS**  
Change verdict: **IN PROGRESS — tasks 4–6 remain**

## Evidence matrix

| Obligation | Authoritative receipt | Result |
| --- | --- | --- |
| Real durable storage | `pglite-persistence.integration.test.ts` opens PGlite `0.5.4` on a temporary filesystem path, persists, closes, reopens, and hydrates | Pass |
| Deterministic two-client convergence | `loro-convergence.test.ts` uses two isolated stores/registries and checks FIFO/reverse delivery for different-field and same-field conflicts | Pass |
| Inbound provenance | Convergence test asserts the loopback queue stays empty after inbound graph projection | Pass |
| Channel mechanics | `loro-websocket-channel.test.ts` asserts queued writes, reconnect flush, and peer sync-request responses | Pass |
| Real relay E2E | `loro-websocket.integration.test.ts` uses `ws` `8.21.1`, an ephemeral TCP port, two actual sockets, forced termination, offline writes, reconnect, and canonical convergence | Pass |
| Mandatory no-skip rule | Release test scans all mandatory receipts for `.skip`, `.todo`, environment conditions, `runIf`, and `skipIf` | Pass |
| Packed ESM runtime | Tarball-only consumer creates two clients and performs Loro loopback convergence | Pass |
| Packed CommonJS runtime | Tarball-only consumer resolves core plus all new sync runtime exports | Pass |
| Packed NodeNext declarations | Tarball-only TypeScript 6 consumer imports the new functions and public types with `skipLibCheck: false` | Pass |
| BDD behavior | `pnpm run bdd:sync-persistence` | 4 scenarios, 21 steps passed |

The generated packed-candidate receipt is `packed-consumer-report.json`; both package payload/manifest checks and all three consumer modes are `pass`.

## Mandatory commands

- `pnpm run test:sync-persistence`
- `pnpm run verify:sync-persistence`
- `pnpm run bdd:sync-persistence`
- `pnpm --filter @prometheus-ags/entity-graph-sync test:websocket-integration`

The root `pnpm test` command now includes both the focused sync test gate and the packed-candidate verifier before the all-feature BDD run. The real relay lane is local and deterministic; it is not hidden behind an environment variable and cannot turn green by being skipped.

## Platform and external boundaries

- This receipt directly exercises Node 24. The existing clean-install CI matrix owns Node 22, 24, and 26 execution and will be re-run in task 5.
- The relay test uses actual WebSocket protocol implementation and TCP sockets but no remote service or credentials.
- The sibling `prometheus-entity-sync` repository remains explicit opt-in integration evidence and is not imported, linked, or counted here.
- Browser, desktop, mobile, Flutter, and Tauri runtime evidence is outside this headless package change and remains owned by their planned showcase changes.

## Visual-evidence determination

No rendered UI was created or changed. A screenshot cannot prove database durability, CRDT convergence, socket recovery, or tarball loader correctness. The truthful visual-equivalent evidence for this task is the explicit state-transition/assertion transcript represented by the BDD output and machine-readable consumer report. Actual screenshots, accessibility reports, browser traces, device video, and hash manifests remain mandatory for the later rendered showcase and Docusaurus changes and are not claimed by this task.
