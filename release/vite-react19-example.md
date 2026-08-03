# React 19 and Vite 8 showcase

The `v3-vite-react19-example` change certifies the source-workspace browser
showcase at `examples/vite-app`. It is the first implemented application in the
3.0 example portfolio and is the reference UI for evaluating the React release
candidate while the Next.js, A2UI, Flutter, Tauri, and documentation-site work
continues.

## Certified toolchain

- `@prometheus-ags/prometheus-entity-management` `3.0.0-rc.1`
- `@prometheus-ags/entity-graph-core` `3.0.0-rc.1`
- optional showcase sync package `@prometheus-ags/entity-graph-sync` `3.0.0-rc.1`
- React `19.2.8`
- Vite `8.2.0`
- TypeScript `6.0.2`
- Playwright `1.62.1`

These are checked-in candidate versions, not proof that npm's `next` tag has
been staged. Registry use remains gated by the immutable RC rehearsal and the
protected npm approval path in `release/release-candidate-pipeline.md`.

## Run the showcase

Install and start the deterministic local application from the repository
root:

```bash
pnpm install --frozen-lockfile
pnpm run dev:vite
```

Open `/release-showcase`. Demo REST and GraphQL transports are keyless and
deterministic. Live transport modes are explicit opt-ins:

```bash
VITE_SHOWCASE_REST_URL=https://example.invalid/tasks \
VITE_SHOWCASE_GRAPHQL_URL=https://example.invalid/graphql \
pnpm run dev:vite
```

The application fails with an actionable message when a live mode is selected
without its endpoint. It does not silently fall back to demo data.

## Architecture

The showcase follows the repository boundary:

```text
release-showcase-page.tsx
  -> release-showcase-hooks.ts
    -> release-showcase-store.ts
      -> release-showcase-service.ts / graph adapters
```

Components render state and submit intent. Hooks coordinate the view. The
store owns application state and invokes services/adapters. REST, GraphQL,
PGlite, Loro, and realtime operations do not live in the component.

Canonical entities live once in the graph and list slots retain ordered IDs.
The detail and list views rejoin the same Task node. Local optimistic patches
remain separate from canonical entity fields and are cleared on confirmation
or rejection.

## Implemented scenarios

| Scenario | Browser proof |
| --- | --- |
| `example.graph.normalized-cross-view` | Selecting a Task updates list and detail projections of one canonical node. |
| `example.crud.optimistic-confirm` | A global patch appears immediately and clears after confirmation. |
| `example.crud.optimistic-rollback` | A rejected mutation restores the prior entity and clears its patch. |
| `example.relationship.cascade-invalidation` | Reassigning a Task invalidates both Project relationship edges. |
| `example.view.local-remote-hybrid` | One typed view descriptor runs in local, remote, and hybrid modes; hybrid preserves local rows while fetching. |
| `example.transport.rest-graphql-equivalence` | Demo REST and GraphQL results normalize through the same graph-facing contract. |
| `example.realtime.coalesced-cross-view` | Three changes to one entity collapse into one graph write and the final cross-view state. |
| `example.offline.persistence-convergence` | Browser PGlite persists/hydrates the graph and two deterministic Loro peers converge. |
| `example.runtime.lifecycle-security` | A cache-miss suspends, success resolves, failure remains inside the nearest error boundary, and axe reports no serious or critical findings. |

The browser suite additionally verifies live graph diagnostics for entities,
lists, subscribers, and patches without introducing a second state store.

## Browser-visible optional peer loading

Bundlers must be able to see the optional Loro import. Supply the loader when
creating a browser provider:

```ts
const loadLoro = () => import("loro-crdt");

const provider = createLoroProvider({
  channel,
  peerId: 101,
  loadLoro,
});
```

Node consumers can omit `loadLoro`. The callback is also accepted by
`createLoroMergeStrategy(loadLoro)` in core. This preserves optional-peer
loading while giving Vite a statically visible import to include in the
production bundle.

## Verification

The complete application gate is:

```bash
pnpm run bdd:vite-react19
```

Its verifier performs React and Vite typechecks, targeted query/Suspense units,
core/React/sync builds, a Vite production build, and three serial Chromium
suites. It requires all declared scenario receipts, zero serious or critical
axe findings, three screenshots, Playwright traces, and SHA-256 artifact hashes.

For direct debugging:

```bash
pnpm run test:vite-react19:unit
pnpm run test:vite-react19:browser
pnpm run verify:vite-react19
```

The implementation receipt is
`.kbd-orchestrator/phases/full-3.0-release/evidence/v3-vite-react19-example/task-3-verification.json`.
The deletion-aware clean-room receipt is
`.kbd-orchestrator/phases/full-3.0-release/evidence/v3-vite-react19-example/clean-vite-verification.json`.
Each receipt points to its own separately named screenshots and Playwright
traces, and every declared artifact hash matches the retained evidence.

## Evidence boundary

This is production-browser evidence from the source workspace. The example
resolves workspace packages, so it deliberately records
`countsAsPackedPackageEvidence: false`. It does not replace:

- `pnpm run verify:package-contracts` for tarball-only ESM, CommonJS, and
  TypeScript consumers;
- an immutable core + React RC rehearsal;
- live remote REST, GraphQL, or Loro relay certification;
- Firefox, WebKit, mobile-browser, Next.js SSR/hydration, Flutter, or Tauri
  platform evidence; or
- npm trusted-publisher configuration and protected human staging approval.

The PGlite production bundle includes large WASM/data assets and currently
emits upstream direct-`eval` and chunk-size warnings. The build passes, but
deployments should account for those assets rather than treating the demo
bundle size as the minimal core + React package footprint.
