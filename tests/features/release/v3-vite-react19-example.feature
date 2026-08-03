@release @v3-vite-react19-example
Feature: React 19 and Vite 8 release-candidate showcase
  As a React application team evaluating the 3.0 release candidate
  I need executable browser evidence for the complete stable graph surface
  So that a source-workspace demo is not mistaken for a certified package release

  Background:
    Given the React 19 and Vite 8 showcase certification inputs are available

  Scenario: The entity-query source contract is regression tested
    When the React showcase certification executes
    Then local, remote, and hybrid query sources pass focused unit tests
    And an initial remote result populates the canonical base list

  Scenario: Every declared browser scenario executes against a production build
    When the React showcase certification executes
    Then every declared React showcase scenario has browser evidence
    And normalized identity, optimistic mutation, relationship, view, transport, realtime, persistence, convergence, lifecycle, and DevTools flows pass
    And the production browser surface has no serious or critical accessibility violations

  Scenario: The evidence preserves the prerelease boundary
    When the React showcase certification executes
    Then the React production build and typecheck pass
    And source-workspace browser evidence is not counted as packed-package evidence
    And screenshots, trace metadata, and exact tool versions are recorded
