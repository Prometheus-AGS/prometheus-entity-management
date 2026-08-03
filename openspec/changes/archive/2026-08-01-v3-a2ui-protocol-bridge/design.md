# Design: v3-a2ui-protocol-bridge

## Candidate reuse decisions

### cand-003 — Official A2UI web stack (@a2ui/react + @a2ui/web_core)

- **Verdict:** adopt
- **Decision:** Adopt the maintained 0.10.x package distributions, target their documented v0.9.1/current-production protocol entry point, and keep v1.0 candidate support behind a version adapter. Prometheus should own only graph projection, transport, policy, and themed catalog integration.
- **Evidence:**
  - Tier 3: The official React renderer was published as 0.10.2 from a2ui-project/a2ui. (https://www.npmjs.com/package/@a2ui/react)
  - Tier 4: Official guidance says web renderers should reuse web_core for JSONL parsing, schemas, surface state, data binding, and actions instead of reimplementing roughly 3,000 lines. (https://a2ui.org/guides/renderer-development/)
  - Tier 4: The version-aware official guide labels protocol v0.9.1 current production, v0.9 previous stable, and v1.0 candidate; the 0.10.x npm distribution version is a separate version axis. (https://a2ui.org/guides/renderer-development/)

### cand-004 — Existing @prometheus-ags/a2ui-react alpha

- **Verdict:** adapt
- **Decision:** Rebuild the package root as a thin official-A2UI integration. Move reusable AG-UI projection and approval behavior to the explicitly named `@prometheus-ags/a2ui-react/ag-ui` compatibility subpath before stable release. A separately published AG-UI package is excluded from this change because the completed release contract freezes a twelve-package inventory with only one A2UI artifact; adding a thirteenth artifact would require a separately governed contract amendment.
- **Evidence:**
  - Tier 1: The package consumes MESSAGE_* and STATE_* AG-UI-style events and has no A2UI surface/catalog/data-model protocol implementation. (https://github.com/Prometheus-AGS/prometheus-entity-management/tree/main/packages/a2ui-react/src)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

## Implemented package boundary

- The stable wire target is A2UI `v0.9.1`; the npm distribution versions are independently pinned to `@a2ui/react@0.10.2` and `@a2ui/web_core@0.10.5`.
- Root code imports only the explicit `/v0_9` official entry points. The official engine is bundled into ESM and CommonJS artifacts because `@a2ui/web_core` publishes an ESM-only runtime while this repository's package contract requires both formats.
- The official `MessageProcessor`, schemas, surface/data models, catalog, binder, and React surface remain authoritative. Prometheus adds exact-version enforcement, catalog/component allowlisting, React lifecycle subscription, default-deny application policy, and entity-graph projection.
- The default Prometheus catalog excludes the official `openUrl` function. Applications may opt it in explicitly, but navigation is never silently added to the stable allowlist.
- Built-in graph actions require explicit entity/action/field allowlists and an application authorization callback. Replace and remove additionally require approval. Agent-supplied context cannot self-assert approval.
