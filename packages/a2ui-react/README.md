# @prometheus-ags/a2ui-react

A2UI React component library for the Prometheus entity graph. Provides
streaming chat, copilot, and human-in-the-loop approval components that project
agent state directly into the entity graph.

## Components

| Component | Purpose |
|-----------|---------|
| `EntityChat` | Full chat surface — streaming, tool calls, AG-UI entity projection |
| `EntityCopilot` | Compact embedded copilot panel |
| `EntityStream` | Raw streaming text renderer with entity projection |
| `EntityDiff` | Field-level before/after diff table (reuses core time-travel) |
| `EntityApproval` | Human-in-the-loop approval gate with auto graph restore on reject |
| `EntityToolProviderContext` | React context provider for MCP / function-calling |

## Hooks

| Hook | Purpose |
|------|---------|
| `useChatSession` | Core chat session — drives EntityChat and EntityCopilot |
| `useEntityDiff` | Imperative diff computation via core time-travel snapshots |
| `useEntityToolProvider` | Read nearest EntityToolProvider from context |

## Architecture

```
Components → useChatSession / useEntityDiff hooks
                        ↓
          applyAgUiSnapshot / applyAgUiDelta (entity-graph-core)
          recordGraphSnapshot / restoreGraphSnapshot (time-travel)
                        ↓
                 Entity Graph (Zustand)
                        ↓
             All subscribed views update
```

MCP / tool calling is a **progressive enhancement** — components work without it.

## Quick Start

```tsx
import { EntityChat } from "@prometheus-ags/a2ui-react";

// 1. Provide a streamFactory that returns an AsyncIterable<StreamEvent>
async function* myAgentStream(messages) {
  // call your agent API; yield StreamEvent objects
}

// 2. Map agent state onto entity-graph entities
const mappings = [
  { entityType: "Order", pointer: "/order", kind: "single", idField: "id" },
];

// 3. Render
function App() {
  return (
    <EntityChat
      streamFactory={myAgentStream}
      mappings={mappings}
    />
  );
}
```

## EntityApproval (Human-in-the-loop)

```tsx
import { EntityApproval } from "@prometheus-ags/a2ui-react";

function ReviewPanel() {
  return (
    <EntityApproval
      entityType="Invoice"
      entityId="inv_456"
      autoCapture          // snapshot taken on mount
      onApprove={(diff) => console.log("Changes accepted", diff)}
      onReject={(diff) => console.log("Reverted to baseline", diff)}
    />
  );
}
```

## Tool Provider (MCP)

```tsx
import { EntityToolProviderContext } from "@prometheus-ags/a2ui-react";

const mcpProvider = {
  getTools: async () => [...],
  executeTool: async (req) => { /* call MCP server */ },
};

<EntityToolProviderContext provider={mcpProvider}>
  <EntityChat streamFactory={...} />
</EntityToolProviderContext>
```

## Styling

All components emit `a2ui-*` CSS class names. Override them or pass
`classNames` props to swap individual slot classes. No default stylesheet is
bundled — bring Tailwind, CSS modules, or any other layer.

## Requirements

- React 18+
- `@prometheus-ags/entity-graph-core` (workspace peer)
