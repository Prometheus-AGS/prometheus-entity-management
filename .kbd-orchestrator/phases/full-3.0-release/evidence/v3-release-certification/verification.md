# Verification: v3-release-certification

**Date:** 2026-08-23
**Tagged commit:** `v3.0.0-rc.1` → `55dc8dc7a156453c0d44a18f74aa4cfbd2fa15df` (annotated tag; git signing is not configured on this machine, so the bundle is **hashed**, not GPG-signed — see "Signing status" below)
**Machinery:** `scripts/release-check.mjs` + root scripts `release:check`, `release:check:seal`, `test:v3-release-certification`, `bdd:release-certification`
**Bundle:** `evidence/v3-release-certification/bundle/manifest.json` — **verdict: complete** (35/35 mandatory lanes pass, 0 missing, 0 failed, 0 SHA drift, 0 tampered)

## Acceptance matrix

| Plan acceptance criterion | Evidence | Result |
| ------------------------- | -------- | ------ |
| One root release-certification command | `pnpm run release:check` runs every mandatory lane; `--lanes a,b` chunks execution; `release:check:seal` seals the bundle | PASS |
| Immutable evidence manifest | `manifest.json` (schema `prometheus.release-certification/v1`) records source SHA, tag, per-receipt SHA-256, per-log SHA-256 + byte counts, and a fail-closed verdict | PASS |
| Spans frozen install, formatting, typecheck, tests, builds, packed consumers, package lint/type checks, audits, skills/snippets, all five examples, Dart/Flutter, Cargo/Tauri, docs, provenance, registry dry runs | Lane registry covers all 14 categories with 35 mandatory lanes; unit test asserts exact lane names and that every lane command resolves to a real root script | PASS |
| A clean tagged commit produces the complete bundle | All 35 lanes re-ran against `git checkout` of tag `v3.0.0-rc.1` (tree reset clean first); every receipt binds `sourceSha` `55dc8dc…`; seal confirms zero drift | PASS |
| Signed/hashed evidence bundle | Hashed: SHA-256 over every receipt and log. Signed: annotated git tag created; GPG signing unavailable (no `user.signingkey`) — recorded honestly as a limit, not claimed | PASS (hashed) / LIMIT (unsigned) |
| Missing mandatory lane blocks certification | Seal fails closed with exit 1 naming the missing lane; unit tests + BDD prove missing, failed, SHA-mismatched, and tampered bundles all seal `incomplete` | PASS |
| Platform/manual limits explicit, non-blocking | 3 labeled lanes in manifest `limits`: `tauri-physical-device` (platform), `github-pages-live-deploy` (manual), `npm-trusted-publisher` (manual) | PASS |

## Lane results (35 mandatory, all pass, total 1245 s)

install: frozen-install · hygiene: validate · format-lint: lint · typecheck · tests: `ci:test` (turbo unit suites, all release node tests, full 129-scenario BDD run — 599 s) · builds: `ci:build` · audits: `ci:security` · skills: `ci:skills`, skills-snippets, skills-ecosystem · packed consumers: package-contracts, framework-neutral-core, binding-singletons · persistence: sync-persistence · protocol bridges: a2ui-bridge, a2a-conformance · provenance: flutter-source-provenance · dart-flutter: dart-graph-riverpod, example-flutter-riverpod-a2ui · cargo-tauri: tauri-plugin, example-tauri-universal · registry dry runs: release-pipeline · portable contracts: flint-contracts · examples: example-coverage, example-vite-react19, example-nextjs-app-router, example-agentic-a2ui (+ Flutter/Tauri above) · docs: docs-foundation, docs-api-reference, docs-snippets, docs-concepts, docs-examples, docs-operations, docs-pages-quality, docs-pages

Per-lane receipts: `bundle/receipts/<lane>.json`; full logs: `bundle/logs/<lane>.log`.

## Defects the certification sweep found and fixed

Running every gate against one tagged commit surfaced cross-change drift that
per-change certification had not caught (each fixed in its own commit before
the final clean run):

1. **Live advisory DB drift** — 10 new high-severity advisories in
   build-time-only tooling (Docusaurus js-yaml/fast-uri/image-size, Next.js
   example PostCSS nanoid) broke the security audit lane. Dispositioned via
   the designed mechanism: time-bounded acceptances (owner, rationale,
   expiresOn 2026-11-21) in `security/advisory-policy.json`
   (commits `60c6e21`, `78e19a4`).
2. **Stale "planned" assertions** after the Flutter example legitimately
   shipped: `verify-flutter-source-provenance.mjs`,
   `verify-dart-graph-riverpod.mjs`,
   `tests/release/v3-dart-graph-riverpod.test.mjs`,
   `tests/steps/v3-dart-graph-riverpod.steps.ts`,
   `tests/steps/v3-flutter-source-provenance.steps.ts` (+ feature),
   `tests/steps/v3-release-contract.steps.ts` (+ feature),
   `tests/release/v3-release-contract.test.mjs`,
   `tests/release/v3-example-coverage-contract.test.mjs`,
   `tests/steps/v3-example-coverage-contract.steps.ts` (+ feature) — all
   updated to the implemented evidence reality without weakening any
   fail-closed mutation checks.
3. **Stale receipt-promotion assertions** — `v3-sync-persistence-path.test.mjs`
   expected mobile/platform sync receipts to stay `planned`; both were
   legitimately promoted by the Flutter/Tauri example changes. Also updated
   its export-ledger drift check to the generalized
   `skills-package-registry.mjs` indirection from v3-skills-ecosystem.
4. **Ledger output-format drift** — A2A/A2UI BDD steps matched the pre-#22
   "OK: A2A root: …" format; the multi-entry generalization now prints
   "OK: a2a .: …". Regexes updated; counts unchanged (30+2, 18+9).
5. **Generated-artifact scan false positives** — the ci-baseline source scan
   tripped on Flutter `.dart_tool/` and `build/` outputs (and Tauri/Next
   `build/`) containing absolute paths; the step now excludes generated
   directories.
6. **Cargo registry cache eviction** — the operator's global cargo config
   (`auto-clean-frequency = "7 days"`) had GC'd `specta` from the local
   registry cache; `cargo +stable fetch` re-warmed it. Environment note, no
   repo change.

## Gates run for this change

- `node --test tests/release/v3-release-certification.test.mjs` — 6/6 pass
- `pnpm run bdd:release-certification` — 3 scenarios, 11 steps pass
- `node scripts/release-check.mjs --seal --tag v3.0.0-rc.1` — verdict `complete`, exit 0
- Empty-bundle seal — exit 1 naming all 35 mandatory lanes (fail-closed smoke test)

## Signing status

`git tag -a v3.0.0-rc.1` (annotated) was created locally and never pushed. No
`user.signingkey` is configured on this machine, so the tag is unsigned; the
bundle's integrity guarantee is the SHA-256 manifest. If the operator wants a
GPG-signed tag for stable publication, that belongs to
`v3-stable-publication` (human-gated).
