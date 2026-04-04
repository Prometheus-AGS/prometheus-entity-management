# Examples Workspace

This workspace contains all runnable demo applications for `@prometheus-ags/prometheus-entity-management`.

## Shared Demo Infrastructure

The examples share one Supabase project for demo purposes:

- `examples/supabase`

That shared backend is intentional. The Vite app, the Next.js app, and future demos such as PGlite or ElectricSQL examples should all point at the same example Supabase project so they demonstrate the same auth, database, storage, and realtime behavior across different frontend stacks.

## Why It Lives Here

Keeping the Supabase project under `examples/` makes the ownership clear:

- it belongs to the example suite, not the core library
- it is shared infrastructure, not app-local configuration
- it can evolve with the examples without implying that library consumers need the same setup

If the example suite grows substantially, this can be promoted to a more explicit shared-infra path later, but the current intent is one shared example backend for all demos.
