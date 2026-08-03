@release @system @smoke @v3-flutter-source-provenance @provenance-tamper
Feature: Flutter provenance evidence fails closed when tampered
  As a 3.0 release reviewer
  I need provenance checks to reject plausible-looking but false receipts
  So that a green verifier cannot be produced by weakening the evidence

  Background:
    Given a valid portable Flutter provenance contract fixture

  Scenario: Generated or unapproved source cannot enter filtered history
    When a generated Dart file appears in the filtered history fixture
    Then portable provenance validation fails with "FORBIDDEN_FILTERED_PATH"
    And it also reports the allowlist mismatch

  Scenario: Retained history requires a complete metadata mapping
    When one retained commit loses its captured original metadata
    Then portable provenance validation fails with "METADATA_MAPPING_MISMATCH"
    And the valid filtered commit count cannot conceal the missing metadata

  Scenario: A second canonical Dart graph is rejected
    When another Dart graph artifact is declared canonical
    Then portable provenance validation fails with "CANONICAL_DART_ARTIFACT_COUNT"
    And entity_graph_flutter remains the expected canonical owner

  Scenario: Publication authority cannot be smuggled into provenance
    When the provenance fixture authorizes pub.dev publication
    Then portable provenance validation fails with "PUBLICATION_AUTHORIZED"
    And deferred registry authority remains mandatory

  Scenario Outline: Content-addressed evidence cannot be substituted
    When the recorded <kind> hash differs from its observed hash
    Then portable provenance validation fails with "<code>"

    Examples:
      | kind    | code                 |
      | license | LICENSE_HASH_MISMATCH |
      | visual  | VISUAL_HASH_MISMATCH  |
