# Task 4 — A2A ledgers and documentation synchronization

## Declared surface

- `examples/coverage.json` records `release.protocol.a2a-jsonrpc-v1` as an
  implemented, headless quality gate and maps A2A policy evidence into the
  protocol and security capabilities.
- `prometheus-entity-skills/_shared/references/a2a-library-exports.json` records
  the official package root separately from the explicit `./legacy` subpath.
- The root, release, example, package, changelog, and agent-skill guides teach
  the official JSON-RPC lifecycle, default-deny application authority, pinned
  upstream TCK scope, and the alpha-to-legacy migration.

## Non-overclaim boundary

Protocol validity never grants application authority. This task does not
certify the rendered agentic showcase, REST or gRPC bindings, push
notifications, extension signing, Flutter rendering, documentation deployment,
registry authority, or stable publication. No decorative screenshot or visual
evidence was created for this headless synchronization task; the later
`v3-agentic-a2ui-example` change owns rendered browser evidence.

## Verification receipts

- BDD red: `task-4-bdd-red.md`
- A2A package build: pass; official ESM/CommonJS and declaration entry points built.
- Root export-ledger gate: pass; React 201, sync 16, A2UI 18 + 9, and
  A2A 30 + 2 runtime exports match their committed ledgers.
- Coverage ledger: pass; 13/13 semantic scenarios, 16 capabilities, 16 stable
  artifacts, overall `in-progress`, and `releaseCertified: false`. Machine
  report: `task-4-example-coverage-report.json`.
- A2A release tests: 7 passed, 0 failed.
- ESLint for the changed ledger scripts and A2A test surfaces: pass.
- Complete A2A BDD: 7 scenarios and 37 steps passed, including isolated packed
  ESM/CommonJS/NodeNext/Node16 consumers and the pinned upstream JSON-RPC TCK.
