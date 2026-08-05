---
title: Entity management skills
sidebar_position: 5
---

# Skills are guidance bound to public ledgers

The `prometheus-entity-skills` tree helps agents detect a domain, initialize or
migrate a graph, build CRUD and relationship flows, configure GraphQL/Prisma and
realtime, add local-first behavior, and audit GC/performance. Shared references
record architecture rules and runtime export ledgers.

Before following a skill, read its complete `SKILL.md` and required references.
After a public API change, run `pnpm run refresh:exports` only when the export
surface actually changed, then `pnpm run verify:skills`. Package-specific
ledgers must match packed/public artifacts; a snippet that only works through a
local source alias is not public guidance.

Skills never override the core architecture: components/views render, hooks or
view models orchestrate, stores own state, and services/adapters own I/O. They
also cannot promote themselves based on their own review; adversarial review
and human approval gate rule or skill promotion.
