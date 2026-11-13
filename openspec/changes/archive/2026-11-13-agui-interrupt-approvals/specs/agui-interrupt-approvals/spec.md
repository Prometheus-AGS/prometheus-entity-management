## ADDED Requirements

### Requirement: Interrupts resume through the entity action policy

An AG-UI run that finishes with an interrupt outcome SHALL present an approval with approve, deny and edit-before-approve, and SHALL resume with `resume[]` carrying the decision. Every decision SHALL be made and audited by the entity action policy.

#### Scenario: Edit before approve

- **WHEN** a run interrupts for approval and the user edits the arguments and approves
- **THEN** the run resumes with the edited arguments and the policy audit records the decision

#### Scenario: Disallowed entity

- **WHEN** the interrupted action targets an entity the policy does not allow
- **THEN** approval is refused and the entity is unchanged
