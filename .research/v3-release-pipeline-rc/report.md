---
type: research-report
title: Recoverable Prometheus 3.0 release-candidate pipeline
date: 2026-08-02
confidence: 0.94
verification_status: verified
sources_count: 10
feynman_grade: 0.968
contradictions_resolved: 4
okf_version: '0.1'
---

# Recoverable Prometheus 3.0 release-candidate pipeline

## Finding

Changesets should remain the version and changelog planner, but it is not a complete publication transaction manager. The repository needs a generated release manifest, deterministic dependency ordering, registry-state classification, and an append-only recovery journal around the Changesets version state.

The safest release boundary now available from npm is trusted publishing with stage-only permission. However, staged publishing cannot be the only rehearsal because it is workspace-unaware, requires an existing registry package, reserves the selected version, and still becomes public only after an interactive 2FA approval. Therefore the mandatory rehearsal must run without npm registry mutation; real npm staging remains an explicitly authorized optional lane.

## Required design consequences

1. Derive the publish set only from the ratified release contract and actual package manifests. Reject the private root, examples, docs, fixtures, and undeclared artifacts.
2. Generate and validate a release manifest containing artifact name, ecosystem, version, dependency edges, publish eligibility, registry, dist-tag, tarball or crate digest, and recovery state.
3. Topologically sort npm packages and refuse cycles or undeclared internal dependencies.
4. Rehearse npm packages through packed tarballs and an ephemeral registry or equivalent local registry harness. Snapshot `latest` before and after and require equality.
5. Treat an already-published identical package-version as a successful recovery case; treat an integrity mismatch as a hard conflict.
6. Use `rc` prerelease state and tag on a release branch. Never assume Changesets prevents a new package from acquiring `latest` on first publish.
7. Use npm trusted publishing only from an exact GitHub-hosted workflow with current Node/npm prerequisites. Prefer stage-only trusted-publisher permission when registry staging is authorized.
8. Keep Dart and Rust in the root certification manifest. Their publication state must be explicitly `dry-run`, `excluded`, or `publishable`; npm success must never imply those ecosystems succeeded.
9. Require a separate human-authority event before any stable publication or dist-tag promotion.

## Non-claims

- Provenance does not prove functional correctness or intended tarball contents.
- A dry run does not prove npm accepted an upload.
- npm staging is not synonymous with prerelease versioning.
- A Changesets green run is not proof that a partial publish can be safely retried.

## Implementation hypothesis to test

The smallest truthful vertical slice is a pure release-plan module plus CLI that emits a deterministic manifest and journal, a local ephemeral-registry rehearsal, BDD scenarios for root denial, ordering, RC tags, partial retry, and latest immutability, followed by a GitHub workflow that consumes rather than re-derives that manifest.
