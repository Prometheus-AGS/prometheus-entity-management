## Purpose

Defines how React view projections remain synchronized with normalized entity
content when list membership and entity identity stay unchanged.

## ADDED Requirements

### Requirement: Existing entity changes update every active view projection
The React entity-management package SHALL update the rendered items returned by
an active view projection when the corresponding normalized entity changes,
even when the projection's ordered entity ID list is unchanged.

#### Scenario: Existing row fields change without list membership changing
- **WHEN** a view contains an entity ID and the normalized entity for that ID is updated
- **THEN** the view returns the updated entity fields while retaining the same entity ID list

### Requirement: Established and replacement view hooks share reactivity
Both the established React view hook and its documented replacement SHALL obey
the same existing-entity projection behavior.

#### Scenario: Both public view paths observe an existing entity update
- **WHEN** an existing normalized entity is updated through the graph store
- **THEN** consumers of either public view path observe the updated fields without a list reload
