# Gotchas

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
