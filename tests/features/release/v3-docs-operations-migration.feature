@release @v3-docs-operations-migration
Feature: Operations and migration documentation tracks
  As an operator or upgrader evaluating the 3.0 release
  I need executable evidence that migration guides carry verified before/after
  guidance and the operations docs match the real release automation
  So that upgrading and operating the 3.0 ecosystem is not prose-only

  Background:
    Given the operations-migration certification inputs are available

  Scenario: Migration guides carry verified before/after guidance
    When the operations-migration certification executes
    Then both migration guides have breaking-change tables with before and after guidance
    And every breaking change token appears in its guide
    And the six upgrade validation fixtures compile against the packed packages

  Scenario: Operations docs match the real automation and security model
    When the operations-migration certification executes
    Then the security page covers tenant boundaries and secret handling
    And the release runbook procedures match the publish workflow and root scripts
    And the remaining operations topics are covered

  Scenario: All pages build into deterministic routes
    When the operations-migration certification executes
    Then all thirteen migration and operations pages build under the Pages base path
    And every page is reachable from the operations sidebar
