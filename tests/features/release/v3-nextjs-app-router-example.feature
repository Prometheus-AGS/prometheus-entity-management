@release @v3-nextjs-app-router-example
Feature: Next.js App Router SSR and hydration showcase
  As a React application team evaluating the 3.0 release candidate on Next.js
  I need executable evidence that concurrent SSR requests isolate graph state
  So that server-prefetched entities hydrate the client without mismatch or duplicate fetches

  Background:
    Given the Next.js App Router showcase certification inputs are available

  Scenario: Concurrent SSR requests isolate per-request graph state
    When the Next.js showcase certification executes
    Then concurrent tenant payloads stay disjoint and reference-independent
    And per-request graphs hydrate and dehydrate as serializable round trips
    And the server path never writes the process-global graph store
    And hydrated list slots satisfy the fresh-inside-staleTime predicate

  Scenario: Every declared browser scenario executes against a production build
    When the Next.js showcase certification executes
    Then every declared Next.js showcase scenario has browser evidence
    And SSR prefetch HTML, normalized identity, optimistic mutation, relationship, view, realtime takeover, and lifecycle flows pass
    And hydration produces no mismatch errors and no duplicate fetches of hydrated lists
    And the Next.js production browser surface has no serious or critical accessibility violations

  Scenario: The evidence preserves the prerelease boundary
    When the Next.js showcase certification executes
    Then the Next.js production build and typechecks pass
    And Next.js source-workspace browser evidence is not counted as packed-package evidence
    And Next.js screenshots, trace metadata, and exact tool versions are recorded
