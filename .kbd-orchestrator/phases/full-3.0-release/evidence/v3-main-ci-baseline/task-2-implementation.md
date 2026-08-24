# Task 2 — Baseline implementation record

Date: 2026-08-01
Change: `v3-main-ci-baseline`

## Main reconciliation

The working tree contained user changes, so the two commits by which local `main` trails `origin/main` were reconciled manually instead of merging or resetting:

- `7f982fc` (test at phase completion): incorporated into `AGENT_BASE_RULES.md` as cheap checks during implementation, full verification at phase completion, and serialized expensive builds.
- `1ce302c` (frontend package pins): incorporated the dependency-update intent, superseding Recharts 3.9.2 with compatible current 3.10.1. Its pnpm 11.15.0 pin was deliberately rejected because the promoted v3 release contract requires pnpm `>=10.33.0 <11`; the root and examples remain on pnpm 10.33.0.

This is content reconciliation only. The branch ancestry remains two commits behind until the dirty working tree can be integrated through the normal commit workflow.

## Hermetic workspace

- Deleted nested example lockfiles and the nested Next.js workspace file. `pnpm-lock.yaml` at repository root is the only dependency lock.
- Removed both dormant `entity-sync-transport.ts` proof files and their absolute sibling `link:` dependencies. The external sibling checkout was an accidental build prerequisite, not a declared dependency. Sync integration remains assigned to `v3-sync-persistence-path`.
- Removed the unused shadcn CLI production dependency and the `shadcn/tailwind.css` imports. The examples already own their Tailwind theme, tokens, base layer, and generated component source.
- Pinned the Next.js Turbopack workspace root to the monorepo root.
- Changed the Vite alias from legacy `__dirname` to `import.meta.dirname`, which is supported by the Node compatibility floor and by Vite's native config loader.
- Enabled the approved Sharp install script in `pnpm-workspace.yaml`; no other dependency build-script permission was broadened.

## Dependency decisions

Direct dependencies were updated to compatible current releases across the workspace, including React 19.2.8, Next.js 16.2.12, Vite 8.2.0, Vitest 4.1.10, TypeScript 6.0.2, Turbo 2.10.8, Zustand 5.0.14, Immer 11.1.15, TanStack Router 1.170.18, Tailwind CSS 4.3.3, and the current compatible framework bindings.

`pnpm outdated --recursive` now reports only three intentional holds:

| Dependency | Selected | Registry latest | Decision |
| --- | ---: | ---: | --- |
| `@types/node` | 22.20.1 | 26.1.2 | Keep the declaration baseline at the minimum supported Node LTS line so accidental Node 24/26-only API usage is caught. CI executes Node 22, 24, and 26. |
| `react-day-picker` | 9.14.0 | 10.0.1 | Keep major 9 for the current generated calendar component contract. Major 10 migration is unrelated to the CI baseline and must include UI behavior and visual certification. |
| `typescript` | 6.0.2 | 7.0.2 | Keep TypeScript 6 because it is the promoted v3 compiler contract and is supported by the selected TypeScript ESLint release. TypeScript 7 is a separate compiler migration. |

## Advisory disposition

The pre-change production audit reported 24 distinct high/critical advisory records (69 vulnerable paths in pnpm metadata). Upgrading Next, TanStack Router, and PostCSS and removing the shadcn CLI eliminated all but three transitive records. Next.js 16.2.12 still declares `postcss@8.4.31` and `sharp@^0.34.5`, so root pnpm overrides select patched `postcss@8.5.25` and `sharp@0.35.0`.

The checked-in `security/advisory-policy.json` records each disposition. `scripts/audit-production.mjs` fails on every active high/critical production advisory unless an owner, rationale, and expiry are recorded. Current result: 0 critical, 0 high, 0 moderate, 1 low; there are no accepted high/critical exceptions and no zero-risk claim.

## Deterministic CI implementation

- Added real repository-wide ESLint execution. It enforces syntax, core correctness, Rules of Hooks, and exhaustive dependencies. React Compiler migration rules are excluded from this baseline rather than silently redefining v3 as a compiler-migration project.
- Corrected 16 stale-closure findings by reading current mutation/table callbacks through stable refs, plus two ordinary JavaScript findings.
- Added named CI gate execution with per-gate timeouts. Failure and timeout messages identify the responsible gate and command.
- CI uses frozen root installation and executes release-contract validation, lint, typecheck, build, tests, skills/export verification, and production security policy on Node 22, 24, and 26.

## Proportional implementation checks

| Check | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pass; 15 workspaces, root lockfile current |
| `pnpm run lint` | Pass |
| `pnpm run typecheck` | Pass; 17/17 Turbo tasks |
| `pnpm run security:audit` | Pass; 0 critical/high, 1 low visible |
| Next.js 16.2.12 production build | Pass; 12/12 static pages generated with Turbopack and the patched transitive overrides |
| Vite 8.2.0 production build | Pass; 3,791 modules transformed |

BDD/unit coverage for timeout behavior, policy failure paths, and hermetic-lock assertions is intentionally the next KBD task. Full clean-room CI certification remains task 5.
