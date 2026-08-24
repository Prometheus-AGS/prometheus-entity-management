@release @v3-docs-api-reference
Feature: Multi-language API and package reference
  As a consumer of the 3.0 packages
  I need executable evidence that every declared npm/Dart/Rust artifact has a
  generated, policy-checked API reference under deterministic routes
  So that the published reference can never drift from the shipped surface

  Background:
    Given the api-reference certification inputs are available

  Scenario: The generator enforces the doc-coverage policy
    When the api-reference certification executes
    Then the TypeDoc models cover every ledger-listed stable export
    And vanished exports and new undocumented exports fail the generator
    And the undocumented baseline can only shrink

  Scenario: All artifacts build into deterministic routes
    When the api-reference certification executes
    Then all twelve npm package API pages build under the Pages base path
    And the Dart and Rust entry pages and static artifacts exist
    And the package index lists every declared artifact exactly once

  Scenario: Package chooser pages carry decision metadata
    When the api-reference certification executes
    Then every package page has install commands, peer/runtime matrices, and stability badges
    And symbol pages carry source links and conceptual cross-links
