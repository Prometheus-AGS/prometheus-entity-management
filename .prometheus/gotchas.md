# Gotchas

## 2026-08-29 — Quote Markdown backticks safely in shell task titles

Passing a Markdown-formatted KBD task title inside shell double quotes executes
backtick content as command substitution. The React inspector task 2 start
signal therefore lost the literal `./devtools` text and emitted a harmless
`No such file or directory` message. Use shell single quotes for static task
titles containing backticks; the completed signed task summary was corrected
with safe quoting.

## KBD authority after legacy migration

- Treat `prometheus kbd status --json` and its signed Loro revision as canonical.
  A generated `.kbd-orchestrator/**/progress.json` file can contain a newer stale
  projection from a retired authority and must not override the signed state.
- Local interactive CLI signing may resolve to a different OS-credential identity
  than the headless control service. For this project, typed KBD mutations must use
  the already-configured mode-0600 service key through
  `PROMETHEUS_DEVICE_KEY_FILE`; never weaken signature checks or edit the journal.
- Register the complete KBD task surface before completing the first task. The
  runtime correctly derives change completion from all *registered* tasks; lazy
  one-at-a-time registration can therefore transiently report a change complete
  when later backend tasks have not been registered yet.

## KBD next-work projection after final task completion

- The final `kbd-apply end-task` transition can mark both the task and its change
  complete atomically. A later explicit `Complete -> Complete` change transition
  is rejected with HTTP 409 and must not be forced or worked around by editing
  projections.
- At the same signed revision, `exactNextWork` can still name the just-completed
  change even though its canonical status and all tasks are complete. Treat the
  signed work-item status plus immutable plan sequence as authoritative, retain
  the stale projection as an observed control-plane issue, and activate the next
  planned change through a fresh signed transition on the next execution turn.
- In runtime revision 39, registering and transitioning a task preserved the
  task event but reset `v3-nextjs-app-router-example` from `in_progress` to
  `pending` at the change projection. Treat the immutable task event and exact
  next-work pointer as authoritative; do not hand-edit the projected status.

## KBD task completion can diverge before after-hooks

- `kbd-apply end-task` marks the OpenSpec checkbox before it commits the signed
  task transition. If that local mutation makes runtime-authority detection
  fail, the driver can print a completion signal while the signed task and
  `task:after` hooks remain unchanged.
- After every task boundary, verify the signed task status and both expected
  after-hook records. If the signed transition is missing, commit the exact
  typed task completion using the driver's idempotent command ID, restore the
  incomplete change to `in-progress`, then rerun `end-task` so its idempotent
  transition can fire the missing hooks. Never hand-edit the signed journal.

## Process inspection and secret-bearing arguments

- Do not use `pgrep -fl`, `ps e`, or other full-command inspection against agent
  runtimes. Their command lines can contain connector credentials. Query a
  specific launchd plist key with `plutil -extract` when only a configured path
  is needed, and never print the key file contents.

## Build diagnostics can serialize inherited credentials

- Tauri/Gradle/Xcode diagnostic failures can include inherited environment
  values in captured output. Remove unrelated registry credentials from child
  environments before platform builds, even when the build is not expected to
  use them.
- For this repository's mobile lanes, unset `CARGO_REGISTRY_TOKEN`, `NPM_TOKEN`,
  and `NODE_AUTH_TOKEN`; never record their values in receipts or postmortems.

## Riverpod operation and graph-invalidation lifetimes

- Reading an auto-disposed generated notifier does not keep it alive across an
  async transport gap. An application controller that orchestrates a CRUD or
  mutation notifier must retain a non-weak `ref.listen` subscription through
  the awaited operation and close it afterward; otherwise the notifier can lose
  its `Ref` before confirmation or rollback.
- `EntityGraph.invalidateEntity` only changes an existing `EntityState`.
  Deterministically seeded transport rows must be marked fetched (or otherwise
  assigned state) before relationship invalidation can make them stale.
- In official GenUI component trees, a Text component referenced as a Button's
  child must not also appear as a sibling in the parent Column; doing both
  renders the action label twice.

## OpenSpec validation after pre-sync

- Once a same-named main spec is synchronized before archive, the shorthand
  `openspec validate <name>` can match both the active change and the promoted
  spec. Validate the change explicitly with `--type change`.
- If that main spec is already synchronized and strictly validated, archive the
  active change with `--skip-specs`; otherwise archive attempts to add the same
  requirement twice. Retain proof of both the explicit change validation and
  the full strict specification pass.

## React view projections must subscribe to entity snapshots

- An ID-only view selector plus `useMemo` over the ID array does not re-render
  when realtime updates replace an existing normalized entity without changing
  list membership. Project rendered items through `useStore` and the cached
  `readEntitySnapshot` identities so both membership and row-content changes
  remain reactive.

## Corepack package-manager integrity needs a fresh-cache control

- A cached pnpm binary can make `corepack pnpm` appear healthy even when the
  `packageManager` SHA-512 suffix is wrong. Certification must resolve the pin
  with a fresh `COREPACK_HOME`; GitHub's clean runner rejected the stale digest
  before any package build could start.

## Changeset version consumes empty documentation changesets

- `changeset version` removes every pending changeset, including an empty
  frontmatter-only record that produces no package bump. During the 3.0.3
  atomic-ingestion version pass it consumed the unrelated tracked
  `certify-nextjs-app-router.md` record.
- Before committing a bounded release change, compare deleted changesets with
  the baseline and restore unrelated empty records byte-for-byte. Package-bump
  output alone does not reveal that historical record loss.

## Atomic ingestion can be undone by projection subscribers

- One atomic entity/list write is insufficient when an entity-bucket
  subscriber reacts by inserting each returned ID into another list. Count
  publications through the complete production hook, not only the core action.
- Put response-owned base projections in the same graph transaction. Keep
  realtime subscribers for independent events, but make the response's success
  snapshot already contain every matching ID so those subscribers have no work.
