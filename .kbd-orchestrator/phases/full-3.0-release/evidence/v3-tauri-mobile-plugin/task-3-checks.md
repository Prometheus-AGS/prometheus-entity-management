# v3-tauri-mobile-plugin task 3 — checks and evidence

## Outcome

The test infrastructure now proves the registered desktop plugin command, a fail-closed capability boundary, current Rust-derived TypeScript bindings, and a Rust consumer built solely from the npm tarball. Android and iOS have an exact simulator/device lane, but their runtime and visual artifacts remain mandatory stable-release blockers rather than fabricated passes.

## Executable checks added

- `tests/features/release/v3-tauri-mobile-plugin.feature` and its Cucumber steps cover bindings, desktop IPC, denial, packed consumption, native payload, and the mobile evidence contract.
- `tests/fixtures/tauri-plugin-host` is a Tauri consumer with generated ACL manifests. The `allowed` webview receives `entity-graph-tauri:default`; the `denied` webview receives no plugin permission.
- `scripts/verify-tauri-mobile-plugin.mjs` runs the binding drift/type/runtime checks, Rust 1.88 host tests, npm packing, payload inspection, and the same host tests against the extracted candidate crate.
- `.github/workflows/tauri-plugin-platform.yml` runs the contract on macOS with current stable Rust for generation and Rust 1.88 for the consumer path.
- `release/tauri-mobile-device-lane.md` defines the non-mock Android and iOS command, denial, machine-readable output, screenshot, hash, and environment evidence required before stable release.

## Dependency/MSRV correction

The first pinned Rust 1.88 run exposed that Specta rc.24/rc.25 uses standard-library APIs stabilized after the ratified MSRV. The binding toolchain remains on current rc.25, but `tauri-specta`, `specta`, and `specta-typescript` are now optional `generate-bindings` dependencies. Normal plugin consumers compile and execute under Rust 1.88; the development-only generator runs on current stable Rust. The checked-in generated file passes its drift check.

## TDD and BDD evidence

Initial red checks:

- the plugin-internal mock host was denied with `entity-graph-tauri.graph_platform_ping not allowed. Plugin not found`, proving a generated consumer ACL was necessary;
- the first capability feature run reported all 13 steps undefined;
- Rust 1.88 rejected the non-optional Specta rc.25 dependency;
- the compatible-generation experiment intentionally reported stale bindings before regeneration.

Final checks:

```text
cargo +1.88.0 check --manifest-path packages/entity-graph-tauri/rust-plugin/Cargo.toml
PASS

cargo +stable run --manifest-path packages/entity-graph-tauri/rust-plugin/Cargo.toml --bin generate-bindings --features generate-bindings -- --check
bindings are current

pnpm --filter @prometheus-ags/entity-graph-tauri typecheck
PASS

pnpm --filter @prometheus-ags/entity-graph-tauri test
2 files, 16 tests passed

pnpm run verify:tauri-plugin
PASS: real desktop IPC, capability denial, packed Rust host, native payload, and documented mobile device lane

pnpm run bdd:tauri-plugin
4 scenarios, 14 steps passed
```

Machine-readable result: `task-3-verification.json`.

Visual result: `task-3-host-contract.svg` and `task-3-host-contract.png`.

## Honest remaining limit

No Android device/emulator or iOS simulator/device was executed in this task. The visual evidence therefore shows both lanes as `EVIDENCE REQUIRED`. Task 6 must not certify stable `3.0.0` until the device-lane artifacts described in `release/tauri-mobile-device-lane.md` exist and their responses and hashes are independently verified.
