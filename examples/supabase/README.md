# Shared Supabase Demo Project

This Supabase project is shared by all example applications in this repository.

Current and planned consumers include:

- `examples/vite-app`
- `examples/nextjs-app`
- future local-first demos such as PGlite and ElectricSQL examples

## Intent

The shared project exists so every example can demonstrate the same backend capabilities:

- auth flows
- normalized entity data loading
- realtime updates
- storage-backed assets

Using one demo backend makes it easier to compare framework integrations without duplicating schema and infrastructure per example app.

## Scope

This directory is example infrastructure only. It is not required for the core library itself and should be treated as shared backend setup for the demo workspace.
