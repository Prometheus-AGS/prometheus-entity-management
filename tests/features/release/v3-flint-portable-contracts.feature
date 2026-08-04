@release @v3-flint-portable-contracts
Feature: Portable Flint realtime and security contracts
  As a 3.0 release reviewer
  I need deterministic local checks plus immutable external-source verification
  So that a skipped sibling integration or copied security claim cannot certify Flint support

  Background:
    Given the checked Flint portable contract is verified

  Scenario: Default CI is portable and fail closed
    Then the default Flint surface contains no machine-specific paths or silent live skips
    And client examples contain no service-role credential

  Scenario: Realtime and authentication boundaries match current Flint sources
    Then watchEntities and mutateEntity remain the consumed realtime methods
    And production issuer, tenant equality, kid, JWKS, role, and key separation are required

  Scenario: Current strict-JWK compatibility is stated precisely
    Then RSA JWKs contain standard modulus and exponent members
    And the remaining EC strict-consumer caveat names the missing coordinates

  Scenario: Forge provisioning remains an external operational contract
    Then plan apply status and DDL inspection require typed specs and a reviewed hash
    And service-role authorization RLS audit transactions and restart semantics are required
    And no Prometheus Forge provisioning adapter is claimed

  Scenario: External source verification is explicit and immutable
    Then the portable run records external source verification as not requested
    And every external source file has a pinned revision and SHA-256 digest
