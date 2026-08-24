# Plan

```yaml
stages:
  - id: inventory
    description: Map every phase-plan requirement to production code, tests, BDD, package receipts, ledgers, and limits.
    requires_execution: true
    tool: filesystem and JSON validation
  - id: challenge
    description: Execute the focused mandatory suites, sibling boundary guards, actionlint, and clean-room CI.
    requires_execution: true
    tool: pnpm and actionlint
  - id: refine
    description: Correct unsupported or incomplete claims and write the canonical archive QA report.
    requires_execution: false
  - id: validate
    description: Validate evidence paths, JSON, task state, OpenSpec, and whitespace after refinement.
    requires_execution: true
    tool: shell validation
  - id: manifest
    description: Persist the Markdown QA artifact, manifest, reflection, decisions, and named state.
    requires_execution: true
    tool: filesystem
tool_invocations:
  - stage_id: inventory
    tool: filesystem and JSON validation
    purpose: Prove exact acceptance coverage and declared evidence integrity.
  - stage_id: challenge
    tool: pnpm and actionlint
    purpose: Execute storage, convergence, reconnect, BDD, package, workflow, and clean CI checks.
  - stage_id: validate
    tool: shell validation
    purpose: Parse final receipts, stat evidence, verify tasks, run strict OpenSpec, and check whitespace.
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
    validation_method: Phase-plan-to-evidence matrix plus focused executable receipts.
    execution_required: true
  - constraint_id: deterministic-storage-convergence
    validation_method: Real PGlite, Loro loopback, WebSocket channel, and socket termination suites.
    execution_required: true
  - constraint_id: mandatory-no-skip
    validation_method: Release source guards and zero skip/todo output.
    execution_required: true
  - constraint_id: evidence-integrity
    validation_method: JSON parsing, non-empty evidence walk, strict OpenSpec, task scan, and git diff check.
    execution_required: true
  - constraint_id: external-contract-boundary
    validation_method: Workflow static guards, actionlint, and packed sibling contract execution.
    execution_required: true
  - constraint_id: release-boundary
    validation_method: Coverage state and downstream ownership assertions.
    execution_required: true
  - constraint_id: visual-honesty
    validation_method: Manual semantic review; no browser preview applies to this headless artifact.
    execution_required: false
template_reviewed: .codex/skills/artifact-refiner/assets/templates/content-report.template.html
template_use: HTML output is intentionally omitted because the canonical KBD archive artifact is Markdown and this change has no rendered documentation surface.
```
