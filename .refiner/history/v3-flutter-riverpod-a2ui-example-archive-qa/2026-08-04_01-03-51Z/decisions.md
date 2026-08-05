# Decisions — `v3-flutter-riverpod-a2ui-example-archive-qa`

## 2026-08-04 — Promote bounded Flutter evidence and terminate cycle 1

Decision: certify the Flutter/Riverpod/A2UI showcase, CRUD, and platform
coverage as implemented, retain durable-persistence evidence as partial, and
terminate the first QA cycle for fresh isolated review.

Rationale: stable Flutter 3.44.8 passed generation, formatting, analysis, 70
package tests, 25 showcase tests, three goldens, and package dry-run; the shared
smoke test passed on both an iOS simulator and Android API 35 emulator. Current
coverage, provenance, 44 focused release regressions, strict OpenSpec, hashes,
and remote-main checks all agree. Nothing proves physical devices, native
assistive technology, durable queue storage, hosted integrations, registry
authority, universal Tauri, or stable 3.0 completion, so those claims remain
excluded.

The React-first release lane remains independent: `3.0.0-rc.1` stays frozen at
remote `main` SHA `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`; this
continuation's A2UI patch Changeset belongs to a later coordinated prerelease.
