# v3-agentic-a2ui-example Specification

## Purpose

Define and certify a keyless React/Vite example that composes the official A2A
task lifecycle with official A2UI surfaces, application-owned action authority,
and one normalized entity graph without broadening package or publication claims.

## Requirements

### Requirement: Safe end-to-end agentic A2UI example

The agentic A2UI examples SHALL emit A2UI 1.0 envelopes, use the official A2UI A2A extension with `@a2a-js/sdk` 1.3.0 where they use A2A, and keep every action behind the application-owned policy.

#### Scenario: Agentic A2UI example is release evidence

- **WHEN** an example is built, served and driven in Chromium
- **THEN** every A2UI envelope its producer emits has version `"1.0"`
- **AND** its main surface renders and completes one policy-authorized action
