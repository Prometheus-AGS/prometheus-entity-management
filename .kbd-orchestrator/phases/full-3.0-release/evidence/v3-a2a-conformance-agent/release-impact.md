# Release impact — `v3-a2a-conformance-agent`

Date: 2026-08-01

## What this change makes release-ready

- `@prometheus-ags/entity-graph-a2a` now implements the official A2A 1.0
  JSON-RPC discovery and task lifecycle instead of the alpha's bespoke protocol
  under misleading v1 labels.
- AgentCard, task/message/part/artifact/status vocabulary and dispatcher
  behavior come from exact `@a2a-js/sdk@1.0.1`; Prometheus owns the narrow graph
  executor, Fetch adapter, application policy, and deterministic fixtures.
- Streaming is real SSE with submitted, working, artifact, terminal,
  subscription, and cancellation evidence.
- Protocol validity never grants application authority. Authentication,
  caller-scoped task visibility, entity/action/field allowlists, atomic batch
  preauthorization, and out-of-band destructive approval execute before graph
  changes.
- Deterministic CI emits repeatable A2UI v0.9.1 structured artifacts without a
  model credential. The Prometheus extension is correctly labeled as owned by
  this project rather than misreported as the legacy upstream v0.8 extension.
- The optional external executor discovers and streams a JSON-RPC agent through
  one injected fetch boundary, propagates explicit service parameters, remaps
  remote IDs locally, and rejects plaintext non-loopback endpoints.
- Pre-v3 slash methods survive only under the explicit `./legacy` migration
  subpath and do not contaminate the stable root.
- Packed artifacts pass both module systems and strict declarations, and the
  official pinned TCK has zero failed applicable MUST or unexplained
  selected-binding skips.

## Compatibility and dependency effect

- This is an intentionally breaking correction for alpha consumers. Discovery
  moves to `/.well-known/agent-card.json`; methods move to official PascalCase
  operations; bespoke wire types are replaced by official SDK types; retained
  slash calls require `@prometheus-ags/entity-graph-a2a/legacy`.
- The runtime pins `@a2a-js/sdk@1.0.1`. Its transitive `jose` and `uuid`
  dependencies are a deliberate cost of using the maintained official wire and
  transport implementation instead of forking the standard.
- The package remains one of the existing twelve npm release artifacts. No
  extra protocol package, alternate A2UI renderer, hosted agent, or native
  artifact was added.
- CommonJS declarations retain import-mode resolution annotations so strict
  Node16 consumers can consume the SDK's ESM-tagged types without
  `skipLibCheck`.

## Downstream impact

This archive satisfies the A2A package dependency for:

- `v3-agentic-a2ui-example`;
- `v3-skills-ecosystem`;
- later documentation examples and API reference work; and
- release certification that consumes the package-level protocol receipt.

Those changes retain their other dependencies and acceptance criteria. In
particular, the rendered agentic application still needs happy, denied,
malformed, cancellation, action-policy, browser, accessibility, and visual
evidence against packed packages.

## What remains incomplete for full 3.0

The five complete showcase applications, Flutter/Riverpod packages, Tauri
desktop/mobile behavior, Flint portable contracts, full skills ecosystem, the
complete Prometheus-branded Docusaurus site, protected GitHub Pages deployment,
RC/provenance/recovery automation, immutable-commit certification, registry
authority, stable publication, and npm `latest` promotion remain open.

The coverage ledger therefore remains `in-progress` with
`releaseCertified: false`. This archive certifies one headless package boundary,
not the full release.

## Publication authority

Publication remains unauthorized. No registry, release, deployment, or
dist-tag mutation occurred.

