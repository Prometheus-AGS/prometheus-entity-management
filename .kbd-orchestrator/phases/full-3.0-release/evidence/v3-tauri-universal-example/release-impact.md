# Release impact — `v3-tauri-universal-example`

Date: 2026-08-04
Implementation source through platform certification: `0de1e81`
Change status: implementation and refiner QA complete; new review/archive pending

## Delivered boundary

- One private React 19/Vite 8/Tauri 2 application now shares the same domain,
  graph, UI, and adapter contract across macOS, Android, iOS, and browser
  preview.
- The example demonstrates normalized cross-view identity, ID-only lists,
  relationship invalidation, coalesced realtime updates, native SQLite,
  durable offline mutation restart, reconnect convergence, lifecycle and deep
  links, least-privilege capabilities, and responsive accessibility.
- Real native evidence exists for a packaged macOS application, Android 16 API
  36 arm64 emulator, and unsigned iOS 26.5 arm64 simulator.
- All five requested showcase applications are now recorded as implemented.
  Aggregate 3.0 coverage remains `in-progress` because examples alone do not
  certify documentation, skills, release automation, registries, or stable
  publication.

## Package and API impact

The example is private and is not a registry artifact. It does not add public
Tauri declarations: the ledger remains 26 runtime exports and 57 declaration
exports.

One observed public IPC correction affects
`@prometheus-ags/entity-graph-tauri`: omitted public list metadata is normalized
to the Rust command's complete payload. The focused regression passes, and
`.changeset/fix-tauri-list-ipc.md` requests a patch prerelease. Because the npm
packages are a fixed Changesets group, that correction belongs to a later
coordinated candidate after this continuation is merged.

## React-first release lane

The already rehearsed React/core `3.0.0-rc.1` source remains frozen on remote
`main` at `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`. Therefore:

- the immutable `rc.1` bundle can still be staged to npm `next` once npm-side
  trusted-publisher authority and protected-environment approval are present;
- this branch does not move `main`, mutate npm, or alter the existing bundle;
- merging this continuation later consumes its Tauri Changeset into a
  subsequent coordinated prerelease rather than changing `rc.1`.

Publishing only the React tarball is not the certified path. The release
contract stages the coordinated twelve-package npm set in dependency order so
React and its core/internal ranges remain consistent.

## Security boundaries

- Tauri IPC is a native authorization boundary. The main capability permits
  required graph reads/writes but withholds destructive clear and removal;
  historical macOS/Android execution supplies the exact clear denial and the
  current Android receipt supplies exact clear and removal denials, while the
  current classifiers accept only those command/permission pairs and rethrow
  transport or other-command failures.
- Deep links and persisted queue JSON are untrusted inputs. Scheme, tenant,
  route, decoding, known entity identity, and queue structure are validated
  before graph mutation.
- The application contains no npm token, service-role credential, development
  team, signing identity, or hosted integration secret.
- A diagnostic command exposed an inherited Cargo registry credential in tool
  output. The generated Android and iOS build phases now remove unrelated
  registry credentials from their child environments, with Gradle compilation,
  checked-in Xcode project regeneration, and fail-closed regressions. Native
  archives are excluded from Xcode application resources. The credential's
  external owner must rotate it;
  the redacted postmortem is retained under `.prometheus/postmortems/`.

## Stable-release impact

This change closes the implementation gap for the fifth requested showcase.
It does not complete stable 3.0.0. Flint portable contracts, the complete
skills expansion, the Prometheus-branded Docusaurus product and GitHub Pages
deployment, aggregate certification, registry authority, post-publication
consumers, signed GitHub Release, and stable dist-tag promotion remain separate
changes.

## Explicit platform limits

- Windows and Linux desktop bundles were not executed.
- Android evidence is emulator-based, not physical-device certification.
- iOS evidence is simulator-based and unsigned.
- Native assistive technology, distribution signing, app stores, and store
  review are not certified.
- No npm package, dist-tag, GitHub Release, or app-store object changed.
