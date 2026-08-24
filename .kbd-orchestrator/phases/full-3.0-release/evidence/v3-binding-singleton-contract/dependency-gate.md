# Task 1 — Dependency and entry gate

Date: 2026-08-01  
Change: `v3-binding-singleton-contract`

## Verdict

**PASS.** Both declared prerequisites are complete, archived, promoted, and strictly valid. The change may proceed. The phase projection records 4/28 completed changes and identifies `v3-binding-singleton-contract` as active.

## Prerequisite audit

| Dependency | Completion evidence | Promoted contract | Verdict |
| --- | --- | --- | --- |
| `v3-framework-neutral-core` | `openspec/changes/archive/2026-08-01-v3-framework-neutral-core`; 6/6 archived tasks; final clean-room and packed-core evidence | `openspec/specs/v3-framework-neutral-core/spec.md` passes strict validation | Pass |
| `v3-package-module-contracts` | `openspec/changes/archive/2026-08-01-v3-package-module-contracts`; 6/6 archived tasks; twelve-package tarball evidence | `openspec/specs/v3-package-module-contracts/spec.md` passes strict validation | Pass |

The prerequisite verification records explicitly keep the full 3.0 release blocked. This task authorizes the singleton-policy work only; it does not authorize an RC, registry mutation, or stable publication.

## Current manifest baseline

The six stable framework bindings do not yet express one consistent singleton relationship:

| Binding | Core dependency | Core peer | Entry finding |
| --- | --- | --- | --- |
| React | `workspace:*` | absent | Direct dependency can install a binding-owned core copy |
| Svelte | `workspace:*` | `workspace:*` | Redundant dependency plus peer relationship |
| Solid | `workspace:*` | absent | Direct dependency can install a binding-owned core copy |
| Web Components | `workspace:*` | `workspace:*` | Redundant dependency plus peer relationship |
| Alpine | `workspace:*` | absent | Direct dependency can install a binding-owned core copy |
| HTMX | `workspace:*` | absent | Direct dependency can install a binding-owned core copy |

Workspace development currently masks the installed-package topology because `workspace:*` links every binding to the monorepo core. The acceptance criterion therefore requires tarball-only consumers and package-manager resolution inspection, not merely green workspace tests.

## Required proof for the remaining tasks

Task 2 and its verification must establish all of the following without weakening the release plan:

1. React, Svelte, Solid, Web Components, Alpine, and HTMX declare a compatible core peer and a development-only workspace core dependency.
2. The fixed/linked 3.x package policy is encoded consistently with the release contract and packed manifests contain publishable semver rather than `workspace:` protocols.
3. Isolated pnpm consumers install one compatible core instance for every binding.
4. Each binding observes writes through the same default core singleton and demonstrates cross-view or cross-subscriber reactivity appropriate to that binding.
5. Intentionally incompatible core versions fail with actionable peer diagnostics rather than silently creating split graphs.

## Architectural and scope boundaries

- The core remains framework-neutral; bindings must consume its vanilla `graphStore` rather than recreate graph state.
- Canonical entities remain stored once and lists remain ID-only.
- Framework UI surfaces may observe and orchestrate graph operations but do not acquire external I/O ownership.
- pnpm is the only package manager used for workspace and isolated-consumer installation.
- This headless manifest and consumer-contract change has no rendered UI; screenshots are not applicable evidence. Visual proof remains mandatory for later showcase and Docusaurus changes.
- Dart/Flutter, Cargo/Tauri runtime, Flint portability, RC automation, and publication remain independently owned downstream changes.

## Feynman model

A peer dependency is a request for the application to supply the shared engine; a normal dependency lets each binding bring its own engine. If two bindings bring different core installations, both can render correctly while reading different graphs—the exact data-silo failure this library exists to prevent. The proof must therefore inspect the installed graph and mutate through one package while observing through another, not just compare version strings.

