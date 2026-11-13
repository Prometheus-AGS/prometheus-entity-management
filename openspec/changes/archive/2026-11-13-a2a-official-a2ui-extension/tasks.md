## Tasks

Model assignments for these tasks: see the **Task model assignments** table in `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`,
rows keyed `phase-a2ui-1-0-agui-upgrade` / `a2a-official-a2ui-extension` / `a2a-official-a2ui-extension#<n>`.

- [x] 5.1 Map `@a2a-js/sdk` 1.0.1→1.3.0 changes, bump it in `entity-graph-a2a`, and update the SDK pins in the packed-consumer scripts
- [x] 5.2 Replace the private extension URI and media type with the official ones and carry A2UI 1.0 payloads
- [x] 5.3 Send and honour per-turn renderer capabilities and omit A2UI parts when the extension is not activated
- [x] 5.4 Accept inbound A2UI 1.0 action and function messages from clients and route them to an application-owned handler behind a framework-free authorization callback in `entity-graph-a2a` (no dependency on the React package's policy), defaulting to deny
- [x] 5.5 Update `verify-a2a-conformance.mjs` to build surfaces from received parts with the packed headless runtime and take its report path as an argument, and write the `v3-a2a-conformance-agent` spec delta
