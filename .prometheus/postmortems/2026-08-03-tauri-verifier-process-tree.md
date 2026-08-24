# Tauri verifier timeout leaked Cargo into the next BDD scenario

Date: 2026-08-03

## Symptom

The immutable `3.0.0-rc.1` proof reached the Tauri BDD feature on a cold
worktree. The Cucumber step killed `verify-tauri-mobile-plugin.mjs` at ten
minutes, but its active `cargo run ... generate-bindings` child remained alive
with parent PID 1. The next scenario invoked the verifier again and contended
with that orphaned Cargo process. The progress formatter consequently showed
repeated failures without reaching its final diagnostics.

## Root cause

The verifier command timeout, the synchronous Cucumber child timeout, and the
Cucumber default step timeout were all ten minutes. The outer timeout could
therefore win the race before the verifier cleaned up its child. Node's
`execFile` timeout terminates the direct child, not the complete Cargo process
tree. The BDD `ensureReport()` function also retried the same expensive failed
verification for every scenario because it cached only successful reports.

The GitHub CI and protected rehearsal jobs additionally invoked the same
multi-runtime portfolio without installing the release contract's Flutter
toolchain, so the local proof environment was not reproducible remotely.

## Fix

- Run every verifier command in its own process group and terminate that group
  on command timeout or parent `SIGTERM`/`SIGINT`.
- Use a strict timeout hierarchy: 15-minute verifier command, 25-minute
  Cucumber child, 30-minute Cucumber step, 45-minute aggregate test gate, and
  60-minute workflow job.
- Cache the first verifier error so later scenarios fail immediately instead
  of repeating the cold native build.
- Install Flutter `3.44.8`, current stable Rust, and Rust `1.88.0` in both CI
  and the protected RC rehearsal.

## Prevention

Every nested native verifier must have an explicitly increasing timeout at
each enclosing layer, and the layer that owns a child process must terminate
the complete process tree. Workflow tests must also prove that every runtime
used by the aggregate gate is installed in the hosted runner.
