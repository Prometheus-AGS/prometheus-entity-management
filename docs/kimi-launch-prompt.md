# Kimi Code launch prompt — pushing the `full-3.0-release` phase forward

Copy the block below the line into a fresh Kimi Code session
(`kimi --auto` from this directory) to take over the
`full-3.0-release` phase. The kimi instance will read the waypoint,
read the relevant spec, and start applying changes one at a time.

---

You are continuing the **prometheus-entity-management** project's
`full-3.0-release` KBD phase in this directory. The repo is on the
`main` branch (HEAD detached at the latest main commit), working tree
clean, kbd-orchestrator active phase = `full-3.0-release`,
derived revision = 28, with 2 of 28 changes already DONE and 26
PENDING.

## Context

- **What this project is:** A monorepo (pnpm + Turborepo) of
  `@prometheus-ags/*` packages. The core is a framework-neutral,
  normalized, globally-reactive entity graph store (TypeScript + Rust).
  It has React, Svelte, Solid, Web Components, Alpine, HTMX, and A2UI
  bindings, a Tauri plugin, and a Flutter/Riverpod binding
  (`packages/entity_graph_flutter@3.0.0`).
- **What's already shipped (the "DONE" set):** the React 3.0
  showcase is certified at 3.0.0-rc.1 on npm `next`. Framework-neutral
  core, binding-singleton contract, package-module contracts, example
  coverage, PGlite/Loro sync path, **and the Dart graph + Riverpod
  binding** are all archived. The 7 promoted specs validate.
- **What remains (the "PENDING" set, 26 changes):** the Flutter app
  and devices, Tauri mobile platform work, the remaining 4 showcase
  apps, Flint portability, the remaining skills, Docusaurus site,
  GitHub Pages deployment, RC/recovery automation, immutable-SHA
  certification, pub.dev/crates.io registry authority, stable 3.0
  publication, GitHub Release, and npm `latest` promotion. See
  `openspec/changes/` for the full list and `release/v3-release-contract.json`
  for the contract.
- **Your job:** push the `full-3.0-release` phase forward, one change
  at a time, following the KBD-aware `/kbd-apply` loop. **Do not
  close the phase.** Stop when you hit a release-certification or
  stable-publication change and surface that as a hand-off to a human.

## What to read first

1. `AGENT_BASE_RULES.md` (the 40 Prometheus Base Rules — binding)
2. `AGENTS.md` and `CLAUDE.md` (project-specific rules)
3. `.kbd-orchestrator/current-waypoint.md` (active state)
4. `.kbd-orchestrator/project.json` (the umbrella change)
5. `release/v3-release-contract.json` (the binding contract)
6. `release/ci-baseline.md` and `release/package-contracts.md` (the
   release gates)
7. `.kbd-orchestrator/position.json` (the cursor)

## Architectural commitments (binding — do not re-litigate)

1. **Tauri = desktop only.** Mobile (including the
   `v3-tauri-mobile-plugin` change) is **Flutter + Rust over FFI**
   via `flutter_rust_bridge`. Tauri 2.0 mobile plugin work is the
   Tauri project's *plugin for use on iOS/Android*, not a path to
   change the parent project's mobile decision.
2. **Framework-neutral core.** The TypeScript core (`packages/entity-graph-core`)
   is the single source of truth. Every binding (React, Svelte, Solid,
   Web Components, Alpine, HTMX, A2UI, Flutter/Riverpod) consumes it
   via the binding-singleton contract.
3. **No Capacitor, ever.** The Tauri plugin + Flutter FFI pattern is
   the canonical mobile story.
4. **Local-only validation, no GitHub Actions** (per the parent
   `prometheus-skill-pack/AGENTS.md`). Run all checks on this machine.
5. **Kebab-case for every TypeScript and shell file name.**
6. **Progress signaling at every phase/task boundary** — emit
   `Starting task N out of M: ...` / `Completed task N out of M: ...`
   in plain text.
7. **OpenSpec is the source of truth for change tracking.** Every
   change goes through OpenSpec: `openspec/changes/<change-id>/` with
   `proposal.md`, `tasks.md`, and `design.md`. Don't write changes
   ad hoc.

## What to do

1. **Read the current waypoint.** Confirm the cursor is at
   `v3-a2ui-protocol-bridge` (per `.kbd-orchestrator/current-waypoint.md`).
2. **For each pending change** (in dependency order, per
   `position.json`):
   a. `cd` into `openspec/changes/<change-id>/`
   b. Read `proposal.md` and `tasks.md`
   c. Implement the change in dependency order, marking tasks done
      as you go
   d. Run the relevant BDD gate (e.g. `pnpm run bdd:<change-id>`)
   e. Run the relevant test gate (e.g. `pnpm run test:<change-id>`)
   f. When done: archive the change via `npx openspec archive
      <change-id> --yes`
   g. Update `.kbd-orchestrator/position.json` to advance the cursor
3. **Stop conditions:**
   - If a change is blocked by an external dependency, document the
     blocker in `openspec/changes/<change-id>/blocker.md` and move to
     the next change that isn't blocked.
   - If you hit `v3-release-certification` or `v3-stable-publication`,
     STOP. These are human-gated. Hand off to a human operator with
     a clear summary.
4. **At the end of every change:** emit `Completed task N out of M: <change-id>`
   in plain text.
5. **At the end of every wave (3-5 changes):** emit a short summary
   of what shipped and what's still pending.

## What NOT to do

- Do not close the `full-3.0-release` phase. The closure gates
  (release certification, stable publication, npm `latest`
  promotion) are human-gated and outside your scope.
- Do not change the framework-neutral core's public API without an
  explicit OpenSpec change. The core is a published artifact.
- Do not add a new Tauri mobile build target. The Tauri plugin's
  *iOS/Android native bridge* is the only Tauri mobile surface in
  scope; the mobile UI is Flutter.
- Do not propose Capacitor. Don't write any code or doc that
  suggests Capacitor as a path.
- Do not start GitHub Actions workflows. Local validation only.

## Definition of "your work is done for this session"

- At least one PENDING change is now DONE and archived
- The cursor in `.kbd-orchestrator/position.json` is advanced
- The BDD + test gate for the change is green
- The `v3-release-certification` and `v3-stable-publication`
  changes are explicitly handed off to a human (do not attempt them)
- Working tree clean, all commits on `main`

Begin by reading the 7 files listed in "What to read first",
then start with the change at the current cursor.
