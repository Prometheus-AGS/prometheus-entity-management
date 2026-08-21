@release @v3-flint-portable-contracts
Feature: Portable Flint security and data contracts
  As an application team evaluating the 3.0 release against the Flint fabric
  I need executable evidence that the Flint watch/mutate contract, seam
  security, and auth/provisioning claims are portable and honestly labeled
  So that default CI has no machine-specific paths or silent Flint success

  Background:
    Given the Flint portable-contracts certification inputs are available

  Scenario: The watch/mutate contract round-trips through a checked fixture
    When the Flint portable-contracts certification executes
    Then the fixture lane round-trips a mutation into the graph
    And the live lane is env-gated and fails closed when unavailable
    And the default lane contains no machine-specific absolute paths

  Scenario: Seam security and key separation hold
    When the Flint portable-contracts certification executes
    Then subscription and mutation identity carry tenant and channel
    And checkpoint keys are separated per channel and consumer
    And malformed and wrong-kind envelopes fail closed

  Scenario: Auth claims, provisioning docs, and secret hygiene are pinned
    When the Flint portable-contracts certification executes
    Then the claims fixture pins issuer, tenant, kid, JWKS, role, and key separation
    And the integration doc covers Forge provisioning, RLS, audit, restart, and the strict-JWK caveat
    And client examples expose no service-role credentials
