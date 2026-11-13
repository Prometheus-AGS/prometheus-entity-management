# Review round 6 resolution (judge gpt-6.1-sol)

| Finding | Verdict | Action |
|---|---|---|
| chunk-only messages and tool calls never completed | accepted | closeChunks: as in the AG-UI client, a chunked message ends (and a chunked tool call is marked ended) when any other event or a chunk for another id arrives, so RUN_FINISHED completes both |
| root entry eagerly loads DOM classes, breaking plain-Node / SSR imports | accepted (scope: one class) | the only load-time DOM dependency was @a2ui/react's `ReactWcHost extends HTMLElement`; the @a2ui/react patch now uses a guarded base class. Probe: dist/index.mjs and dist/ag-ui.mjs import in plain Node. The jsdom workaround in the export scripts was removed (scripts restored to HEAD) |
