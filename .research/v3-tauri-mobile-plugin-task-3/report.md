# Tauri plugin verification research

## Decision

The task 3 gate must not use frontend IPC mocks as native proof. It should execute the registered Rust plugin through a Tauri consumer context that has generated ACL manifests, assert both an allowed and denied webview, then repeat the host test against the Rust crate extracted from the npm tarball.

Android and iOS remain a distinct runtime evidence class. The repository can provide a precise device lane now, but stable release certification must remain blocked until that lane records the real Kotlin/Swift `ping` response plus a capability-denial artifact on each required platform.

## Implemented consequence

- `tests/fixtures/tauri-plugin-host` is a real Tauri consumer, not a plugin-internal state test.
- `scripts/verify-tauri-mobile-plugin.mjs` checks source-host IPC, denial, packed payload, and the extracted packed Rust consumer.
- `release/tauri-mobile-device-lane.md` defines the required Android/iOS invocation and artifact schema without claiming it already ran.
- The generated SVG deliberately marks device evidence as required; it does not turn documentation into a false green result.

The pinned Rust run also exposed that Specta rc.24/rc.25 is incompatible with the ratified Rust 1.88 minimum because it uses standard-library APIs stabilized later. The implementation therefore keeps the current rc.25 generator cohort optional, verifies the generated bindings on current stable Rust, and verifies ordinary and packed plugin consumers under Rust 1.88. Simply testing the consumer on a newer compiler would conceal the contract break.

## Sycophancy correction

The most flattering conclusion—"mobile is done because Cargo and the native sources pass"—is not supported. Host compilation proves compatibility, not native registration or execution. The evidence model therefore records desktop and packed-consumer success while preserving a stable-release blocker for both mobile platforms.
