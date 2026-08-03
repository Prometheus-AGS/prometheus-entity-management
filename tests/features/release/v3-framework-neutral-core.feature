@release @v3-framework-neutral-core
Feature: Framework-neutral core package
  As a consumer using any supported UI framework or no UI framework
  I need the entity graph core to be independent of React
  So that every binding can share the same normalized graph without hidden runtime coupling

  Background:
    Given the framework-neutral core verifier is available

  Scenario: The packed core has no React runtime or type dependency
    When the packed framework-neutral core is verified
    Then its runtime dependency graph contains no React packages
    And its ESM and CommonJS artifacts contain no React imports
    And its TypeScript declarations contain no React types

  Scenario: Non-React consumers can create and share graph instances
    When the packed framework-neutral core is verified
    Then ESM and CommonJS consumers share the default graph singleton
    And independent graph factories do not leak entities
    And TypeScript consumes the core without React type packages

  Scenario: React remains a compatible binding over the vanilla singleton
    When the React graph-store compatibility tests run
    Then React hooks observe writes through the core singleton
    And the React compatibility hook preserves imperative store methods
    And the React sync-status hook observes the vanilla status store

  Scenario: The implemented boundary is documented without overstating release readiness
    Then the coverage ledger maps the framework-neutral core gate to packed evidence
    And release documentation distinguishes the core store from React hooks
    And skill references teach the 3.0 core and React import boundary
    And migration guidance documents the deprecated alias and request isolation
    And the framework-neutral gate remains distinct from binding and release certification
