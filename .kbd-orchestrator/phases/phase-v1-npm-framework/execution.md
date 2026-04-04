# EXECUTION: phase-v1-npm-framework (closure)

**Project:** @prometheus-ags/prometheus-entity-management  
**Date:** 2026-04-04  
**Selected backend:** **`hybrid`** — **OpenSpec** for spec/traceability + **`manual`** for npm registry authentication and git push (no machine credentials in CI/agent).  
**Dispatched to:** **Cursor Agent** (automated gates + this document) + **Maintainer** (publish + tag)  
**Backend rationale:** The phase is **spec-backed release closure** (`openspec/specs/v1-0.md`, umbrella `prometheus-v1-0-release`). Automated verification and `pnpm publish --dry-run` are executable here; **live `npm publish`** requires **npm login**, **2FA/OTP**, and **git remote** access — **manual** only.  
**OpenSpec available:** **YES**  
**Source plan:** [`.kbd-orchestrator/phases/phase-v1-npm-framework/plan.md`](./plan.md)

---

## EXECUTION SCOPE

| Change ID | Status | Notes |
|-----------|--------|--------|
| `v1-openspec-verify-manual` | **Partial (automated sub-gates)** | Spec **§2.2** + **Commands** block executed locally; see **Evidence** below. Maintainer should tick [verification-checklist.md](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release/verification-checklist.md) for **§2.1, 2.3–2.5** (doc/consistency review). |
| `v1-npm-publish-dry-run` | **Done** | `pnpm publish --dry-run --no-git-checks` exit **0** (2026-04-04). Tarball ~455 kB; `prepublishOnly` ran successfully. |
| `v1-npm-publish-and-tag` | **Pending — MANUAL** | See **Your steps (outside agent scope)** below. |
| `v1-post-publish-consumer-smoke` | **Optional / Manual** | After live publish. |

---

## Evidence — automated verification (2026-04-04)

Run from repository root; all exit code **0**:

```bash
pnpm install
pnpm run typecheck
pnpm run build
pnpm run test
pnpm run verify:skills
pnpm run typecheck:vite
pnpm run typecheck:next
pnpm publish --dry-run --no-git-checks
```

**Results:** Vitest 5/5 passed; `verify:skills` OK (129 exports); example typechecks OK; dry-run packaged `@prometheus-ags/prometheus-entity-management@1.0.0` (files: `dist/*`, `README.md`, `CHANGELOG.md`, `package.json` per `package.json` `"files"`).

---

## DISPATCH CONTRACTS

### OpenSpec / KBD

- **Progress file:** [`.kbd-orchestrator/phases/phase-v1-npm-framework/progress.json`](./progress.json)  
- **Handoff:** After **live publish**, maintainer updates [`openspec/changes/archive/2026-04-04-prometheus-v1-0-release/tasks.md`](../../../openspec/changes/archive/2026-04-04-prometheus-v1-0-release/tasks.md) (check `npm publish` task), [reflection.md](./reflection.md) if desired, and commits any doc tweaks.

### Manual (maintainer)

- **Entry:** Follow **Your steps** below. No AI tool can complete npm authentication on your behalf.

---

## Your steps (outside agent scope) — publish to npm

Do these on a **clean git state** (commit anything intended for `1.0.0` first; tag should point at that commit).

### 1. One-time / occasional: npm account

- Create or use an account on [https://www.npmjs.com](https://www.npmjs.com).  
- **Enable 2FA** on the account (npm **requires** 2FA for publishing as of policy changes; use an **auth token** or `npm login` with OTP when prompted).

### 2. Log in locally

```bash
npm login
# or: npm login --auth-type=legacy
# Follow prompts; use OTP if 2FA is on.
```

Verify: `npm whoami` prints your npm username.

### 3. Package name ownership

- The package name is **`@prometheus-ags/prometheus-entity-management`** (see `package.json` `name`).  
- If the name is **already taken** or the scope is unavailable, you must either **change `name`** (and docs) or resolve naming per npm/org policy — **human/npm support**, not automatable here.  
- **Scoped** packages use `publishConfig.access` (this repo sets **`public`**).

### 4. Publish (real)

From repo root (after `git status` is clean for the release commit):

```bash
pnpm publish --access public
```

- **`--access public`** is required so the scoped package is public on the registry (or set `publishConfig.access` in `package.json`, as here).  
- `prepublishOnly` will run: `typecheck` → `build` → `test` → `verify:skills` again.  
- If **OTP** is required, npm will prompt (or use `NPM_CONFIG_OTP` / token-based CI — not covered here).

### 5. Git tag (recommended)

Aligns consumers and docs to the exact tree you published:

```bash
git tag -a v1.0.0 -m "@prometheus-ags/prometheus-entity-management 1.0.0"
git push origin main
git push origin v1.0.0
```

(Adjust branch name if your default branch is not `main`.)

### 6. Post-publish

- Confirm: `npm view @prometheus-ags/prometheus-entity-management version` → `1.0.0`.  
- Optional: GitHub **Release** from tag `v1.0.0` with CHANGELOG excerpt.  
- Optional: `pnpm add @prometheus-ags/prometheus-entity-management@1.0.0` in a **fresh** temp project (consumer smoke test).

### What the agent cannot do

- **npm login / OTP / tokens** on your machine.  
- **Claim** a taken package name or **org billing** on npm.  
- **`git push`** to **your** remote without your credentials.  
- **Publish** from an environment without **network + npm auth** (CI publish needs `NPM_TOKEN` in secrets — separate setup).

---

## EXECUTION COMPLETE (automated portion)

Automated quality gates and **dry-run publish** succeeded. **Phase closure** requires **maintainer** completion of **live publish + tag** above.
