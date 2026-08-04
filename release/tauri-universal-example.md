# Universal Tauri desktop/mobile showcase

`v3-tauri-universal-example` owns the complete application proof for one
React 19/Vite 8 frontend running through Tauri 2 on desktop, Android, and iOS.
It builds on the independently certified `@prometheus-ags/entity-graph-tauri`
plugin; it does not reuse plugin bridge receipts as application certification.

## Current disposition

The source, generated platform shells, focused browser-runtime tests, source
contract, and stable-Rust Tauri MockRuntime tests are implemented. The machine
showcase entry remains `planned` because clean browser visuals, a packaged
desktop command E2E, and Android/iOS application build/smoke receipts have not
yet run. Task 5 owns those gates.

The coverage ledger separately records `partial` evidence for the tested
offline/restart service contract and the desktop MockRuntime command/capability
boundary. This preserves observed progress without promoting the application.

## Ownership boundary

| Layer | Owner |
| --- | --- |
| Components | Rendering, accessible interaction, responsive layout |
| Hooks | Task-board and platform orchestration |
| Platform store | Application-facing runtime state and intent methods |
| Platform service | Graph hydration, persistence, queueing, native commands, deep links, lifecycle |
| Canonical graph | Entities once, ID-only task list, optimistic patches, sync metadata |
| Tauri host | Plugin registration, SQL/deep-link plugins, capabilities, platform packaging |

All platform conditionals remain inside the service. Browser preview uses
localStorage while Tauri uses `createTauriSqlPersistenceAdapter`; both feed the
same graph and React projection. The Rust plugin's in-memory mirror is not
described as restart durability.

## Trust boundaries

- `universal-main.json` grants only the graph commands required by the main
  webview. Clear, remove, and in-memory snapshot permissions remain withheld.
- Deep links are untrusted. The application accepts only
  `prometheus-entity://task/<known-id>?tenant=prometheus-labs` after scheme,
  route, tenant, decoding, and known-entity checks.
- The persisted mutation queue is untrusted durable input. Invalid structure
  fails before it can mutate the graph.
- Browser preview reports that it cannot prove native IPC authorization rather
  than returning a synthetic denial receipt.

## Evidence matrix

| Claim | Status | Evidence |
| --- | --- | --- |
| Normalized graph with ID-only task list | Implemented source/focused test | Five Vitest tests and source verifier |
| Offline queue survives restart and converges | Implemented browser-runtime test | Dispose/reinitialize/reconnect unit |
| Native command registration and allowed round trip | Implemented mock host | Stable-Rust Tauri MockRuntime |
| Destructive command denied | Implemented mock host | Main webview `graph_clear` denial |
| Deep-link policy fails closed | Implemented unit | Scheme, tenant, known ID, malformed encoding |
| One desktop/mobile Tauri configuration | Implemented source | Config/capability/generated-shell verifier |
| Responsive browser flows | Authored, not executed | Three discovered Playwright tests |
| Desktop package and command E2E | Pending task 5 | No receipt claimed |
| Android application build/smoke | Pending task 5 | Generated shell is not execution |
| iOS application build/smoke | Pending task 5 | Generated shell is not execution |
| Relationship cascade invalidation | Pending application receipt | Shared scenario remains mapped |
| Realtime coalesced cross-view update | Pending application receipt | Shared scenario remains mapped |
| Accessibility, screenshots, and traces | Pending task 5 | No visual promotion claimed |

## Commands

Focused source/test boundary:

```bash
pnpm run typecheck:tauri-universal
pnpm run test:tauri-universal:unit
pnpm run test:tauri-universal:rust
pnpm run test:tauri-universal:contract
pnpm run verify:tauri-universal
```

Task 5 runs the clean browser and platform gates. A green source verifier is
not interchangeable with a Tauri bundle or device receipt.

## Public API and release impact

This example adds no `@prometheus-ags/entity-graph-tauri` exports. The existing
Tauri public ledger remains 26 runtime exports and 57 declaration exports and
must continue to pass the package `verify:skills` gate.

The worktree does not move the frozen React `3.0.0-rc.1` candidate on `main`,
publish npm `next`, change `latest`, configure app stores, or authorize stable
3.0.0. The React RC can be staged independently through the protected release
workflow while this showcase is completed.
