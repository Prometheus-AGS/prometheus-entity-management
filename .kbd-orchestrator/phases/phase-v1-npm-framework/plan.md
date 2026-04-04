# PLAN: phase-v1-npm-framework

**Project:** @prometheus-ags/prometheus-entity-management  
**Plan refreshed:** 2026-04-04 (KBD **Plan** phase — closure path to **fully published v1.0**)  
**OpenSpec available:** **YES** (`openspec/`, umbrella [`openspec/changes/archive/2026-04-04-prometheus-v1-0-release`](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release))  
**Orchestration:** **KBD + OpenSpec** — canonical requirements in [`openspec/specs/v1-0.md`](../../../openspec/specs/v1-0.md); execution tracked here, in [`tasks.md`](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release/tasks.md), and [`verification-checklist.md`](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release/verification-checklist.md).

**Immutable completion:** **`@prometheus-ags/prometheus-entity-management@1.0.0`** installable from the **public npm registry** for **production** use, **functionally complete** per the locked **v1.0 spec**, with **skills ↔ runtime exports** enforced in CI.

---

## Assessment → what is left to “implement”?

Per [assessment.md](./assessment.md) and [progress.json](./progress.json): **library code, tests, CI, docs, examples, skills ledger, and semver `1.0.0` are already in the repo.** There is **no further feature implementation** required to satisfy the v1.0 spec before publish.

The **only remaining work** to reach the immutable outcome is **release verification and registry operations** (plus optional post-publish smoke test). Treat each row below as a discrete, verifiable change.

---

## ACTIVE CHANGE LIST — Publish closure (ordered)

**Changes to implement now:** **3** (+ optional **4**)

### 1. `v1-openspec-verify-manual`

- **Scope:** OpenSpec umbrella + spec compliance sign-off  
- **Depends on:** NONE (repo already implements spec)  
- **Recommended agent:** **Manual** (maintainer) or Cursor Agent (checklist walk)  
- **Est. complexity:** **S**  
- **Customer value:** **HIGH** — proves “functionally complete to v1.0 spec” before registry push  
- **Details:** Complete every item in [`openspec/changes/archive/2026-04-04-prometheus-v1-0-release/verification-checklist.md`](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release/verification-checklist.md). If the OpenSpec CLI `verify-change` is available, run it; otherwise the checklist **is** the gate. Update [`tasks.md`](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release/tasks.md) if any box reveals a gap (then fix code/docs and re-verify).

### 2. `v1-npm-publish-dry-run`

- **Scope:** npm packaging sanity  
- **Depends on:** `v1-openspec-verify-manual` (or parallel if checklist is trust-but-verify)  
- **Recommended agent:** **Manual** or **Codex**  
- **Est. complexity:** **S**  
- **Customer value:** **HIGH** — catches `files`, `prepublishOnly`, and tarball issues before live publish  
- **Details:** From repo root, clean tree: `pnpm install`, then `pnpm publish --dry-run` (or `npm publish --dry-run`). Confirm exit **0** and expected `dist/` + `package.json` contents.

### 3. `v1-npm-publish-and-tag`

- **Scope:** registry + git  
- **Depends on:** `v1-npm-publish-dry-run` green  
- **Recommended agent:** **Manual** (npm OTP / org policy)  
- **Est. complexity:** **S**  
- **Customer value:** **HIGH** — delivers the immutable outcome  
- **Details:** `pnpm publish --access public` (or org-equivalent). Tag **`v1.0.0`**, push tag to remote. Mark OpenSpec task “npm publish” complete in [`tasks.md`](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release/tasks.md). Update [reflection.md](./reflection.md) if needed.

### 4. `v1-post-publish-consumer-smoke` *(optional)*

- **Scope:** consumer validation  
- **Depends on:** `v1-npm-publish-and-tag`  
- **Recommended agent:** **Manual**  
- **Est. complexity:** **S**  
- **Customer value:** **MEDIUM** — confidence for waiting projects  
- **Details:** In a **fresh** directory: `pnpm add @prometheus-ags/prometheus-entity-management@1.0.0`, import `useEntity` / `configureEngine`, `pnpm run build` / `tsc` — confirms registry artifact matches expectations.

---

## EXECUTION ROUND ORDER (closure only)

| Round | Changes | Notes |
|-------|---------|--------|
| **1** | `v1-openspec-verify-manual` | Blocker for calling the release “spec-complete” |
| **2** | `v1-npm-publish-dry-run` | Tarball / scripts validation |
| **3** | `v1-npm-publish-and-tag` | Immutable npm outcome |
| **4** *(optional)* | `v1-post-publish-consumer-smoke` | After live package exists |

---

## COMMANDS (KBD + OpenSpec)

**Verify (manual checklist):**

```bash
# From repo root — same gates as CI
pnpm install
pnpm run typecheck && pnpm run build && pnpm run test && pnpm run verify:skills
pnpm run typecheck:vite && pnpm run typecheck:next
```

**OpenSpec:** Walk [`openspec/changes/archive/2026-04-04-prometheus-v1-0-release/verification-checklist.md`](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release/verification-checklist.md). Use `openspec verify-change` **if** your CLI provides it for this change.

**Publish:**

```bash
pnpm publish --dry-run
pnpm publish --access public   # maintainer; after dry-run OK
git tag v1.0.0 && git push origin v1.0.0
```

**KBD native stub (optional tracking):**

```bash
mkdir -p .kbd-orchestrator/changes/v1-npm-publish-closure
# add change.md pointing to rows 1–3 above if you track closure as a KBD change
```

---

## IMMUTABLE RULE — SKILLS ↔ CODE (non-negotiable)

Any change to **public API** (`src/index.ts` exports, hook behavior contract, architecture rules in `AGENTS.md`) **must** ship in the same PR/release with **updated skills** (`library-exports.json` via `pnpm run refresh:exports`) and a **passing** `pnpm run verify:skills`. Documented in `AGENTS.md` / `CLAUDE.md` and PR template.

---

## ARCHIVE — Original phase items (0–12) **COMPLETED**

These were the implementation backlog for v1.0; they are **done** in tree (see assessment, CI, OpenSpec tasks). Kept for audit trail.

| ID | Change | Status |
|----|--------|--------|
| 0 | `openspec-v1-spec-and-change` | Done |
| 1 | `v1-docs-canonical-alignment` | Done |
| 2 | `v1-docs-bundle-and-size-transparency` | Done |
| 3 | `v1-tests-vitest-smoke` | Done |
| 4 | `v1-ci-github-actions` | Done |
| 5 | `v1-docs-tanstack-coexistence` | Done |
| 6 | `v1-docs-publishing-and-releasing` | Done |
| 7 | `v1-example-tanstack-query-bridge` | Done |
| 8 | `v1-examples-realworld-polish` | Done |
| 9 | `v1-docs-advanced-recipes` | Done |
| 10 | `v1-skills-library-v1-alignment` | Done |
| 11 | `v1-skills-sync-enforcement` | Done |
| 12 | `v1-release-1-0-0` (version/changelog) | Done — **registry upload** = rows **1–3** in **ACTIVE CHANGE LIST** above |

**Historical execution rounds 1–8** (parallel batches of items 1–12) are satisfied; see git history and [`reflection.md`](./reflection.md).

---

## PLAN COMPLETE

**Next pending change:** **`v1-openspec-verify-manual`** — complete [`verification-checklist.md`](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release/verification-checklist.md), then **`v1-npm-publish-dry-run`**, then **`v1-npm-publish-and-tag`**.
