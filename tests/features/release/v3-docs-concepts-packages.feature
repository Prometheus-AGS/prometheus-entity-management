@release @v3-docs-concepts-packages
Feature: Concept and framework guides
  As a developer adopting the 3.0 packages
  I need executable evidence that every stable capability has a concept guide,
  a compiling code path, and an install story that resolves from the registry
  So that the published docs can never teach patterns the packages reject

  Background:
    Given the concepts-packages certification inputs are available

  Scenario: Guide snippets compile against the packed packages
    When the concepts-packages certification executes
    Then every public ts snippet in the guides compiles in a packed consumer project
    And all twelve npm packages are packed for the consumer

  Scenario: Every guide is reachable and every capability mapped
    When the concepts-packages certification executes
    Then all twenty-seven guide pages build under the Pages base path
    And every guide page is reachable from the guides sidebar
    And the capability map covers every guide page with existing routes

  Scenario: Guides teach the architecture honestly
    When the concepts-packages certification executes
    Then no guide prescribes hooks or components calling APIs directly
    And install instructions use pnpm from the registry only
