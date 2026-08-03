# React root import required an optional peer

Date: 2026-08-03

## Symptom

An isolated pnpm consumer installed the rehearsed core and React RC tarballs,
React, and React DOM. Importing
`@prometheus-ags/prometheus-entity-management` failed with
`ERR_MODULE_NOT_FOUND` for `@tanstack/react-table`.

## Root cause

The React root entry exports the built-in table components and therefore has an
unconditional runtime import of TanStack Table. The manifest instead declared
TanStack Table as an optional peer. The packed-consumer fixture installed that
optional peer explicitly, hiding the broken clean-consumer behavior.

## Fix

- Move `@tanstack/react-table` 8.21.3 to normal runtime dependencies.
- Remove the explicit TanStack Table install from the packed-consumer fixture.
- Add a contract test that ties unconditional root imports to the manifest.
- Correct the package README, build comment, changelog, and pnpm lockfile.

## Prevention

Packed consumer fixtures must not install optional peers unless the scenario is
specifically testing that integration. A root entry that imports a package
unconditionally must ensure that package is installed automatically.
