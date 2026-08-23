@ci @v3-main-ci-baseline
Feature: Deterministic and hermetic main CI baseline
  As a release operator
  I need the monorepo CI baseline to fail clearly and reproducibly
  So that a green build is evidence for the checked-in workspace rather than a sibling checkout or hidden dependency state

  Background:
    Given the v3 CI baseline repository is available

  Scenario: One root lockfile owns every JavaScript workspace
    Then the root pnpm lockfile is the only workspace lockfile
    And no workspace dependency resolves through an external sibling link
    And the Next.js and Vite examples resolve only repository-owned source and packages
    And frozen installation is the CI installation contract

  Scenario: Compatible direct dependencies are current or explicitly held
    Then the selected React, Next.js, Vite, TypeScript, and pnpm versions satisfy the v3 release contract
    And every direct dependency reported behind registry latest has an explicit compatibility rationale
    And vulnerable Next.js transitive pins resolve to the checked-in patched overrides

  Scenario: pnpm 11 consumer workspaces are admitted
    Then pnpm 11.15.0 satisfies the package-manager compatibility contract

  Scenario: CI exercises supported Node lines and identifies the responsible task
    Then CI runs validation, lint, typecheck, build, test, skills, and security gates
    And CI exercises Node 22, 24, and 26
    And every CI gate has a finite timeout
    And a timed out gate reports its gate name, command, and timeout
    And an unknown gate fails with the supported gate names

  Scenario: Production advisories fail closed without hiding lower severities
    Then an undispositioned high production advisory fails policy evaluation
    And an expired or incomplete advisory acceptance fails policy evaluation
    And a lower severity advisory remains visible without blocking the baseline
    And the checked-in production dependency graph has no undispositioned critical or high advisory

  Scenario: Upgraded examples retain production-build contracts
    Then Next.js pins its Turbopack root to the monorepo
    And the examples do not require the shadcn CLI at runtime
    And the Vite config is compatible with the native config loader
    And both example manifests expose deterministic build and typecheck scripts
