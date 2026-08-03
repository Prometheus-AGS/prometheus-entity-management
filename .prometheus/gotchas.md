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
