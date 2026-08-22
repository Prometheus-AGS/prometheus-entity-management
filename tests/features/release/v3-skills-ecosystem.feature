@release @v3-skills-ecosystem
Feature: Complete 3.0 skills ecosystem
  As an agent or application team consuming the 3.0 skills pack
  I need executable evidence that package ledgers, public snippets, referenced
  paths, and binding/integration claims are validated against the real packages
  So that skill guidance can never drift from the shipped API surface

  Background:
    Given the skills-ecosystem certification inputs are available

  Scenario: Package export ledgers validate across the ecosystem
    When the skills-ecosystem certification executes
    Then all twelve npm package ledgers plus the Dart ledger validate
    And the bundle index covers every public package and the Rust tooling

  Scenario: Every public snippet compiles against packed packages
    When the skills-ecosystem certification executes
    Then the snippet lane compiles all public TypeScript snippets in a packed consumer

  Scenario: Claims, paths, and data-flow language hold
    When the skills-ecosystem certification executes
    Then every binding or integration claim maps to existing evidence and a real gate
    And every referenced path in the skills pack exists
    And no skill doc prescribes hooks calling fetch or APIs directly
