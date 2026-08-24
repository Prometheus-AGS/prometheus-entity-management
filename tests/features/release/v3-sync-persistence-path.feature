@release @v3-sync-persistence-path
Feature: Mandatory durable and convergent local-first path
  As a 3.0 release reviewer
  I need real storage, deterministic peer convergence, and lossless reconnect evidence
  So that optional dependencies or green mocks cannot hide data loss

  Background:
    Given the mandatory PGlite and Loro release dependencies are installed

  Scenario: A graph snapshot survives a real database restart
    When the mandatory local-first integration receipts are executed
    Then a real file-backed PGlite database restores the canonical graph after close and reopen
    And the restored list contains entity IDs rather than copied entity data

  Scenario: Two isolated offline clients converge deterministically
    When the mandatory local-first integration receipts are executed
    Then different-field offline writes survive in both delivery orders
    And same-field conflicts converge using deterministic peer identity
    And inbound peer projections are not echoed as new local writes

  Scenario: Reconnect is lossless and cannot pass by skipping dependencies
    When the mandatory local-first integration receipts are executed
    Then disconnected WebSocket writes are flushed after reconnect
    And reconnect requests the peer snapshots missed during the outage
    And a real WebSocket relay recovers concurrent writes after an unexpected termination
    And no mandatory sync scenario is skipped
    And headless sync evidence does not claim rendered visual certification

  Scenario: The published package candidate exposes the certified path
    When the mandatory local-first integration receipts are executed
    Then a packed ESM and CommonJS consumer resolves the new sync surface
    And the packed ESM consumer performs cross-client convergence
    And the packed NodeNext consumer accepts the new public types

  Scenario: Release ledgers promote sync without overclaiming showcases
    When the mandatory local-first integration receipts are executed
    Then the offline sync capability references implemented integration and packed evidence
    And the sync runtime export ledger matches its published package surface
    And skills and release documentation teach the certified boundary
    And overall example and visual coverage remains in progress

  Scenario: The sibling gateway remains explicit opt-in contract evidence
    When the mandatory local-first integration receipts are executed
    Then the sibling gateway contract is manual-only and never part of the mandatory local gate
    And the sibling contract installs a packed current core without a local link
