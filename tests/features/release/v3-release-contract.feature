@release @v3-release-contract
Feature: Authoritative Prometheus Entity Management 3.0 release contract
  As a release operator
  I need one machine-readable contract for every versioned artifact
  So that stable publication cannot drift from the supported ecosystem

  Background:
    Given the repository root is available
    And the 3.0 release contract is loaded

  Scenario: The release inventory names every owned artifact exactly once
    Then the contract declares exactly 12 npm packages
    And the contract declares the Dart package "entity_graph_flutter"
    And the contract declares the Rust crates "entity-graph-cli", "entity-graph-mcp", and "entity-graph-tauri"
    And every declared artifact has an owner, registry, version policy, and stability status
    And no release document claims 14 npm packages

  Scenario: Stable and experimental surfaces cannot be confused
    Then every artifact stability status is one of "stable", "experimental", or "internal"
    And A2UI targets protocol version "0.9.1"
    And Flutter genui is marked "experimental"
    And AG-UI transport is distinct from official A2UI rendering

  Scenario: Compatibility and singleton boundaries are explicit
    Then the contract defines supported Node, pnpm, React, Vite, Next.js, Flutter, Dart, Rust, and Tauri ranges
    And the contract requires ESM, CommonJS, and TypeScript packed-consumer evidence for npm packages
    And all framework bindings resolve one compatible entity graph core singleton
    And Next.js server requests use isolated graph instances

  Scenario: Publication is gated and recoverable
    Then the contract defines release candidate and stable distribution tags
    And stable publication requires certification of one immutable git SHA
    And moving the npm "latest" tag requires an explicit approval gate
    And partial publication has a recovery policy that never overwrites an immutable registry version
    And rollback and deprecation policies are present

  Scenario: Release-facing ledgers consume the authoritative contract
    Then the example coverage ledger references the 3.0 release contract
    And the coverage ledger marks React Vite implemented and unfinished showcases planned
    And the skill release reference links to the authoritative contract
    And the project and examples documentation report the 3.0 release status honestly
