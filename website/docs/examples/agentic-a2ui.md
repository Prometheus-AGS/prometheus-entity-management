---
title: Agentic A2UI tutorial
sidebar_position: 4
---

# Agentic A2UI without hidden authority

The example receives A2A tasks, validates official A2UI messages, renders only
catalogued widgets, and maps catalogued actions to explicit graph intent. Human
approval gates sensitive mutations. Denied, malformed, cancelled, and unknown
actions never reach store methods.

The agents send A2UI 1.0 messages (`version: "1.0"`, `@path` bindings) as an
official A2A DataPart. The client attaches `a2uiRendererCapabilities` to every
user message, and the example's executor publishes A2UI only for a turn that
offers its catalog.

Deterministic local agents make CI keyless. Optional external-agent hosting is
configuration, not release evidence. Desktop and mobile browser receipts cover
the same action-policy surface.

```bash
pnpm run typecheck:agentic-a2ui
pnpm run test:agentic-a2ui:unit
pnpm run verify:agentic-a2ui
```
