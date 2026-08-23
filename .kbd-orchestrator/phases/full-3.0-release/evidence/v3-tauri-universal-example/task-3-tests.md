# Universal Tauri example task 3 — test evidence

Date: 2026-08-04
Change: `v3-tauri-universal-example`
Task: 3 of 6

## Test surface added

- Added five Vitest runtime tests covering one normalized graph with ID-only
  lists, durable offline mutation restart, reconnect convergence, malformed
  queue rejection, browser/native IPC truthfulness, and fail-closed deep-link
  validation for scheme, tenant, route, encoding, and known graph IDs.
- Added two Rust mock-host tests. One invokes the registered platform ping,
  entity upsert, and entity read commands through Tauri IPC; the other proves
  that the main webview capability denies `graph_clear`.
- Added a source-contract verifier plus four rejection tests covering pinned
  workspace/runtime declarations, native plugin registration, desktop/mobile
  configuration, least-privilege capabilities, strict UI layering, offline
  runtime ownership, and generated Android/iOS shells. Its report explicitly
  sets `countsAsPlatformBuildEvidence: false`.
- Added three Playwright flows for normalized list/detail reactivity, durable
  offline restart and convergence, and a 390x844 responsive/accessibility
  projection. Test discovery passes; execution and its screenshots/traces are
  reserved for task 5's clean build/browser boundary.
- Extracted the existing deep-link policy into a pure parser so the actual
  untrusted-input boundary can be tested without fabricating native events.

## Verification

| Command or check | Result | Tier / claim |
|---|---|---|
| `pnpm install --frozen-lockfile --offline` | Passed for all 17 workspaces | dependency reproducibility |
| `pnpm run typecheck:tauri-universal` | Passed | T0 |
| `pnpm run test:tauri-universal:unit` | Passed, 5/5 | T1 |
| `pnpm run test:tauri-universal:contract` | Passed, 4/4 | T1 |
| Focused ESLint over the changed TypeScript, Playwright, and verifier files | Passed with zero warnings | T0 |
| `cargo +stable fmt --manifest-path examples/tauri-universal/src-tauri/Cargo.toml --check` | Passed | T0 |
| `CARGO_TARGET_DIR=target/tauri-universal-task3-stable cargo +stable test --locked --manifest-path examples/tauri-universal/src-tauri/Cargo.toml --lib` | Passed, 2/2 on Rust 1.97.1 stable | T1 native mock host |
| `node scripts/verify-tauri-universal-example.mjs` | Passed, 7/7 source checks | source contract only |
| Playwright `--list` with the universal config | Passed; all 3 flows discovered | discovery only; no E2E pass claimed |
| `git diff --check` | Passed | hygiene |

## Observed toolchain issue

The first Cargo test used the machine's default Rust 1.99.0 nightly and stopped
in a Tokio compiler internal error before compiling application tests. The
identical locked command passed under Rust 1.97.1 stable in a fresh target
directory. No application code or dependency was changed to work around the
nightly compiler failure.

## Security and trust boundaries exercised

- Persisted mutation-queue data is untrusted durable input; malformed structure
  fails closed before any graph mutation.
- Deep links are untrusted input; only the registered scheme, Task route,
  Prometheus tenant, decodable path, and an entity ID already present in the
  graph are accepted.
- Tauri IPC authorization is a real native trust boundary. The mock host proves
  allowed graph commands work and the withheld destructive clear permission is
  denied by the capability layer.
- Browser preview explicitly reports that it cannot provide native IPC denial
  evidence instead of fabricating a passing platform claim.

## Deliberately deferred

- The three Playwright flows were authored and discovered but not executed.
- Desktop Tauri build/command E2E, Android and iOS build/smoke evidence, clean
  production builds, and platform artifacts remain task 5.
- Coverage ledger, public API/skill/documentation synchronization remains task
  4. Final evidence limits and release impact remain task 6.
- This task does not change the frozen React `3.0.0-rc.1` source on remote
  `main`, npm dist-tags, registry state, signing, or app-store configuration.
