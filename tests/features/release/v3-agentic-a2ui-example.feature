@release @v3-agentic-a2ui-example
Feature: Safe end-to-end agentic A2UI showcase
  As an application team evaluating agent-generated UI on the 3.0 release candidate
  I need executable evidence that a deterministic A2A agent renders official A2UI surfaces
  So that agent actions can never bypass the declared graph action catalog

  Background:
    Given the agentic A2UI showcase certification inputs are available

  Scenario: Keyless protocol flows are pinned by golden fixtures
    When the agentic A2UI showcase certification executes
    Then the happy, denied, malformed, and cancelled transcripts match their golden fixtures
    And the agent requires no model credential
    And a foreign-tenant caller is refused before any graph access

  Scenario: Agent-generated surfaces cross the policy boundary in the browser
    When the agentic A2UI showcase certification executes
    Then every declared agentic showcase scenario has browser evidence
    And the task board surface approves update, denies delete, and gates destructive replace behind human approval
    And the browser surface has no serious or critical accessibility violations and no console errors

  Scenario: The evidence preserves the prerelease boundary
    When the agentic A2UI showcase certification executes
    Then the agentic production build and typechecks pass
    And agentic source-workspace browser evidence is not counted as packed-package evidence
    And agentic screenshots, traces, golden fixtures, and exact tool versions are recorded
