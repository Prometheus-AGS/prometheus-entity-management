@release @v3-a2ui-protocol-bridge
Feature: Official A2UI rendering and graph action policy bridge
  As a 3.0 release reviewer
  I need official protocol, authorization, package, and rendered evidence
  So that an AG-UI chat client or polished screenshot cannot masquerade as A2UI conformance

  Background:
    Given the exact official A2UI v0.9.1 runtime dependencies are installed

  Scenario: Official messages create and update an official React surface
    When the A2UI protocol bridge receipts are executed
    Then the official v0.9.1 processor creates a catalog-backed surface
    And official component and data-model updates render through A2uiSurface
    And unsupported protocol versions and unknown components fail closed

  Scenario: Entity actions cross an explicit application policy boundary
    When the A2UI protocol bridge receipts are executed
    Then an allowlisted tenant action updates the canonical graph
    And unknown actions, tenants, entity types, and fields are denied
    And destructive actions require out-of-band approval
    And renderer components never access the graph store directly

  Scenario: AG-UI compatibility remains honest and separately addressable
    When the A2UI protocol bridge receipts are executed
    Then the package root contains official A2UI exports without legacy chat exports
    And the AG-UI compatibility subpath preserves the alpha chat surface
    And the packed ESM, CommonJS, NodeNext, and Node16 consumers pass without workspace aliases

  Scenario: The shipped catalogs and protocol runtime retain official ownership
    When the A2UI protocol bridge receipts are executed
    Then the bridge imports explicit official v0_9 entry points
    And the bridge does not implement JSONL parsing or an alternate surface model
    And the default catalog excludes side-effecting openUrl

  Scenario: Browser evidence proves the interactive renderer rather than decorating the report
    When the A2UI browser evidence is inspected
    Then desktop and mobile screenshots have nonzero dimensions and immutable hashes
    And keyboard activation records allowed, field-denied, and approval-denied outcomes
    And the automated accessibility scan has zero critical or serious violations
    And the manual WCAG checklist records names, focus, contrast, targets, motion, and status semantics
    And the evidence identifies the built artifact, browser, route, and protocol version

  Scenario: Release documentation and agent ledgers describe the shipped boundary
    When the declared A2UI documentation surface is inspected
    Then coverage records implemented official protocol and graph-policy evidence
    And the A2UI root and AG-UI compatibility export ledgers match built artifacts
    And the package and release guides teach protocol validation separately from application authority
    And alpha chat consumers have an explicit AG-UI subpath migration
