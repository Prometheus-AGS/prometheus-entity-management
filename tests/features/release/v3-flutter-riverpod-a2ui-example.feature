@release @v3-flutter-riverpod-a2ui-example
Feature: Flutter Riverpod A2UI showcase
  As an application team evaluating the 3.0 release on Flutter
  I need executable evidence that the Dart graph, generated Riverpod providers,
  and the official genui A2UI engine work behind a fail-closed action policy
  So that agent-generated surfaces can never bypass the declared action catalog

  Background:
    Given the Flutter showcase certification inputs are available

  Scenario: The genui surface crosses the policy boundary
    When the Flutter showcase certification executes
    Then the deterministic surface replays through the official genui engine
    And task.update is approved, task.delete is denied, and malformed payloads are rejected
    And the destructive task.replace action is gated behind human approval
    And a foreign-tenant action is refused before any graph access

  Scenario: The Dart graph drives every view with optimistic CRUD
    When the Flutter showcase certification executes
    Then fatal-infos analysis and the full Flutter test suite pass
    And optimistic confirm and injected-failure rollback are proven in widget tests
    And the coalesced realtime burst reaches every joined view once

  Scenario: Platform boundaries hold and evidence stays honest
    When the Flutter showcase certification executes
    Then Android and iOS compile smoke lanes pass
    And the persistence adapter allows only loadGraph and saveGraph
    And offline convergence merges two clients with zero conflicts
    And the evidence records source-workspace scope and device-runtime limits
