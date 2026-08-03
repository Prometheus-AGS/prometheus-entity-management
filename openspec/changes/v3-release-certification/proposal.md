# Proposal: v3-release-certification — Cross-ecosystem release certification

**Phase:** full-3.0-release  
**Execution round:** 9  
**Depends on:** v3-release-pipeline-rc; v3-sync-persistence-path; v3-a2a-conformance-agent; v3-dart-graph-riverpod; v3-tauri-mobile-plugin; all five examples; v3-skills-ecosystem; v3-docs-github-pages  
**Recommended agent:** Claude Code  
**Model class:** frontier

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-release-certification` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Do not introduce an unassessed replacement library without updating the decision record.
- Close capability gap(s): `build-release-certification`.

## Success criteria

All acceptance criteria under `v3-release-certification` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

