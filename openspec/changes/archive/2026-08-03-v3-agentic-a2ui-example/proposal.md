# Proposal: v3-agentic-a2ui-example — Safe end-to-end agentic A2UI example

**Phase:** full-3.0-release  
**Execution round:** 5  
**Depends on:** v3-example-coverage-contract; v3-a2ui-protocol-bridge; v3-a2a-conformance-agent  
**Recommended agent:** Antigravity  
**Model class:** frontier

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-agentic-a2ui-example` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Reuse/adapt analyzed candidates: `cand-003`, `cand-019`.
- Record any newly discovered capability gap instead of silently expanding scope.

## Success criteria

All acceptance criteria under `v3-agentic-a2ui-example` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

