@release @v4-a2ui-runtime-hardening
Feature: A2UI runtime hardening against a real AG-UI 1.0 stream
  As an application team running agent-generated UI over AG-UI
  I need a held surface and the user's typed input to survive redelivery, reordering and restarts
  So that a producer can replay or reconnect without rolling the interface back

  Background:
    Given the A2UI hardening acceptance inputs are available

  Scenario: Redelivery and ordering never roll back a held surface
    When the A2UI hardening browser flows execute against the lab producer
    Then AUI-1 duplicate create activity is a no-op and a conflicting digest is reported
    And AUI-2 duplicate and out-of-order versioned updates change nothing
    And AUI-3 a messages snapshot replay keeps the surface and typed input
    And AUI-4 a newer restatement applies as updates with producer-wins conflicts reported
    And AUI-5 one activity delivered under two message ids is applied once

  Scenario: Versioned deltas, gaps and resync
    When the A2UI hardening browser flows execute against the lab producer
    Then AUI-6 ordered deltas apply and gaps and refused batches are reported
    And AUI-7 the held versions are reported so only the missing operations return
    And AUI-14 stale-action rejection operations are applied

  Scenario: Actions carry globally unique ids and complete envelopes
    When the A2UI hardening browser flows execute against the lab producer
    Then AUI-8 action ids are distinct across contexts and reloads and a retry reuses one
    And AUI-9 the envelope the producer received is complete for v0.9.1 and v1.0

  Scenario: Refusals stay atomic and bounded
    When the A2UI hardening browser flows execute against the lab producer
    Then AUI-15 a failing action response does not undo the batch that carried it
    And AUI-16 an oversize delta is rejected before it is buffered and a redelivered waiting delta is held once
    And AUI-17 component payload growth past the cap is rejected
    And AUI-18 data keys the official model cannot read do not wedge later updates
    And AUI-19 a delete and create of one surface in one activity restores its data

  Scenario: Headless runtime and export
    When the A2UI hardening headless run executes
    Then AUI-10 export reaches a fixed point
    And AUI-11 the headless and React runtimes agree on one corpus
    And AUI-12 unreachable components are pruned from the export

  Scenario: Release records match the registry
    When the A2UI hardening headless run executes
    Then AUI-13 the release records match the npm registry and the tag is not exercised
