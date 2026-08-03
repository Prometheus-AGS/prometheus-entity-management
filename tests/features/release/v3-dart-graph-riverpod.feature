@release @v3-dart-graph-riverpod
Feature: Stable Dart graph and generated Riverpod 3 integration
  As a 3.0 release reviewer
  I need permanent behavioral and visual proof for the Flutter library layer
  So that a version bump cannot disguise duplicated state, unbounded retries, or incomplete optimistic rollback

  Background:
    Given the Dart graph Riverpod verification suite has run

  Scenario: Stable tooling produces public generated providers
    Then the Dart and Flutter constraints form one coherent stable matrix
    And all generated provider families are present through the public package

  Scenario: Lists and details join against one normalized graph
    Then remote membership stores entity ids and both views reflect one graph update
    And local mode avoids transport while hybrid mode revalidates remote membership

  Scenario: Optimistic lifecycle is global and exactly reversible
    Then optimistic updates are visible globally and confirmation clears the patch
    And failed updates, deletes, and creates restore their exact prior graph state

  Scenario: Failure and realtime behavior terminate truthfully
    Then terminal failures make one attempt and transient failures make at most three
    And realtime updates and deletes mutate and invalidate the canonical graph

  Scenario: Native integration remains optional
    Then the pluggable FFI adapter delegates every transport operation
    And the Flutter package requires no native FFI runtime

  Scenario: Rendered proof stays within its certified boundary
    Then initial and optimistic cross-view goldens have inspected immutable receipts
    And the visual receipt disclaims full app, device, and accessibility certification

  Scenario: Public declarations and agent guidance cannot drift from source
    Then the Dart barrel and generated provider part match the public declaration ledger
    And coverage implements only the certified Dart platform and widget harness boundary
    And package, release, and skill guides describe the same layering and exclusions

  Scenario: Archive evidence stays complete without promoting the wider release
    Then the final Dart archive manifest proves every library acceptance criterion
    And the final Dart archive manifest assigns every unresolved lane downstream
    And the final Dart archive manifest keeps registry publication unauthorized
