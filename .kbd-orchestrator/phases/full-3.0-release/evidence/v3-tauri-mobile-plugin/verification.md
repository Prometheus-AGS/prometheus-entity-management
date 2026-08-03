# Verification — `v3-tauri-mobile-plugin`

Date: 2026-08-02  
Verdict: **PASS — CHANGE CERTIFIED AND READY TO ARCHIVE; PUBLICATION NOT AUTHORIZED**

## OpenSpec verification scorecard

| Dimension | Status |
| --- | --- |
| Completeness | 6/6 tasks; 1/1 requirement |
| Correctness | 1/1 archive scenario covered; all plan acceptance criteria evidenced |
| Coherence | Design adaptation and repository architecture followed |

No CRITICAL, WARNING, or SUGGESTION issue remains from OpenSpec verification.

## Acceptance-to-evidence matrix

| Requirement | Direct evidence | Result |
| --- | --- | --- |
| Rust-derived bindings | generator drift check and generated helpers | Pass |
| Minimal npm/Rust boundary | 41-file packed candidate; generated build state rejected | Pass |
| Least-privilege permissions | read-only default, explicit mutation grants, denial receipts | Pass |
| Desktop command/denial | registered MockRuntime host | Pass |
| Android native command/denial | physical Samsung Android 16 receipts | Pass |
| iOS native command/denial | iPhone 17 iOS 26.5 simulator receipts | Pass |
| Runnable host uses generated binding | branded fixture calls `commands.graphPlatformPing()` | Pass |
| Tests and packed consumer | clean verifier, 16 package tests, 10 release tests | Pass |
| BDD behavior | 5 scenarios / 18 steps / 5 hooks | Pass |
| Public ledgers, coverage, skills, docs | fail-closed verifiers and implemented plugin gate | Pass |
| Visual and artifact integrity | four inspected screenshots plus recomputed manifest hashes | Pass |
| Refiner and adversarial gates | 6/6 constraints; cross-model PASS | Pass |

## Mobile proof

Android ran on physical device `R5GYB4AZD7A` (`SM-S936U`, Android 16,
API 36). iOS ran on simulator `7F63354E-3475-4158-BB5E-F75D5E7ECFBA`
(`iPhone 17`, iOS 26.5). Both returned the exact plugin/platform JSON when
authorized and the exact `graph_platform_ping not allowed` authorization error
when the capability was removed.

The authoritative manifest is
`.kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-mobile-plugin/device/device-evidence.json`.
The verifier recomputes every declared artifact hash and rejects missing,
changed, or path-escaping evidence.

## Additional defects found and fixed during certification

- Pinned stable Rust to avoid the observed nightly Tokio compiler ICE.
- Pinned Tauri CLI 2.11.4 and a pnpm-based fixture runner.
- Corrected the Swift product/target to the Cargo package name required by the
  iOS linker.
- Preserved the success iOS bundle before building the denial profile.
- Excluded generated Gradle/Tauri mobile build caches from the npm payload.
- Corrected stale SQLite and “raw maps” documentation claims.

## Boundary

This change is ready for OpenSpec verification/archive. It does not certify the
universal showcase, the other pending phase changes, the immutable full-release
bundle, registry ownership/credentials, npm publication, GitHub Release, or
promotion to `latest`.
