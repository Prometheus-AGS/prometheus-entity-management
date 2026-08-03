@release @v3-release-pipeline-rc
Feature: Recoverable 3.0 release-candidate pipeline
  As a Prometheus release operator
  I need one dependency-ordered, non-mutating certification boundary
  So that a green rehearsal cannot silently publish the workspace root or move npm latest

  Background:
    Given the v3 release-candidate contract and workflow are available

  Scenario: Declared artifacts are selected in dependency order
    When the release-candidate verification executes against packed consumers
    Then exactly sixteen declared artifacts and twelve npm packages are selected
    And the declared artifacts are selected in dependency order

  Scenario: The private workspace root cannot be published
    When the release-candidate verification executes against packed consumers
    Then the private workspace root cannot be published

  Scenario: The workflow preserves release notes and provenance
    When the release-candidate verification executes against packed consumers
    Then the workflow preserves release notes and provenance
    And staging requires OIDC and the protected npm-rc environment
    And the stage runtime verifies authority before registry access
    And no long-lived npm write token or automated human approval is present
    And pnpm forwards release arguments without a literal separator

  Scenario: A rehearsal cannot move latest
    When the release-candidate verification executes against packed consumers
    Then a rehearsal cannot move latest
    And the certification records no registry mutation

  Scenario: Alpha packages cannot enter the RC staging lane
    When candidate version rules are evaluated
    Then alpha prereleases are rejected and numbered rc prereleases are accepted

  Scenario: Staging accepts only complete and authoritative evidence
    When release candidate staging evidence rules are evaluated
    Then incomplete or forged rehearsal reports are rejected
    And staged packages require npm stage identifiers and matching integrity

  Scenario: A partial staging failure is safely retryable
    When the release-candidate verification executes against packed consumers
    Then a partial staging failure is safely retryable
    And exact npm view integrity fields are decoded
    And absent npm versions are decoded from JSON or plain-text errors
    And partial stage errors preserve the recovery journal
    And immutable registry conflicts block the release

  Scenario: The attested candidate bundle is relocatable between workflow jobs
    When a rehearsed candidate bundle is resolved in a different workflow workspace
    Then staging uses a bundle-relative tarball path
    And candidate paths cannot escape the downloaded bundle

  Scenario: Native registries retain explicit dispositions
    When the release-candidate verification executes against packed consumers
    Then native registries retain explicit dispositions

  Scenario: Packed consumers use only the candidate tarballs
    When the release-candidate verification executes against packed consumers
    Then packed consumers use only the candidate tarballs
    And ESM, CommonJS, NodeNext, Node16, and Bundler consumers pass

  Scenario: Visual certification remains truthful
    When the release-candidate verification executes against packed consumers
    Then the release visual certifies the locally proven pipeline
    And npm and GitHub configuration limits remain explicit

  Scenario: Coverage and guidance expose only the implemented boundary
    When the release-candidate verification executes against packed consumers
    Then the coverage ledger declares the recoverable RC gate implemented
    And release guidance preserves registry and stable-promotion limits
    And the Tauri public facade remains strict-consumer compatible

  Scenario: Archive readiness remains independent from stable publication
    When the release-candidate verification executes against packed consumers
    Then final evidence certifies only the release-pipeline change archive ready
    And downstream release certification and publication remain blocked
    And the task six visual keeps release-state dimensions independent
