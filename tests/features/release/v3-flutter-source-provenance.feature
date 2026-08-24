@release @system @smoke @v3-flutter-source-provenance
Feature: Licensed and history-preserving Flutter source migration
  As a 3.0 release reviewer
  I need reusable Flutter source to retain authority, history, and one canonical owner
  So that a directory copy cannot be mistaken for a licensable, auditable migration

  Background:
    Given Flutter source-import authority is recorded before copying

  Scenario: Committed KnowMe history is imported through an allowlist
    When the Flutter source provenance verifier executes
    Then the imported ref is rooted in a disposable filtered clone of the recorded KnowMe revision
    And authors, dates, messages, path evolution, and the old-to-new commit map are retained
    And dirty files, applications, product models, secrets, generated output, locks, and direct FFI are excluded

  Scenario: One canonical Dart graph remains after adaptation
    When the Flutter source provenance verifier executes
    Then approved generic paths map to explicit adapt, reference, or reject decisions
    And entity_graph_flutter remains the only canonical Dart graph package
    And the filtered import is non-buildable provenance rather than a second public package

  Scenario: Licensing and attribution survive outside this conversation
    When the Flutter source provenance verifier executes
    Then the root, canonical Dart package, and imported source carry the declared MIT license
    And the provenance manifest records source revisions, filtered commits, attribution, and publication limits
    And pub.dev publication remains unauthorized

  Scenario: The migration lineage has deterministic visual evidence
    When the Flutter source provenance verifier executes
    Then a deterministic lineage diagram shows source, filter, provenance import, and canonical adaptation boundaries
    And the visual artifact hash is bound to the machine-readable provenance receipt
    And the headless diagram does not claim Flutter rendering or accessibility certification

  Scenario: The architecture repository is not misreported as runtime source
    When the Flutter source provenance verifier executes
    Then hybrid-mobile-architecture-src is recorded as MIT reference-only
    And no runtime library is fabricated from its templates, scripts, or documentation
