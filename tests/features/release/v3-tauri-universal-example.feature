@release @v3-tauri-universal-example
Feature: Tauri universal desktop and mobile showcase
  As an application team evaluating the 3.0 release on Tauri
  I need executable evidence that one React/Vite frontend drives desktop and
  mobile shells through the certified entity-graph plugin
  So that native commands, permissions, offline restart, and deep links hold
  on every platform lane

  Background:
    Given the Tauri universal certification inputs are available

  Scenario: Native commands round-trip and deny fail-closed
    When the Tauri universal certification executes
    Then the Rust command E2E proves entity and list round-trips on desktop
    And a webview without the capability is denied fail-closed
    And the offline restart persist-clear-restore round-trip is proven

  Scenario: The shared frontend passes desktop and mobile viewport lanes
    When the Tauri universal certification executes
    Then typecheck, bridge contract tests, and the production Vite build pass
    And Chromium desktop and mobile viewport scenarios pass with clean axe
    And bridge receipts record every native boundary action

  Scenario: Platform build receipts and evidence honesty hold
    When the Tauri universal certification executes
    Then desktop binary, Android APK, and iOS simulator app receipts exist with sha256 pins
    And the evidence records source-workspace scope and native-runtime limits
