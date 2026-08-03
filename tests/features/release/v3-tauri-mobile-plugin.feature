@release @v3-tauri-mobile-plugin
Feature: Tauri desktop and mobile plugin contract
  As a release operator
  I need evidence from the installed plugin boundary and real host commands
  So that a successful Rust cross-compile cannot masquerade as a working Tauri plugin

  Background:
    Given the v3 Tauri plugin repository is available

  Scenario: The desktop host executes the registered plugin command
    When the Tauri host contract is verified
    Then the Rust-derived bindings pass drift, type, and runtime checks
    Then the desktop host returns the native platform ping

  Scenario: Capabilities fail closed
    When the Tauri host contract is verified
    Then a webview without the platform-ping capability is denied

  Scenario: The npm tarball is a usable Rust plugin dependency
    When the packed Tauri consumer contract is verified
    Then its Rust host compiles only from the packed candidate
    And the tarball contains the native sources and permission manifests

  Scenario: Mobile smoke evidence proves the real bridges and permission boundary
    Then the Android and iOS device receipts prove the native platform ping invocation
    And the mobile receipts prove capability denial and artifact integrity

  Scenario: Public API and agent guidance fail closed
    Then runtime and declaration exports match the Tauri skill ledger
    And coverage separates implemented host evidence from planned mobile evidence
    And package, release, and skill guides preserve the permission and persistence boundaries
