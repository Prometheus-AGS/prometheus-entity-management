## ADDED Requirements

### Requirement: Design records precede governed-action and graph-bound UI work

Before any implementation of attested agent approvals (W5) or graph-bound generated UI (W6), the repository SHALL contain a design record for each: the W5 record SHALL include a threat model for approvals carried in `action.metadata.extensions`, and the W6 record SHALL state an explicit conflict policy between A2UI data-model updates and graph entities, with spike measurements.

#### Scenario: Records exist before implementation

- **WHEN** a later phase proposes implementing W5 or W6
- **THEN** the corresponding design record exists in this change's design.md with its threat model or conflict policy
