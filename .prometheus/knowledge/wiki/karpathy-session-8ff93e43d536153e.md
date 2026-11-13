---
type: SessionRecord
id: karpathy-session-8ff93e43d536153e
title: Karpathy session 8ff93e43d536
tags:
- karpathy
- session-learning
sources:
- resource: session:4ff3f793-7152-40c8-a92e-a3092232bb8b
generated:
  by: pk/1.11.0
  at: 2026-11-13T09:12:59.188070+00:00
created_at: 2026-11-13T09:12:59.188070+00:00
updated_at: 2026-11-13T09:12:59.188070+00:00
revision: 0
---

## Delta

I fixed the `github` MCP server's launch command. Started from inside this repo, it now answers the MCP handshake correctly.

- **Cause:** this repo's `package.json` requires pnpm (`devEngines`), so `npm` and `npx` refuse to run anywhere inside the project. The `github` server is launched with `npx`, so it exited before it could start. That was the "Connection closed" error. Your token was fine and is still valid for `GQAdonis`.
- **Change:** in `~/.claude.json`, only the `github` entry's command changed. It now moves to your home folder and then runs the same `npx` command. The token wasn't touched or printed. The original file is backed up at `/private/tmp/claude-501/-Volumes-T7-Projects-prometheus-prometheus-entity-management/4ff3f793-7152-40c8-a92e-a3092232bb8b/scratchpad/claude.json.bak-*`.
- **To use it in this session:** type `/mcp` and press Reconnect on `github`, or start a new session. I can't reconnect your own config servers myself.

Two related things I noticed but didn't change:
- Other servers that also failed with "Connection closed" (`kubernetes`, `lens`, `mastra`, `mcp-server-firecrawl`, `resend`, `sequential-thinking`, `shadcn`, `supabase-mcp-server`, `tavily-mcp`) are probably `npx` launches hitting the same problem. I didn't test them, and the same change would likely fix them.
- `@modelcontextprotocol/server-github` is marked archived and unmaintained on npm. GitHub publishes its own maintained MCP server if you want to switch later.

The npm publish is still running: htmx is publishing, then the alias, the `next` tags and the GitHub release.

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 4ff3f793-7152-40c8-a92e-a3092232bb8b
- Captured: 2026-11-13T09:12:56.835056Z
- Project: /Volumes/T7/Projects/prometheus/prometheus-entity-management

## Changed Paths

- release/pubdev-registry-status.json
- scripts/publish-stable-3.0.0.sh
