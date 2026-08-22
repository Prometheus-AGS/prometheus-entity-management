@release @v3-docs-foundation-brand
Feature: Prometheus-branded Docusaurus foundation
  As a documentation reader or maintainer of the 3.0 release
  I need executable evidence that the private docs workspace builds with the
  Prometheus brand, accessible themes, search, and strict link checking
  So that the documentation product ships from a certified foundation

  Background:
    Given the docs-foundation certification inputs are available

  Scenario: The site builds every required route
    When the docs-foundation certification executes
    Then the static build succeeds with broken links failing the build
    And the 404, sitemap, search index, and social card routes exist
    And the product, packages, and examples sections build

  Scenario: Brand assets are provenance-documented and accessible
    When the docs-foundation certification executes
    Then the ember mark, favicon, and social card exist with documented provenance
    And light and dark themes and logo alt text are configured

  Scenario: Site dependencies stay isolated from publishable packages
    When the docs-foundation certification executes
    Then no publishable package depends on site-only Docusaurus dependencies
    And the site remains a private workspace package on one Docusaurus version
