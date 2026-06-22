# Current Waypoint

**Active phase:** `phase-v3-universal-platform-evolution`
**Previous phase:** `phase-v2-realtime-fabric-parity`
**KBD process state:** `execution_dispatched`
**Updated:** 2026-06-22

## Status

Universal Platform Evolution — **execution dispatched**. Backend = OpenSpec via `/kbd-apply`. 17 changes across 5 waves, all PENDING. No code written yet — this is the dispatch contract (`execution.md`).

## Next pending change

`v3-monorepo-and-tooling` (Wave 1 foundation), then `v3-core-extraction` (critical-path unlock).

## Exact next command

```
git checkout -b feat/v3-universal-platform-evolution
/kbd-apply v3-monorepo-and-tooling
```

## Approval gates before apply writes code
1. **BRANCH GATE** — cut `feat/v3-universal-platform-evolution` off main
2. **BREAKING-CHANGE GATE** — `v3-core-extraction` is semver MAJOR (3.0.0); ship as a re-export shim so no consumer breaks
3. **GREENFIELD-LANGUAGE GATE** — `v3-rust-cli`/`mcp`/`a2a`/`tauri` need cargo; `v3-flutter-package` needs dart/flutter — confirm toolchains or those changes mark BLOCKED
4. **TURBOREPO-NOW GATE** — confirm adopting Turborepo in Wave 1
5. **RELEASE-SHIM GATE** — confirm v3.0.0 ships as the re-export shim

## Note on environment
The pure-Node framework chain (Waves 1–3 minus rust-cli) is fully achievable here. The Rust/Dart chain (rust-cli, mcp, a2a, tauri, flutter) is **gated on toolchains** (cargo/flutter) being present in the apply environment.

## Parked
- `phase-v2-examples-and-docs-coverage` — resume after v3.
