@release @system @smoke @v3-flutter-source-provenance @provenance-ledgers
Feature: Flutter provenance is taught without overstating release readiness
  As a 3.0 maintainer or coding agent
  I need coverage, documentation, and skills to agree on the provenance boundary
  So that imported history cannot be mistaken for a public API, runnable package, or publication approval

  Scenario: Coverage records the implemented provenance gate and downstream work
    Given the Flutter source provenance verifier executes for release ledgers
    Then coverage records the Flutter source provenance gate as implemented
    And Dart library and Flutter app evidence are implemented independently

  Scenario: Public API ledgers remain unchanged for a non-runtime import
    Given the Flutter source provenance verifier executes for release ledgers
    Then the provenance change declares no public runtime export impact
    And the non-buildable import is absent from every public API ledger and workspace

  Scenario: Maintainer and skill documentation preserve one canonical owner
    Given the Flutter source provenance verifier executes for release ledgers
    Then release and package documentation identify entity_graph_flutter as the sole canonical Dart package
    And shared skills require the provenance verifier before source-lineage claims
    And documentation denies Flutter rendering, registry publication, and stable-release claims
