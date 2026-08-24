# `@prometheus-ags/entity-graph-sdl`

The shared Schema Definition Language for Prometheus entity graphs. It validates a JSON document and produces one deterministic intermediate representation (IR) for TypeScript, Rust, Flutter, framework bindings, and other generators.

## Install

```bash
pnpm add @prometheus-ags/entity-graph-sdl
```

## Define a graph

```json
{
  "version": "1.0",
  "entities": {
    "user": {
      "fields": {
        "id": { "type": "uuid", "primary": true },
        "name": { "type": "string", "required": true }
      },
      "relations": {
        "orders": {
          "type": "hasMany",
          "target": "order",
          "foreignKey": "userId"
        }
      }
    },
    "order": {
      "fields": {
        "id": { "type": "uuid", "primary": true },
        "userId": { "type": "uuid", "required": true },
        "total": { "type": "decimal", "required": true }
      }
    }
  },
  "config": {
    "localFirst": { "engine": "pglite", "sync": "electric" },
    "ai": { "mcp": true, "a2a": true }
  }
}
```

Every entity must contain exactly one `primary: true` field. Relations must reference another entity declared in the same document.

## Parse and validate

```ts
import {
  parseSdl,
  parseSdlJson,
  SdlValidationError,
} from "@prometheus-ags/entity-graph-sdl";

const ir = parseSdl({
  version: "1.0",
  entities: {
    user: {
      fields: {
        id: { type: "uuid", primary: true },
        name: { type: "string", required: true },
      },
    },
  },
});

console.log(ir.entities[0].primaryKey); // "id"

try {
  parseSdlJson("{ invalid json }");
} catch (error) {
  if (error instanceof SdlValidationError) {
    console.error(error.path, error.message);
  }
}
```

`parseSdl` accepts an unknown JavaScript value. `parseSdlJson` accepts JSON text. Both return `EntityGraphIR` or throw `SdlValidationError` with the precise failing path.

## Supported schema values

- scalar types: `string`, `number`, `integer`, `decimal`, `boolean`, `datetime`, `date`, `json`, `enum`, and `uuid`
- relation types: `belongsTo`, `hasMany`, and `manyToMany`
- local-first engines: `pglite`, `sqlite`, and `none`
- sync modes: `electric`, `yjs`, and `none`
- optional MCP and A2A generation flags

Enum fields require a non-empty `values` array. A table name defaults to the entity key and can be overridden with `table`.

## Module support

The package publishes conditional ESM (`.mjs`/`.d.ts`) and CommonJS (`.cjs`/`.d.cts`) entry points.

## License

MIT
