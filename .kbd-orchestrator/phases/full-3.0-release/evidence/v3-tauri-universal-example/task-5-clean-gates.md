# Universal Tauri task-5 clean gates

**Date:** 2026-08-04

**Candidate:** `76b68d792215cdc4b901ef665b1283ff4d23e6cd` plus the task-5 diff

**Result:** PASS at the declared browser, macOS, Android-emulator, and iOS-simulator boundary

## Platform execution

| Gate | Result | Evidence |
| --- | --- | --- |
| Chromium application flows | Pass, 5/5 | Normalized cross-view state, relationship invalidation, realtime coalescing, offline restart/reconnect, responsive accessibility; zero serious/critical axe findings |
| macOS packaged application | Pass | Native SQLite runtime, real IPC, destructive-clear denial, queued offline change, process termination/relaunch restoration, reconnect |
| Android application | Pass | API 36 arm64 Pixel_9_Pro_XL emulator, version `0.0.1`, min SDK 24, target SDK 36, native runtime and destructive-clear denial |
| iOS application | Pass | iPhone 17/iOS 26.5 arm64 simulator, unsigned `0.0.1` archive, install and runtime |

The hash-verified machine receipt is `task-5-platform-evidence.json`. It binds
thirteen screenshots and five Playwright traces. The source verifier keeps
`countsAsPlatformBuildEvidence: false` and verifies that separate receipt.

## Clean command matrix

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile --offline` | Pass; all 17 workspaces, lockfile unchanged |
| `pnpm run typecheck:tauri-universal` | Pass |
| `pnpm run test:tauri-universal:unit` | Pass, 7/7 |
| `pnpm run test:tauri-universal:contract` | Pass, 6/6 including three rejection regressions |
| `pnpm --filter prometheus-tauri-universal-example build` | Pass; Vite 8 production build |
| `pnpm --filter @prometheus-ags/entity-graph-tauri typecheck` | Pass |
| `pnpm --filter @prometheus-ags/entity-graph-tauri test` | Pass, 16/16 |
| `pnpm --filter @prometheus-ags/entity-graph-tauri build` | Pass; ESM, CommonJS, and both declaration forms |
| `pnpm --filter @prometheus-ags/entity-graph-tauri run verify:skills` | Pass; 26 runtime and 57 declaration exports |
| `pnpm --filter @prometheus-ags/entity-graph-tauri pack --dry-run` | Pass; intended JS declarations, docs, permissions, and Rust/Kotlin/Swift native payload |
| `pnpm run test:tauri-universal:rust` | Pass on stable Rust, 2/2 after one serialized 4m42s build |
| `pnpm run verify:tauri-universal` | Pass, 8/8 source/receipt checks |
| `pnpm run verify:example-coverage` | Pass, 13 scenarios and 16 stable capabilities/artifacts mapped; overall release remains in progress |
| `pnpm run test:example-coverage` | Pass, 15/15 |
| `pnpm run bdd:example-coverage` | Pass, 4 scenarios and 27 steps |
| `pnpm run test:release-contract` | Pass, 16/16 |
| `pnpm run bdd:release-contract` | Pass, 5 scenarios and 32 steps |
| `pnpm run verify:skills` | Pass for React, sync, A2UI, A2A, Tauri, and 81 Dart declarations |
| `pnpm run security:audit` | Pass; 334 dependencies, two low findings, zero high/critical/blocking advisories |
| `pnpm exec openspec validate v3-tauri-universal-example --type change --strict --no-interactive` | Pass |
| `pnpm exec changeset status --output /dev/stdout` | Pass; Tauri IPC correction has a patch changeset and fixed RC group remains coherent |
| `git diff --check` | Pass |

Two nonexistent convenience aliases (`test:v3-release-contract` and
`bdd:v3-release-contract`) were attempted once, produced only missing-script
errors, and were immediately replaced by the repository's actual
`test:release-contract` and `bdd:release-contract` commands above. No product
gate failed.

## Observed corrections

- The public list payload allowed omitted pagination metadata while the Rust
  IPC type required the complete shape. The command facade now normalizes
  omitted metadata to `null`, `null`, and `false`, with an exact invoke-payload
  regression and a patch changeset.
- The generated Android and iOS build phases could inherit nightly Rust, which
  reproduced a compiler ICE in Tokio. Both platform build phases now force the
  stable toolchain; stable builds completed.
- Tauri rejected application version `0.0.0` for Android. The private example
  uses buildable application version `0.0.1`, and the generated mobile metadata
  is synchronized.
- Browser restart previously restored the queue but not the operator-selected
  offline mode. The persisted connection mode now restores the complete
  offline/reconnect state.

## Security boundary and operational incident

The packaged macOS and Android applications proved denial of the withheld
destructive-clear permission. Persisted queue input and deep links continue to
fail closed before graph mutation.

A failed Android diagnostic serialized an inherited Cargo registry credential
into tool output. Later platform commands removed unrelated registry
credentials from the child environment. The redacted postmortem is
`.prometheus/postmortems/2026-08-04-tauri-diagnostic-environment-secret-exposure.md`.
The exposed credential must be rotated by its external owner.

## Explicit limits

- Windows and Linux desktop bundles were not executed.
- Android evidence is emulator evidence, not a physical-device receipt.
- iOS evidence is unsigned simulator evidence, not a physical-device or
  distribution-signing receipt.
- Native assistive-technology and app-store certification are not claimed.
- This showcase does not authorize npm publication, npm `latest`, or stable
  3.0.0. The frozen React RC source remains independent.
