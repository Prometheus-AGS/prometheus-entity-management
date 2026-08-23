@v3-stable-publication
Feature: v3 stable publication boundary
  The v3-stable-publication change adds the stable channel to the release
  pipeline: the one flow allowed to move npm latest. It is separated from RC
  staging by a dedicated authority boundary (the npm-stable environment and an
  explicit stage-stable flag), a pre-publication verifier that proves the
  workspace is publishable without touching the registry, and a post-publish
  live verifier that proves latest actually moved to 3.0.0.

  Scenario: Pre-publication verification passes against the certified workspace
    Given the v3 stable-publication inputs are available
    When the stable pre-publication verification executes
    Then the verification report passes all nine pre-publish checks

  Scenario: The stable authority boundary accepts only the npm-stable environment
    Given a synthetic stable-channel manifest and npm-stable authority environment
    Then the stable authority assertion authorizes npm stable publish on latest

  Scenario: RC authority can never satisfy the stable boundary
    Given a synthetic stable-channel manifest and npm-stable authority environment
    When the environment downgrades to the RC environment and authority
    Then the stable authority assertion rejects it
    And the RC authority assertion refuses the stable-channel manifest

  Scenario: A stable stage must prove latest moved to the target version
    Given a synthetic stable-channel manifest and npm-stable authority environment
    When a synthetic stable stage completes with latest promoted
    Then the stage report completes with latestUnchanged false
    And a synthetic stage whose tags stay put fails the promotion assertion
