# Release impact: v3-release-certification

## What changed for the release surface

- **New root commands** (workspace-private, not published):
  - `pnpm run release:check` — runs all 35 mandatory certification lanes and
    writes per-lane receipts.
  - `pnpm run release:check -- --lanes a,b` / `node scripts/release-check.mjs
    --lanes a,b` — chunked execution for long suites.
  - `pnpm run release:check:seal` — fail-closed seal producing
    `bundle/manifest.json` (SHA-256-hashed, single-source-SHA).
- **New gates:** `test:v3-release-certification` (6 unit tests),
  `bdd:release-certification` (3 scenarios).
- **Security policy:** 10 time-bounded advisory acceptances
  (`security/advisory-policy.json`, expire 2026-11-21, owner Travis James) for
  build-time-only Docusaurus/Next-example toolchain advisories. **No published
  package runtime dependency is affected.** These acceptances are reviewable
  and reversible by the operator.
- **Convergence fixes** in verifiers/tests/steps/features whose assertions
  predated the completed example, skills, and docs changes (see
  verification.md "Defects"). No runtime code changed; no public API ledger
  changed; `examples/coverage.json` structure unchanged (status stays
  `in-progress` because two capability entries remain `partial`/`planned` as
  recorded platform limits).

## Impact on published artifacts

None. No package version, export, ledger, or published file changed. The
change is certification machinery plus test/verifier convergence.

## Certification verdict

`bundle/manifest.json`: **complete** — 35/35 mandatory lanes pass against
annotated tag `v3.0.0-rc.1` (`55dc8dc7a156453c0d44a18f74aa4cfbd2fa15df`).

## Explicit limits carried forward (labeled in the manifest)

1. `tauri-physical-device` (platform) — iOS/Android hardware certification
   runs outside this environment.
2. `github-pages-live-deploy` (manual) — first live deployment happens after
   publication approval.
3. `npm-trusted-publisher` (manual) — trusted-publisher and GitHub
   environment reviewer configuration belong to v3-stable-publication.
4. Tag is annotated but not GPG-signed (no signing key configured); the
   bundle's integrity mechanism is SHA-256.

## Handoff to v3-stable-publication

Release disposition remains **blocked by design** until the human-gated
`v3-stable-publication` change: registry dry runs only, no publish occurred,
the `v3.0.0-rc.1` tag is local-only, and `release/v3-release-contract.json`
gate-results keep `releaseDisposition: "blocked"`. The sealed bundle is the
evidence input for that final change.
