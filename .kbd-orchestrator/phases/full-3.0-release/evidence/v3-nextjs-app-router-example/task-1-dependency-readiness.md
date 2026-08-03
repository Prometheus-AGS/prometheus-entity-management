# Task 1 — dependency readiness

Date: 2026-08-03
Change: `v3-nextjs-app-router-example`
Result: **PASS**

## Required dependencies

| Dependency | Archived implementation | Completed tasks | Merged specification | Strict validation |
| --- | --- | ---: | --- | --- |
| `v3-framework-neutral-core` | `openspec/changes/archive/2026-08-01-v3-framework-neutral-core` | 6/6 | `openspec/specs/v3-framework-neutral-core/spec.md` | PASS |
| `v3-binding-singleton-contract` | `openspec/changes/archive/2026-08-01-v3-binding-singleton-contract` | 6/6 | `openspec/specs/v3-binding-singleton-contract/spec.md` | PASS |
| `v3-example-coverage-contract` | `openspec/changes/archive/2026-08-01-v3-example-coverage-contract` | 6/6 | `openspec/specs/v3-example-coverage-contract/spec.md` | PASS |
| `v3-sync-persistence-path` | `openspec/changes/archive/2026-08-01-v3-sync-persistence-path` | 6/6 | `openspec/specs/v3-sync-persistence-path/spec.md` | PASS |

Each archived `tasks.md` contains exactly six completed top-level tasks. Each
merged specification passed `openspec validate <dependency> --strict` from the
continuation worktree at the React RC source commit `c06ffe0`.

## Control-plane disposition

The signed KBD runtime was migrated after these four changes were already
implemented and archived, so its imported per-change projection still lists
them as pending. That projection is not used to manufacture dependency
evidence. The archived task surfaces, merged specifications, strict validator
results, and implementation already present in the source tree are the direct
evidence that the Next.js work may proceed.

The complete six-task Next.js surface was registered before task 1 started to
avoid the previously observed lazy-registration completion error. No npm,
GitHub release, or other registry mutation occurred.
