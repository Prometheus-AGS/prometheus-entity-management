# Design decision — alias directory shape

**Change** C1 · **Date** 2026-09-04 · **Status** decided

## Constraint

`scripts/package-contract-validation.mjs:25`:

```js
assert(manifest.repository?.directory === publicPackage.directory,
  `${publicPackage.name}: invalid repository directory`);
```

Each published package's `repository.directory` must equal its
`PUBLIC_PACKAGES[].directory`. Two packages therefore cannot share one
directory, so the additive alias needs a directory of its own.

## Decision: shape B

`packages/entity-graph-react/` **keeps the source**. The alias gets a new
directory, `packages/prometheus-entity-management/`.

| | shape A — source moves | **shape B — alias is new** |
|---|---|---|
| `packages/entity-graph-react/` | becomes the alias | **stays the source** |
| new directory | holds the moved source | holds the alias |
| `repository.directory` churn | on the real package | on the alias only |
| git history | must follow a move | **28 commits stay in place** |
| diff size | whole package moves | one new small package |

## Why B

The directory name `entity-graph-react` already describes what lives there —
the React bindings. Under shape A that accurate name would be attached to a
re-export shell while the real source moved to a name invented for the occasion.
B ends with `directory` and `name` agreeing for the first time
(`packages/entity-graph-react` → `@prometheus-ags/entity-graph-react`), which is
the pattern every other binding already follows.

B also keeps 28 commits of history attached to the code they describe, and
keeps `homepage` pointing at the source tree rather than at an alias.

## Resulting registry entries

```js
{ directory: "packages/entity-graph-react",
  name: "@prometheus-ags/entity-graph-react" },              // C3
{ directory: "packages/prometheus-entity-management",
  name: "@prometheus-ags/prometheus-entity-management" },    // C4
```

## Fields the alias must carry (from PACKAGE_ENTRYPOINT_CONTRACT)

- `repository.directory: "packages/prometheus-entity-management"`
- `homepage: ".../tree/main/packages/prometheus-entity-management#readme"`
- `type: "module"`, `license: "MIT"`, `author`
- `engines.node: "^22.14.0 || ^24.0.0 || >=26.0.0"`
- `files` containing `dist`, `README.md`, `CHANGELOG.md`
- `main`/`module`/`types` exactly `./dist/index.{cjs,mjs}` and `./dist/index.d.ts`

## Open risk carried to C4

`PACKAGE_ENTRYPOINT_CONTRACT.exports` declares only the `.` entrypoint, but the
alias must re-export three (`.`, `./devtools`, `./devtools/auto`) or it silently
breaks consumers importing `.../devtools`. The React package passes today with
three entrypoints, which suggests the checker tolerates a superset — that is
**suggestive, not proof**, and C4 confirms it before proceeding.
