# v3-release-contract verification

## Verdict

**OpenSpec change:** archived on 2026-08-01 after final strict verification.  
**Prometheus Entity Management 3.0 release:** blocked; it is neither release-candidate certified nor stable-promotion eligible.

The change succeeds by defining and enforcing the contract that exposes the remaining blockers. It does not claim that downstream implementation, examples, documentation, publication, or manual-authority gates are already complete.

The machine-readable gate record is [`gate-results.json`](gate-results.json). It preserves commands, results, owning downstream changes, environment bounds, archive location, and the distinction between change disposition and release disposition.

The delta is archived at `openspec/changes/archive/2026-08-01-v3-release-contract`, and its normative spec is promoted to `openspec/specs/v3-release-contract/spec.md`.

## Reproducible passing evidence

| Area | Evidence |
| --- | --- |
| Clean dependency state | Fresh source snapshot with dependency/build caches excluded; `pnpm install --frozen-lockfile` installed all 15 workspace projects |
| Contract | Validator passed with 16 artifacts; 8 unit tests passed |
| BDD | 5 scenarios and 32 steps passed |
| JavaScript tests | 362 tests passed; one Flint live test skipped and one benchmark todo remain disclosed |
| npm package inventory | All 12 public npm workspaces completed `pnpm pack --dry-run` |
| Skills | 197 built runtime exports match the ledger |
| Flutter | Analyze passed; 54 tests passed |
| Rust | CLI 24, MCP 26, and Tauri 6 tests passed |
| Native targets | Tauri plugin cross-compiles for `aarch64-apple-ios` and `aarch64-linux-android` |
| Specification | Strict OpenSpec validation passed |
| Secrets | Targeted credential/private-key pattern scan found no matches |

## Release-blocking evidence

Stable release gates are intentionally red:

- Vite and Next.js reference undeclared `@prometheus-ags/entity-sync-pglite`, so workspace typecheck and production build fail.
- The production pnpm audit reports 69 vulnerabilities, including one critical and 25 high.
- Root lint exits successfully while executing zero tasks.
- The Flutter package requires formatting and major Riverpod/Freezed dependency work.
- CLI and Tauri require Rust formatting; Tauri also fails Clippy.
- RustSec finds a CLI vulnerability, two high Tauri vulnerabilities, and denied unsound/unmaintained warnings across all three locks.
- A dry-run package inventory is not packed ESM/CommonJS/TypeScript consumer evidence.
- The five showcase applications, Docusaurus product, GitHub Pages workflow, RC pipeline, immutable-SHA certification, and stable publication remain later changes.

No waiver converts any of these findings to green.

## Platform and manual limits

- The source snapshot is not an immutable git SHA because the phase work is not committed. It cannot certify an RC.
- Local Node evidence is 24.16.0 only. The declared Node 22 and 26+ boundaries require CI lanes.
- Local platform evidence is macOS arm64. Linux and Windows runners were not exercised.
- iOS and Android evidence is Rust cross-compilation only. No simulator/device UI flow, application bundle, signing, notarization, entitlement, or store evidence exists yet.
- The installed Flutter SDK is a beta build; stable-channel Flutter compatibility still needs CI.
- Browser E2E and visual evidence are not applicable to this non-visual contract change, but remain mandatory for all five examples and the Docusaurus site.
- npm `latest`, GitHub Pages production, native first-publish, and platform signing/store authorities were not exercised.
- pub.dev, crates.io, and application-store publication remain deferred by the contract and must not be described as available.

## Archive impact

The archive establishes the active `v3-release-contract` spec as the authoritative artifact, compatibility, protocol-maturity, registry, promotion, and recovery contract. It unblocks implementation of the remaining 27 changes while preventing their incomplete output from being mistaken for a stable release.

Archive does **not** authorize npm publication, move `latest`, deploy GitHub Pages, publish native registries, sign applications, or mark the release certified.

Post-archive targeted validation of `spec/v3-release-contract` passes. Repository-wide `openspec validate --all --strict` also reports six pre-existing failures in historical v3/v4 changes; those are unrelated to this promoted spec and remain downstream cleanup evidence.
