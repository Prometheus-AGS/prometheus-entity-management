@v3-release-certification
Feature: v3 release certification evidence bundle
  The v3-release-certification change adds one root release-check command whose
  lane registry spans every certification surface from the plan and whose seal
  step produces a fail-closed, SHA-256-hashed evidence bundle bound to a single
  tagged source commit.

  Scenario: The lane registry covers every plan certification category
    Given the release-check lane registry
    Then the registry covers frozen install, formatting, typecheck, tests, builds, packed consumers, audits, skills and snippets, all five examples, Dart and Flutter, Cargo and Tauri, docs, provenance, and registry dry runs
    And every mandatory lane resolves to a real root script
    And platform and manual limits are explicitly labeled and non-blocking

  Scenario: The seal step fails closed on any missing mandatory lane
    Given a synthetic evidence bundle with one mandatory lane absent
    When the seal step evaluates the bundle
    Then the manifest verdict is incomplete and names the missing lane

  Scenario: A complete bundle seals with hashes bound to one source SHA
    Given a synthetic evidence bundle with every mandatory lane passing on one source SHA
    When the seal step evaluates the bundle
    Then the manifest verdict is complete
    And every receipt and log carries a SHA-256 hash and the same 40-hex source SHA
