# Universal Tauri example task 2 — implementation evidence

Date: 2026-08-04
Change: `v3-tauri-universal-example`
Task: 2 of 6

## Delivered application surface

- Added the private `examples/tauri-universal` pnpm workspace with React
  19.2.8, Vite 8.2.0, Tauri CLI 2.11.4, Tauri API 2.11.1, SQL 2.4.0, and
  deep-link 2.4.9 pinned to the compatibility-checked versions.
- Added one React/Vite application shared by desktop, Android, and iOS. The
  application domain is Task/Project/User, with entities stored once and the
  task list represented only by ordered IDs.
- Preserved the required layering:
  `components -> hooks -> platform store -> platform service -> graph/native`.
  A scoped scan confirms that the component directory imports neither the
  graph store nor the platform service.
- Added one platform service boundary. Tauri detection, commands, SQL,
  deep-link APIs, window lifecycle APIs, and the browser-preview fallback are
  all isolated there; application/domain behavior is not forked by platform.
- Reused the canonical singleton graph required by the current Tauri command
  facade and local-first runtime. No second native or UI-owned graph was
  introduced.
- Added native SQLite durability using the existing
  `createTauriSqlPersistenceAdapter` and `startLocalFirstGraph` APIs. Browser
  preview uses the same runtime contract over localStorage.
- Added an explicit, separately persisted task-mutation queue. Offline edits
  use graph patches for global optimistic visibility, survive restart in the
  durable queue, and converge through the native upsert command when the
  connection returns. Native command failure clears the optimistic patch and
  reports the original failure as the error cause.
- Added current/opened deep-link handling and focus, blur, foreground,
  background, close-requested, and page-hide persistence signals.
- Added a responsive Prometheus-branded desktop/mobile UI with safe-area
  handling, 44px minimum controls, focus-visible styles, reduced-motion
  handling, task selection/detail/status flows, connection controls, durable
  persistence controls, lifecycle/deep-link state, and the destructive-command
  denial demonstration.
- Registered the Rust host with the existing entity graph plugin, official SQL
  plugin, and official deep-link plugin. The host uses stable Rust and contains
  generated Android Studio and Xcode projects from the official Tauri CLI.
- Added a repository-owned SVG application icon and official Tauri-generated
  desktop, Android, and iOS icon assets.

## Capability and trust boundaries

- The main webview capability grants core event/window, deep-link, SQL default
  plus execute, entity-graph read defaults, upsert, and list writes.
- `graph_clear` and entity removal permissions are deliberately absent. The UI
  invokes the real clear command so Tauri can prove it is denied without
  mutating the graph.
- Deep links are untrusted input. Only the registered
  `prometheus-entity://task/<known-id>?tenant=prometheus-labs` shape is accepted,
  and the task ID must already exist in the graph.
- Persisted queue JSON is validated before use. Invalid persisted structure
  fails closed rather than becoming a graph mutation.
- SQL identifiers remain protected by the existing adapter's safe table-name
  contract. No credentials, service-role values, or external secrets were
  added.

## Observed corrections during implementation

1. The first TypeScript/lint pass found four interface-to-record mismatches,
   one effect dependency, and one dropped error cause. All were corrected and
   the same scoped checks then passed.
2. The first Rust check reached `generate_context!` and proved that Tauri needs
   `src-tauri/icons/icon.png`; the official icon generator produced the required
   assets from the checked-in SVG source.
3. The next Rust pass proved that an executable host cannot disable Tauri's
   default runtime features. The reusable plugin remains runtime-neutral, while
   the application host now enables the normal Tauri runtime.
4. `generate_context!` required `serde_json` in the host dependency graph; it is
   now declared directly.

## Task-2 verification

| Command or check | Result | Tier |
|---|---|---|
| `pnpm install` | Passed; lockfile updated for 17 workspaces | dependency resolution |
| `pnpm run typecheck:tauri-universal` | Passed | T0 |
| `pnpm exec eslint examples/tauri-universal/src examples/tauri-universal/vite.config.ts --max-warnings 0` | Passed | T0 |
| `cargo fmt --manifest-path examples/tauri-universal/src-tauri/Cargo.toml --check` | Passed | T0 |
| `CARGO_TARGET_DIR=target/tauri-universal-task2 cargo check --locked --manifest-path examples/tauri-universal/src-tauri/Cargo.toml` | Passed on stable in 29.49s after the cold dependency build | T0 |
| `pnpm tauri android init --ci` | Passed; generated Android project and installed the required Rust target | scaffold |
| `pnpm tauri ios init --ci` | Passed; generated Xcode project | scaffold |
| `git diff --check` | Passed | hygiene |
| Component boundary scan | Passed; no direct graph/service imports in components | architecture |

## Deliberately unclaimed

- Unit, integration, command E2E, restart, and denied-capability tests are task 3.
- Example coverage, public ledgers, skills, and documentation are task 4.
- Vite/Tauri bundle builds, desktop E2E, Android/iOS builds and device/simulator
  smoke, clean-state root gates, and signing/team configuration are task 5.
- The iOS initializer reported available development certificates and an
  outdated local XcodeGen tool. No user-specific development team was written
  into the portable example, and no iOS build is claimed here.
- npm, dist-tags, GitHub Releases, Pages, Pub.dev, and app-store state were not
  changed.
