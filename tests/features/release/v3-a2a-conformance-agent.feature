@release @v3-a2a-conformance-agent
Feature: A2A v1 conformance and deterministic reference agent
  As a 3.0 release reviewer
  I need official protocol, policy, package, and upstream-suite evidence
  So that an alpha-shaped task server cannot be mistaken for an A2A v1 implementation

  Background:
    Given the exact official A2A SDK and TCK revisions are pinned

  Scenario: Official discovery and task methods form one truthful JSON-RPC binding
    When the A2A conformance receipts are executed
    Then AgentCard discovery advertises only implemented A2A v1 capabilities
    And SendMessage, GetTask, ListTasks, history, and terminal guards pass
    And malformed, unsupported, and media-type failures use official JSON-RPC errors

  Scenario: Streaming lifecycle supports ordered updates, subscription, and cancellation
    When the A2A conformance receipts are executed
    Then ordered task, working, artifact, and terminal SSE envelopes pass
    And a working task can be canceled and observed by subscribers
    And the pinned official JSON-RPC TCK has zero applicable MUST failures

  Scenario: Application authority is checked before graph state changes
    When the A2A conformance receipts are executed
    Then default-denied graph requests leave the canonical graph unchanged
    And a forbidden batch field rolls back every mutation
    And destructive replacement requires out-of-band approval
    And authentication and caller scoping hide unauthorized task state

  Scenario: Deterministic A2UI output and legacy compatibility stay separate
    When the A2A conformance receipts are executed
    Then deterministic CI emits repeatable A2UI v0.9.1 metadata without a model credential
    And the opt-in external executor uses injected discovery and transport with local lifecycle IDs
    And official enum values drive the deterministic lifecycle
    And pre-v3 slash methods are available only from the explicit legacy subpath

  Scenario: Packed consumers and the immutable upstream suite certify the shipped artifact
    When the A2A conformance receipts are executed
    Then packed ESM, CommonJS, NodeNext, and Node16 consumers pass without workspace aliases
    And the packed manifest pins the official SDK and contains the legacy subpath
    And the TCK receipt identifies its immutable commit, binding, reports, and explained exclusions

  Scenario: Headless transport evidence does not claim renderer certification
    When the A2A conformance receipts are executed
    Then this change records protocol and artifact metadata checks without decorative screenshots
    And rendered A2UI browser evidence remains owned by the agentic example change

  Scenario: Release docs and agent ledgers describe the shipped boundary
    When the declared A2A documentation surface is inspected
    Then coverage records implemented JSON-RPC and graph-policy evidence
    And A2A root and legacy export ledgers match built artifacts
    And package, release, and skill guides separate protocol validity from authority
    And alpha consumers have an explicit legacy subpath migration
    And excluded bindings and capabilities remain explicit
