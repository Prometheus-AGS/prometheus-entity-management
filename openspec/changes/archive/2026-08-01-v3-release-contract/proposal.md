# Proposal: v3-release-contract — Authoritative 3.0 artifact and compatibility contract

**Phase:** full-3.0-release  
**Execution round:** 1  
**Depends on:** NONE  
**Recommended agent:** Roo Code (Architect mode)  
**Model class:** frontier

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-release-contract` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Do not introduce an unassessed replacement library without updating the decision record.
- Record any newly discovered capability gap instead of silently expanding scope.

## Success criteria

All acceptance criteria under `v3-release-contract` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

