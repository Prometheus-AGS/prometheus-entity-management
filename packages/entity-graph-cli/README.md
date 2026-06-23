# `entity-graph-cli`

A self-contained Rust CLI that scaffolds entity schemas and generates TypeScript
type definitions + transport-registration stubs for the
`@prometheus-ags/entity-graph-core` ecosystem.

## Installation

```bash
# From the monorepo root
cargo install --path packages/entity-graph-cli

# Or run directly without installing
cargo run --manifest-path packages/entity-graph-cli/Cargo.toml -- <subcommand>
```

## Subcommands

### `init`

Write a starter `schema.json` into a directory.

```bash
entity-graph init                  # writes ./schema.json
entity-graph init --out src/db     # writes src/db/schema.json
entity-graph init --force          # overwrite an existing schema
```

The generated file follows the SDL format consumed by
`@prometheus-ags/entity-graph-sdl`'s `parseSdl()` and mirrors the
`EntityGraphIR` shape.

### `generate`

Read an SDL JSON schema and emit TypeScript files.

```bash
entity-graph generate \
  --target react \
  --schema schema.json \
  --out src/db/generated
```

**Output files**:

| File | Contents |
|------|----------|
| `entity-types.ts` | `interface` per entity + `CreateXInput` / `UpdateXInput` helpers |
| `register-transports.ts` | `registerTransports(baseUrl)` stub using `registerEntityTransport` |
| `index.ts` | Barrel re-export |

## SDL JSON format

```json
{
  "version": "1.0",
  "entities": {
    "user": {
      "fields": {
        "id":    { "type": "uuid",   "primary": true, "required": true },
        "email": { "type": "string", "required": true, "unique": true },
        "role":  { "type": "enum",   "values": ["admin","member"] }
      },
      "relations": {
        "posts": { "type": "hasMany", "target": "post", "foreignKey": "userId" }
      }
    },
    "post": {
      "fields": {
        "id":     { "type": "uuid",   "primary": true },
        "title":  { "type": "string", "required": true },
        "userId": { "type": "uuid",   "required": true }
      },
      "relations": {
        "author": { "type": "belongsTo", "target": "user", "foreignKey": "userId" }
      }
    }
  }
}
```

Scalar types: `string` `number` `integer` `decimal` `boolean` `datetime` `date`
`json` `enum` `uuid`.

Relation kinds: `belongsTo` `hasMany` `manyToMany`.

## Development

```bash
# Build
cargo build --manifest-path packages/entity-graph-cli/Cargo.toml

# Test
cargo test --manifest-path packages/entity-graph-cli/Cargo.toml

# Release build
cargo build --release --manifest-path packages/entity-graph-cli/Cargo.toml
```

## Architecture

```
src/
├── main.rs           CLI entry point + clap wiring
├── ir.rs             SDL IR types (mirrors @prometheus-ags/entity-graph-sdl)
├── templates.rs      Tera template strings (embedded, no filesystem deps)
└── commands/
    ├── mod.rs
    ├── init.rs       `init` subcommand
    └── generate.rs   `generate` subcommand + Tera rendering
```
