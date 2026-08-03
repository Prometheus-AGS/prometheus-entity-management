# Adversarial review remediation — round 1

The two CRITICAL findings are packet-visibility false positives caused by the
packet builder using `git diff HEAD`: the referenced ledger and coverage files
are new, untracked artifacts in this change, so Git omitted their contents from
the diff packet even though both exist and are validated.

Direct evidence:

- `prometheus-entity-skills/_shared/references/tauri-library-exports.json`
  declares 26 runtime and 57 declaration exports for
  `@prometheus-ags/entity-graph-tauri`.
- The runtime ledger contains `platformPing`, `generatedCommands`,
  `generatedEvents`, and `PLUGIN_NAME`.
- The declaration ledger contains `PlatformPing`, `RustPlatformPing`, and
  `GraphCommands`.
- `pnpm run verify:skills` passes and reports: `OK: 26 runtime and 57
  declaration exports match the Tauri skill ledger.`
- `examples/coverage.json` sets `release.platform.tauri-plugin.status` to
  `implemented`, points its command at `pnpm run verify:tauri-plugin`, and
  includes `device/device-evidence.json` in the gate evidence.
- The `platform.tauri` capability contains a mobile `implemented` entry with
  the Android/iOS success and denial screenshots plus the device manifest.
- `pnpm run verify:example-coverage` passes all 13 semantic scenarios.

The WARNING was valid and is remediated in
`packages/entity-graph-tauri/src/commands.ts`: `persistSnapshot` now states
that it stores data in the native in-memory mirror, does not survive restart,
and directs durable consumers to `createTauriSqlPersistenceAdapter`. A release
test rejects the obsolete configured-SQLite wording; focused release and
package tests pass.

Please re-evaluate the current packet with these omitted-file facts. Do not
convert the packet-builder limitation into a product finding.
