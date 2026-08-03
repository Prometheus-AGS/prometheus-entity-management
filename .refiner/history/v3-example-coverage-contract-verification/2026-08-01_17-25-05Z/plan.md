# Plan

```yaml
stages:
  - id: inventory
    description: Map every phase-plan requirement to the scenario contract, coverage ledger, tests, and evidence package.
    requires_execution: true
    tool: shell validation
  - id: challenge
    description: Run adversarial validator and BDD checks and inspect release-state, visual, native, and publication boundaries.
    requires_execution: true
    tool: pnpm
  - id: refine
    description: Correct any unsupported or indirect evidence claim and write the canonical archive QA report.
    requires_execution: false
  - id: validate
    description: Validate JSON, file references, focused gates, and strict OpenSpec state.
    requires_execution: true
    tool: shell validation
  - id: manifest
    description: Persist the Markdown QA artifact, manifest, reflection, decision, and state.
    requires_execution: true
    tool: filesystem
tool_invocations:
  - stage_id: inventory
    tool: shell validation
    purpose: Parse contracts and prove exact entity, transport, scenario, capability, artifact, showcase, and evidence counts.
  - stage_id: challenge
    tool: pnpm
    purpose: Run mutation tests and focused BDD without publishing or contacting live services.
  - stage_id: validate
    tool: shell validation
    purpose: Check non-empty evidence paths, JSON integrity, Git whitespace, and strict OpenSpec validity.
state_updates:
  files_to_create:
    - dist/archive-qa-report.md
    - artifact_manifest.json
    - refinement_log.md
    - decisions.md
  files_to_update:
    - constraints.json
    - state.json
  directories_required:
    - dist
validation_plan:
  - constraint_id: acceptance-traceability
    validation_method: Exact semantic inventory plus acceptance-to-evidence matrix.
    execution_required: true
  - constraint_id: evidence-integrity
    validation_method: JSON parse, non-empty file walk, strict OpenSpec, and task scan.
    execution_required: true
  - constraint_id: fail-closed-validator
    validation_method: Focused unit mutation suite and Cucumber scenarios.
    execution_required: true
  - constraint_id: release-boundary
    validation_method: Coverage state and downstream ownership assertions.
    execution_required: true
  - constraint_id: visual-honesty
    validation_method: Manual semantic review; no browser preview applies to this headless contract.
    execution_required: false
  - constraint_id: architecture-preservation
    validation_method: Scenario invariant validation and architecture-document comparison.
    execution_required: true
template_reviewed: .codex/skills/artifact-refiner/assets/templates/content-report.template.html
template_use: The HTML derivative is intentionally omitted because KBD archive evidence is canonical Markdown and this task changes no rendered documentation surface.
```
