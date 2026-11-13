## ADDED Requirements

### Requirement: Official A2UI libraries at 0.15.0

`@prometheus-ags/a2ui-react` SHALL build on `@a2ui/web_core` and `@a2ui/react` pinned exactly at 0.15.0, and existing v0.9 and v0.9.1 surfaces SHALL render as before the upgrade.

#### Scenario: v0.9.1 surface after the upgrade

- **WHEN** a valid v0.9.1 surface is applied to the runtime built on 0.15.0
- **THEN** it renders through the official processor with the allow-listed catalog

### Requirement: Published declarations type-check strictly

Packed consumers of `@prometheus-ags/a2ui-react` SHALL type-check with `skipLibCheck: false` under NodeNext and Node16 resolution, even when they install the unpatched registry `@a2ui/*` packages.

#### Scenario: Strict packed consumer

- **WHEN** a consumer installs the packed tarball and type-checks with `skipLibCheck: false`
- **THEN** no TS2835 or other declaration error is reported

### Requirement: The zod advisory stays closed

The bundled A2UI runtime in `@prometheus-ags/a2ui-react` SHALL resolve its zod imports to the package's zod 4 through `zod/v3`, so GHSA-mrhx-c7xc-m3w5 is not reintroduced by the upgrade.

#### Scenario: Bundled runtime zod resolution

- **WHEN** the built package is inspected
- **THEN** no bundled A2UI module imports a zod 3 runtime
