# Proposal: a2ui-release-status-reconcile

Phase `phase-v4-a2ui-runtime-hardening` · issue #74 · delivery-only · first change (fixes the version baseline the others cite).

## Summary

Release status, changelogs and the A2UI bridge document disagree with the registry and with `package.json` after 4.2.0 was published manually. This change reconciles them and records provenance. It does not create or push a tag.

## Facts (verified 2026-10-28)

- Registry `latest` is 4.2.0 for at least six `@prometheus-ags` packages; `release/npm-registry-status.json` still says `candidate-prepared-unpublished` at 4.1.1 for all 13 entries, with `candidateSourceSha` and `certifiedPackageSourceSha` both `c5a3a101` (the 4.1.1 commit).
- The published `@prometheus-ags/a2ui-react@4.2.0` tarball exports `createPrometheusA2uiComponent`; its `gitHead` is null. `34a21156` is the last commit touching published packages, so it is the inferred source.
- Root `CHANGELOG.md:8` reads `[4.2.0] - unreleased`; `packages/a2ui-react/CHANGELOG.md` has no entries after 4.0.0.
- `release/a2ui-protocol-bridge.md:59-60` lists `web_core` 0.10.5 and `@a2ui/react` 0.10.2; `package.json` pins 0.12.0.

## Out of scope

Creating or pushing `v4.2.0` (needs operator approval), republishing, and any package version bump.

## Acceptance

Scenario AUI-13 (delivery-only), run at the phase's final boundary by `a2ui-hardening-acceptance#7`.
