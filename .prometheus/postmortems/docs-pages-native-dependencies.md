# 2026-08-05 — Pages native-documentation verification failure

## Symptom

Documentation workflow run `31036700071` failed before deployment while
executing `pnpm run docs:native-api:verify` on Ubuntu 24.04. Rustdoc compilation
for the Tauri plugin could not resolve `glib-2.0`, `gobject-2.0`, or `gio-2.0`
through pkg-config.

## Root cause

The Pages workflow installed Flutter and Rust and ran the full native
reproducibility gate even though the documented Pages architecture excludes
Flutter/Rust matrices. The Tauri rustdoc graph reaches Linux GTK/GLib bindings,
so full regeneration requires native desktop development packages that a
targeted static-site deployment should not install.

## Fix

Pages now runs `docs:native-api:check`, which validates the content-addressed
manifest for 38 native source files and 729 committed dartdoc/rustdoc artifacts.
It installs neither Flutter nor Rust. `docs:native-api:verify` remains unchanged
as the full pinned-toolchain release certification gate and is now explicit in
`RELEASING.md`.

## Prevention

Site-contract tests reject Flutter/Rust toolchain setup and full native
regeneration in the Pages workflow, require the manifest-only command, confirm
artifact SHA-256 aggregation, and require the full verifier in the release
checklist. Local verification passed the native manifest check, 18/18 site
contracts, documentation type/content checks, README parity, and actionlint.
