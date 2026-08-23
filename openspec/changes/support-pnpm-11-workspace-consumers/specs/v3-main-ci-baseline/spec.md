## ADDED Requirements

### Requirement: Supported consumer workspaces may use pnpm 11
The repository SHALL allow package commands when embedded in a consumer
workspace using pnpm 11 while retaining pnpm 10.33.0 as its pinned default.

#### Scenario: UAR invokes package checks with its pinned package manager
- **WHEN** Universal Agent Runtime invokes the entity-management packages with pnpm 11.15.0
- **THEN** the package-manager engine contract accepts the command
- **AND** the `devEngines.packageManager` range accepts pnpm 11.15.0 and rejects versions outside pnpm 10.33 through 11
- **AND** the entity-management repository continues to pin pnpm 10.33.0 as its own default
- **AND** a clean Corepack cache accepts the pinned pnpm 10.33.0 integrity digest
