# One core singleton across stable JavaScript bindings

The `v3-binding-singleton-contract` gate certifies that the six stable JavaScript framework bindings in this change use the entity graph owned by the consuming application. A binding does not install or hide a private `@prometheus-ags/entity-graph-core` copy. This keeps a write made through one binding visible to every other view reading the same normalized entity.

This is a package-resolution and reactive-behavior contract. It is narrower than complete 3.0 release certification.

## Certified binding set

| Binding | Framework/runtime peer | Core relationship | Packed behavior proof |
| --- | --- | --- | --- |
| `@prometheus-ags/prometheus-entity-management` | React 19 | required compatible core peer | React StoreApi subscription observes a core write |
| `@prometheus-ags/entity-graph-svelte` | Svelte 5 | required compatible core peer | entity store observes a core write |
| `@prometheus-ags/entity-graph-solid` | Solid 1.8+ | required compatible core peer | `createGraphStore` accessor observes a core write |
| `@prometheus-ags/entity-graph-web-components` | Lit 3 | required compatible core peer | reactive controller requests an update and reads the entity |
| `@prometheus-ags/entity-graph-alpine` | Alpine 3.13+ | required compatible core peer | Alpine binding reads the shared entity |
| `@prometheus-ags/entity-graph-htmx` | Node/HTMX server | required compatible core peer | server graph emits a binding event and core observes the write |

Tauri and Flutter are part of the complete ecosystem singleton requirement, but their native/platform certification belongs to later `v3-tauri-mobile-plugin` and `v3-dart-graph-riverpod` changes. This gate does not use these six JavaScript fixtures as a substitute for native evidence.

## Manifest contract

Each binding source manifest uses this relationship:

```json
{
  "peerDependencies": {
    "@prometheus-ags/entity-graph-core": "workspace:^"
  },
  "devDependencies": {
    "@prometheus-ags/entity-graph-core": "workspace:*"
  }
}
```

The core peer is required, not optional. The binding has no production `dependencies` entry for core. During packing, pnpm rewrites the workspace peer to a publishable compatible semver range and removes workspace protocols from consumer-facing metadata.

The peer relationship matters because the application must select the core instance. A production dependency could give a binding a nested core copy, splitting canonical entities, subscriptions, patches, and list state. The development dependency only makes the workspace package available while building and testing the binding; it does not become a consumer-owned graph.

## Consumer installation

Install core explicitly alongside the binding so the application owns resolution:

```bash
pnpm add @prometheus-ags/entity-graph-core @prometheus-ags/entity-graph-svelte svelte
```

Replace the Svelte binding and framework peer with the binding in use. If several bindings coexist, list core once:

```bash
pnpm add \
  @prometheus-ags/entity-graph-core \
  @prometheus-ags/prometheus-entity-management \
  @prometheus-ags/entity-graph-web-components \
  react react-dom lit
```

Do not suppress an incompatible peer warning or add a second core version beneath a binding. Align the application and binding to a mutually compatible 3.x release.

## Fixed release policy

`.changeset/config.json` contains exactly one fixed group matching all twelve npm packages declared by `release/v3-release-contract.json`. Changesets therefore calculates one coordinated version for the package set instead of allowing core and its bindings to drift independently. The singleton verifier validates the exact group rather than accepting a matching count or subset.

The current fixed-group source candidate is `3.0.0-rc.1` under Changesets prerelease mode and still targets stable `3.0.0`. This gate does not publish it or move the `latest` dist-tag.

## Public store boundary

- Core exports `graphStore`, the default vanilla singleton, and `createGraphStore()` for explicitly isolated hosts.
- React exports callable `useGraphStore(selector)` over that default singleton.
- Non-React bindings use `graphStore`; core's deprecated `useGraphStore` export remains a StoreApi-shaped migration alias, not a hook.
- Application components still use their binding's domain hooks, stores, signals, controllers, or magics. Direct store access remains for adapters, framework internals, tests, and other non-component integration code.

## Reproducible verification

```bash
pnpm run test:binding-singletons
pnpm run verify:binding-singletons
pnpm run bdd:binding-singletons
```

`verify:binding-singletons` builds and packs the public packages, installs an isolated pnpm consumer with strict peer dependencies, resolves core from the application and each binding, and requires one real physical path. It then exercises behavior through all six public binding entry points.

The verifier also packs a fake core `4.0.0` and confirms that strict peer resolution fails with diagnostics naming `@prometheus-ags/entity-graph-core` and peer context. The fast Node tests mutate manifest-policy inputs so direct core dependencies, optional or missing peers, workspace leakage, excluded candidate ranges, and Changesets fixed-group drift fail closed before packing.

Machine-readable results are recorded under `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-binding-singleton-contract/` and mapped by `release.bindings.one-core-singleton` in `examples/coverage.json`.

## Evidence boundary

This gate is headless. It does not certify browser rendering, device behavior, native Tauri or Flutter bindings, the five showcase applications, visual regression evidence, Docusaurus, registry authority, provenance, RC recovery, or stable publication. Those claims require their own later plan changes and evidence. No npm registry or dist-tag mutation is performed by these commands.
