@release @v3-binding-singleton-contract
Feature: One core singleton across every stable framework binding
  As an application composing multiple supported UI frameworks
  I need every framework binding to resolve the application's entity graph core
  So that entity writes remain globally reactive without private graph copies

  Background:
    Given the binding singleton verifier is available

  Scenario: Every stable binding publishes a required compatible core peer
    When the packed binding singleton contract is verified
    Then all six stable bindings omit core from production dependencies
    And all six stable bindings require a publishable compatible core peer
    And source development uses the workspace core without making the peer optional
    And the fixed release group contains the complete twelve-package npm contract

  Scenario: Compatible packed consumers share one reactive graph
    When the packed binding singleton contract is verified
    Then the application and every stable binding resolve one physical core instance
    And React, Svelte, Solid, Web Components, Alpine, and HTMX observe that graph

  Scenario: An incompatible application core fails closed
    When the packed binding singleton contract is verified
    Then a core 4 consumer is rejected by strict peer resolution
    And the peer failure identifies the core package and expected range

  Scenario: Evidence does not overstate platform or release readiness
    When the packed binding singleton contract is verified
    Then the singleton evidence is explicitly headless
    And browser and device runtime evidence remains required from later examples
    And no registry publication is claimed by the singleton verifier

  Scenario: Public guidance preserves the singleton boundary
    Then the coverage ledger maps the binding singleton gate to packed evidence
    And release documentation explains required core peers and the fixed package group
    And every stable binding README installs an application-owned core
    And non-React binding documentation uses the vanilla graphStore name
    And skill references require singleton verification without claiming full release readiness
