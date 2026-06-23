# entity-graph-mcp

> MCP server for the [Prometheus entity-graph](https://github.com/Prometheus-AGS/prometheus-entity-management) ecosystem.

Exposes the entity graph as **MCP resources** and **tools** via two transports:

| Transport | Description |
|-----------|-------------|
| **stdio** | Embeds into local MCP hosts (Claude Desktop, cursor, etc.) |
| **Streamable HTTP** | Remote / multi-tenant deployment over Axum |

## MCP Resources

| URI Pattern | Description |
|-------------|-------------|
| `entity://{entityType}` | List all entities of a type as a JSON array |
| `entity://{entityType}/{entityId}` | Read a single entity as a JSON object |

## MCP Tools

| Tool | Description |
|------|-------------|
| `entity_list_types` | List all entity type names registered in the graph |
| `entity_query` | Query entities by type with optional field-equality filters |
| `entity_upsert` | Insert or shallow-merge-update an entity |
| `entity_delete` | Delete an entity; returns the removed record |

## Quick Start

### stdio (Claude Desktop)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "entity-graph": {
      "command": "entity-graph-mcp",
      "args": ["stdio"]
    }
  }
}
```

### Streamable HTTP

```bash
entity-graph-mcp http --port 8080
```

Then point your MCP client at `http://localhost:8080/mcp`.

A liveness probe is available at `GET /health`.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ENTITY_GRAPH_MCP_HOST` | `0.0.0.0` | Bind address (HTTP transport) |
| `ENTITY_GRAPH_MCP_PORT` | `8080` | TCP port (HTTP transport) |
| `RUST_LOG` | `info` | Log level (`debug`, `info`, `warn`, `error`) |

## Building

```bash
cargo build --release
```

The binary is at `target/release/entity-graph-mcp`.

## Testing

```bash
cargo test
```

## Architecture

```
EntityGraphServer
├── store::EntityStore          # DashMap-backed in-process entity graph
│   entities[type][id] = json  # Same shape as @prometheus-ags/entity-graph-core
├── server.rs                   # ServerHandler impl (tools + resources)
├── transport.rs                # stdio helper + Axum/StreamableHttpService
├── cli.rs                      # Clap CLI (stdio | http subcommands)
└── main.rs                     # Entry point + demo seed data
```

Replace `EntityStore`'s `DashMap` internals with real DB calls for production persistence.

## Version

`3.0.0-alpha.0` — part of the Prometheus entity-graph v3 monorepo.
