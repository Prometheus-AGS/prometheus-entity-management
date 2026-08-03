@release @v3-package-module-contracts
Feature: Packed npm module and declaration contracts
  As a release operator
  I need to certify the artifacts users actually install
  So that workspace aliases and old registry packages cannot hide broken exports

  Background:
    Given the v3 package-contract repository is available

  Scenario: Every public npm candidate is an independently valid tarball
    When the twelve public npm candidates are packed and verified
    Then exactly 12 candidate tarballs are reported
    And every candidate passes strict Publint and Are The Types Wrong
    And every candidate has loader-specific runtime and declaration files

  Scenario: One coherent candidate set serves every supported module consumer
    When the twelve public npm candidates are packed and verified
    Then internal package dependencies are forced to the candidate tarballs
    And the packed candidates pass Node ESM and CommonJS loading
    And the packed candidates pass TypeScript NodeNext, Node16, and Bundler resolution

  Scenario: Published payloads are documented and intentionally bounded
    When the twelve public npm candidates are packed and verified
    Then every candidate includes its README and changelog
    And no candidate includes workspace protocols, developer paths, or unintended source trees
    And the Tauri candidate excludes host-owned configuration and includes its required build script
    And the core and SDL package READMEs teach their public entry points

  Scenario: The build contract prevents format drift
    Then all twelve package builds use the shared tsup package contract
    And the shared build emits mjs for ESM and cjs for CommonJS
    And the web-components CommonJS declarations preserve import-mode Lit types

  Scenario: The implemented gate is traceable without overstating release readiness
    Then the coverage ledger maps the packed-package quality gate to its evidence
    And release and skill documentation link the package contract
    And the package contract keeps stable publication and visual certification blocked
