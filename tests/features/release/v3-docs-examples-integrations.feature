@release @v3-docs-examples-integrations
Feature: Example and integration documentation tracks
  As a developer evaluating the 3.0 release
  I need executable evidence that each certified example has a start-to-finish
  tutorial and each integration guide separates demo mode from live credentials
  So that the published examples docs match what the packages actually prove

  Background:
    Given the examples-integrations certification inputs are available

  Scenario: Tutorials carry the full content contract
    When the examples-integrations certification executes
    Then all five tutorials have architecture, setup, scenarios, test commands, platform notes, and troubleshooting
    And tutorial scenario tables reference valid coverage scenario IDs
    And tutorial gates exist as root scripts and link runnable source

  Scenario: Integration guides are honest about credentials
    When the examples-integrations certification executes
    Then all six integration guides separate deterministic demo mode from live credentials
    And integration snippets compile against the packed packages

  Scenario: All pages build into deterministic routes
    When the examples-integrations certification executes
    Then all eleven example and integration pages build under the Pages base path
    And every page is reachable from the examples sidebar
