# Proposal: v3-flutter-source-provenance — Licensed, provenance-preserving Flutter source import

**Phase:** full-3.0-release  
**Execution round:** 3  
**Depends on:** v3-release-contract  
**Recommended agent:** Manual  
**Model class:** frontier

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-flutter-source-provenance` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Reuse/adapt analyzed candidates: `cand-007`, `cand-009`, `cand-013`, `cand-014`.
- Close capability gap(s): `build-flutter-source-migration`.

## Success criteria

All acceptance criteria under `v3-flutter-source-provenance` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

