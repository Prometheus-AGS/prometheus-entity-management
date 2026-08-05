@release @v3-example-coverage-contract
Feature: Machine-verifiable shared example coverage
  As a 3.0 release reviewer
  I need every stable capability to use one deterministic semantic contract
  So that polished showcase applications cannot hide missing behavior or unsupported release claims

  Background:
    Given the shared example coverage verifier is available

  Scenario: The shared domain and transports are deterministic and normalized
    When the shared example contract is verified
    Then all thirteen semantic scenarios pass
    And the domain contains Project, User, Task, Comment, and Activity exactly once
    And all eight transport fixtures are deterministic and keyless
    And every shared list contains known entity IDs only

  Scenario: Stable capabilities have complete bidirectional mappings
    When the shared example contract is verified
    Then all sixteen stable capabilities have runnable semantic evidence
    And all sixteen stable release artifacts are mapped
    And every scenario and capability mapping links in both directions
    And all five showcase applications reference shared scenarios
    And the coverage ledger registers the implemented shared contract gate

  Scenario: Stale mappings and evidence drift fail closed
    Given adversarial example coverage mutations
    When the mutated contracts are validated
    Then stale scenario mappings are rejected
    And missing stable artifact mappings are rejected
    And wrong evidence commands and missing paths are rejected
    And nondeterministic or cross-tenant fixtures are rejected

  Scenario: Coverage claims remain honest while showcase work is pending
    When the shared example contract is verified
    Then the overall example coverage remains in progress
    And all five showcase evidence boundaries are implemented
    And this headless contract does not claim release certification or visual evidence
    And a complete state is accepted only after all release and showcase evidence is implemented
    And release documentation and skills teach the shared contract evidence boundary
