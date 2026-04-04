# Current waypoint

| Field | Value |
|-------|--------|
| **Phase** | `phase-v1-npm-framework` |
| **Orchestration** | **KBD + OpenSpec** |
| **Execution** | [`.kbd-orchestrator/phases/phase-v1-npm-framework/execution.md`](phases/phase-v1-npm-framework/execution.md) |

## Status

- **Automated:** Full verify (typecheck, build, test, `verify:skills`, example typechecks) + **`pnpm publish --dry-run`** — **passed** (see `execution.md` evidence).
- **Pending (you):** **Live npm publish** + **git tag `v1.0.0`** — requires **npm login** / **2FA**; agent cannot authenticate.

## Exact next command (human)

Read **[execution.md — Your steps (outside agent scope)](phases/phase-v1-npm-framework/execution.md#your-steps-outside-agent-scope--publish-to-npm)**, then:

```bash
npm login
pnpm publish --access public
git tag -a v1.0.0 -m "@prometheus-ags/prometheus-entity-management 1.0.0"
git push origin main && git push origin v1.0.0
```

Tick [verification-checklist.md](../../openspec/changes/prometheus-v1-0-release/verification-checklist.md) and [tasks.md](../../openspec/changes/prometheus-v1-0-release/tasks.md) when done.
