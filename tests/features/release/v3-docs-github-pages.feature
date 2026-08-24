@release @v3-docs-github-pages
Feature: Quality-gated GitHub Pages deployment
  As a release operator for the 3.0 documentation site
  I need executable evidence that PRs can never deploy and production publishes
  only after build, snippet, route, accessibility, and budget gates pass
  So that the public 3.0 docs site cannot regress silently

  Background:
    Given the github-pages certification inputs are available

  Scenario: The workflow enforces the publication boundary
    When the github-pages certification executes
    Then pull requests run build and quality gates but cannot deploy
    And only protected main publishes to the github-pages environment
    And checkout configure upload and deploy actions are SHA-pinned

  Scenario: Production quality gates pass on the built site
    When the github-pages certification executes
    Then representative deep routes return non-empty 200 under the base path
    And the search index exists and no secrets or internal absolute paths ship
    And axe finds no serious violations and Lighthouse budgets hold

  Scenario: The deployment URL is recorded for the 3.0 release
    When the github-pages certification executes
    Then the deployment URL record matches the site configuration
    And the release documentation points at the recorded URL
