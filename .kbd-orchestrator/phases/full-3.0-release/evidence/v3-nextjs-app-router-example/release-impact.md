# Release impact — `v3-nextjs-app-router-example`

Date: 2026-08-03
Implementation source through review corrections: `996750f`
Change status: implementation evidence complete; certification and archive are
separate quality gates

## Package impact

This change adds application-owned graph scope to the core and React packages.
The public React surface adds `GraphStoreProvider`, `useGraphStoreApi`, and
`GraphStoreProviderProps`. Engine requests, subscribers, Suspense waiters,
mutations, CRUD invalidation, GraphQL/ElectricSQL paths, DevTools, and realtime
can resolve the selected graph while preserving the default singleton for
existing non-provider applications. Garbage collection now follows the same
ownership boundary: each selected graph has its own interval and the public
start/stop helpers accept an optional graph while retaining singleton defaults.
React hooks reference-count each selected graph's focus/reconnect listeners and
collector, then remove the window callbacks and stop GC after the final hook
unmounts. Discarded provider trees therefore do not remain retained by engine
lifecycle infrastructure.

The example's scoped realtime manager also follows provider replacement: a new
manager is created for the new graph, the prior adapter is unregistered, and
running intent survives adapter recreation. The packed verifier preserves the
checked-in Next config rather than substituting an empty release-only config.
After focused source tests run, the packed boundary excludes their files and
Vitest config, then scans all 112 remaining command-relevant text files and
fails if any workspace source alias remains.

The checked-in Changeset requests a patch prerelease for:

- `@prometheus-ags/entity-graph-core`;
- `@prometheus-ags/prometheus-entity-management`.

The fixed Changesets group means those changes eventually advance all twelve
npm candidates together. The Next.js example itself is private and is not a
published artifact.

## React-first release lane

This continuation work is not part of the frozen React `3.0.0-rc.1` candidate
merged at `30fc348ca529214db5d9b9ab8f0702b41c61ebf1`. The isolated post-merge
gate fixes remain on PR #9. Therefore:

- React `rc.1` can be merged, rehearsed, approved, and staged without waiting
  for this Next.js change or the rest of the showcase portfolio;
- merging this continuation later will consume its Changeset and require a
  subsequent coordinated prerelease rather than mutating the frozen `rc.1`;
- consumers of `rc.1` receive the certified React/Vite surface but not the new
  request-scoped provider API from this continuation branch.

This separation is intentional. It avoids silently moving the React candidate
SHA while still allowing the full 3.0 program to continue.

## Stable-release impact

The Next.js showcase now satisfies its own plan acceptance criteria and can be
used as evidence for `runtime.ssr-hydration`. It does not complete stable 3.0.0.
Agentic A2UI, Flutter/Riverpod/A2UI, universal Tauri, the Prometheus Docusaurus
site and GitHub Pages deployment, aggregate release certification, registry
promotion, and stable publication remain separate changes.

## Security boundary

The observed server trust boundary remains fail-closed: the Server Action
accepts only an allowlisted task ID and status, then resolves authoritative
entity data from server-owned fixtures. A client-supplied object cannot grant
entity or graph authority. The focused denial test and packed browser flow pass.
No secrets, tokens, hosted credentials, or external registry writes are used by
the Next.js verifier.

## Explicit limits

- Browser certification covers Chromium desktop, not Firefox, WebKit, or a
  mobile browser.
- The example forces dynamic documents to certify request isolation. Static
  generation, ISR, partial prerendering, and shared-cache policies are not
  certified by this change.
- REST, GraphQL, mutation, and realtime behavior uses deterministic local
  fixtures. No live hosted backend is claimed.
- The consumer installs local packed tarballs; it does not prove npm `next`
  registry installation or trusted-publisher configuration.
- The evidence runs on Node `26.5.0` with pnpm `10.33.0`; the repository's
  separate main CI matrix owns Node 22/24/26 compatibility.
- Dart/Melos, Cargo, Flutter devices, and Tauri platforms are not applicable to
  this Next.js-only change and were not run.
