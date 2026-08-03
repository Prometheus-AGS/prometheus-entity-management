# Specification

```yaml
artifact_name: v3-framework-neutral-core-archive-qa
artifact_type: content
content_type: direct:content
clarified_intent:
  description: Challenge the completed OpenSpec change evidence before archive and ensure it distinguishes narrow archive readiness from full 3.0 release readiness.
  domain: release verification content
target_state:
  description: A concise, evidence-backed QA report with no unsupported release, platform, singleton, publication, or visual-certification claims.
  success_criteria:
    - Every plan acceptance criterion maps to executable evidence.
    - All OpenSpec tasks are checked.
    - Coverage evidence paths exist and are non-empty.
    - Machine reports parse and the packed verifier passes.
    - Remaining release blockers and non-applicable lanes are explicit.
unknowns: []
requires_code_execution: true
likely_tools:
  - shell validation
```

