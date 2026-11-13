## MODIFIED Requirements

### Requirement: Stability and protocol maturity are explicit

The contract SHALL distinguish stable, experimental, and internal surfaces. The official A2UI protocol baseline SHALL be 1.0, with v0.9 and v0.9.1 input still supported. AG-UI event transport SHALL be distinct from official A2UI rendering and graph projection, and AG-UI peer ranges SHALL be `^1.0.0`. Flutter `genui` SHALL remain experimental and SHALL NOT own the canonical Dart graph.

#### Scenario: Experimental integration cannot inherit stable status

- **WHEN** a stable package exposes an experimental integration
- **THEN** documentation, generated ledgers, and examples display the integration's experimental status
- **AND** its failure cannot corrupt or replace the stable normalized graph
