# Tauri mobile device lane

This lane closes the gap that Cargo cross-compilation cannot close: it proves that Tauri registers the packaged Kotlin or Swift plugin, authorizes IPC, and returns through the real native bridge.

The plugin lane is complete only when the verifier accepts hash-verified Android and iOS receipts for both the native response and capability denial. This repository now carries those receipts; full `3.0.0` certification and publication remain governed by their separate release changes.

## Shared host assertion

The host must register `entity_graph_tauri::init()` and grant `entity-graph-tauri:default` to the test webview. Its test screen calls the generated TypeScript binding `commands.graphPlatformPing()` and renders the returned JSON. Success is exact, not inferred from compilation:

```json
{"plugin":"entity-graph-tauri","platform":"android"}
```

or:

```json
{"plugin":"entity-graph-tauri","platform":"ios"}
```

The same screen must run once with the capability removed and record Tauri's authorization rejection.

## Android physical device

1. Connect an Android physical device with developer mode and USB debugging enabled.
2. Start the consumer host with `pnpm tauri android dev`, select that device, and open the plugin contract screen.
3. Invoke `commands.graphPlatformPing()` from the screen. Do not replace it with a JavaScript mock or a direct Kotlin unit call.
4. Save the successful return value as `android/platform-ping.json` and capture the rendered screen as `android/platform-ping.svg` or a PNG screenshot.
5. Remove `entity-graph-tauri:default`, rebuild, invoke the same command, and save the denial as `android/capability-denial.json`.

## iOS simulator or physical device

1. Boot an iOS simulator or connect a provisioned physical device.
2. Start the same consumer host with `pnpm tauri ios dev`, select the target, and open the plugin contract screen.
3. Invoke `commands.graphPlatformPing()` from the screen. Do not replace it with a JavaScript mock or a direct Swift unit call.
4. Save the successful return value as `ios/platform-ping.json` and capture the rendered screen as `ios/platform-ping.svg` or a PNG screenshot.
5. Remove `entity-graph-tauri:default`, rebuild, invoke the same command, and save the denial as `ios/capability-denial.json`.

## Evidence manifest

Store both platform folders under `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-mobile-plugin/device/`. Add `device-evidence.json` containing the device or simulator model, OS version, commit SHA, command name, exact response, artifact paths, SHA-256 hashes, and operator timestamp. The verifier recomputes every declared hash and matches both platform responses and denials before it marks this plugin gate complete.
