# Refinement log

## Iteration 1 — 2026-08-29T15:09:52Z

### Actions taken

- Compared README and security claims with the protocol, projection, and
  controller implementation.
- Found that `eventBytesLimit` did not hard-bound a large metadata-only event.
- Added explicit `changesOmitted` semantics and deterministic change-prefix
  truncation to production.
- Expanded and reran the one assembled packed-consumer gate with a 200-change,
  1 KiB event case.
- Parsed the final export ledger and retained acceptance report.

### Constraint status

- `api-truth`: satisfied.
- `security-truth`: satisfied after corrective production delta.
- `evidence-integrity`: satisfied.
- `scope-honesty`: satisfied.

### Reflection summary

- Convergence: terminate.
- Reason: all blocking constraints pass after one material corrective delta.

### Files modified

- `packages/entity-graph-core/README.md`
- `.kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-core-observability/security-boundary.md`
- `packages/entity-graph-core/src/devtools/protocol.ts`
- `packages/entity-graph-core/src/devtools/controller.ts`
- `scripts/verify-devtools-core-observability.mjs`
- `prometheus-entity-skills/_shared/references/core-library-exports.json`

### Content type

- Type: `direct:content`
- Evaluation: `output_inspection` plus deterministic ledger and packed-evidence validation.
