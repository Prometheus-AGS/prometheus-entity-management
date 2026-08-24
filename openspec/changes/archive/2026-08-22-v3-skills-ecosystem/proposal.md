# Proposal: v3-skills-ecosystem — Complete 3.0 skills ecosystem

**Phase:** full-3.0-release  
**Execution round:** 6  
**Depends on:** v3-sync-persistence-path; v3-a2ui-protocol-bridge; v3-a2a-conformance-agent; v3-dart-graph-riverpod; v3-tauri-mobile-plugin; v3-flint-portable-contracts; v3-vite-react19-example; v3-nextjs-app-router-example  
**Recommended agent:** Claude Code  
**Model class:** frontier

## Why

This change is required by the evidence-backed 3.0 release plan. The authoritative scope, constraints, trade-offs, and acceptance criteria are in the `v3-skills-ecosystem` section of `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

## What changes

- Implement the complete vertical slice defined by the matching plan section.
- Add deterministic verification for every acceptance criterion in that section.
- Preserve the repository's normalized graph, ID-only list, layered I/O, pnpm-only, and skills-to-code synchronization rules.
- Do not introduce an unassessed replacement library without updating the decision record.
- Record any newly discovered capability gap instead of silently expanding scope.

## Success criteria

All acceptance criteria under `v3-skills-ecosystem` in the phase plan pass with evidence from clean or packed-artifact consumers as applicable.

