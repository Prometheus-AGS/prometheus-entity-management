/**
 * The three examples migrated to A2UI 1.0 final, as UPG-14 drives them.
 *
 * `port` is a scratch preview port not used by any other
 * `tests/browser/*.playwright.config.ts`. `requiredSource` names the capture
 * source that must hold envelopes for the example's own producer to count as
 * observed (see `page-tap.mjs` and the spec's SSE tap for the lab).
 */
export const A2UI_EXAMPLES = Object.freeze([
  Object.freeze({
    id: "agentic-a2ui-app",
    packageName: "prometheus-agentic-a2ui-example",
    directory: "examples/agentic-a2ui-app",
    port: 4201,
    fixture: "agentic-a2ui-app.json",
    producer: "in-browser A2A reference agent (reference-agent.ts) streamed over the in-page A2A server",
    requiredSource: "a2a-sse",
  }),
  Object.freeze({
    id: "agentic-a2ui",
    packageName: "prometheus-entity-management-agentic-a2ui",
    directory: "examples/agentic-a2ui",
    port: 4202,
    fixture: "agentic-a2ui.json",
    producer: "in-browser surface planner (src/agent/surface-messages.ts) fed to the A2UI runtime",
    requiredSource: "runtime-input",
  }),
  Object.freeze({
    id: "agui-activity-lab",
    packageName: "prometheus-agui-activity-lab-example",
    directory: "examples/agui-activity-lab",
    port: 4203,
    fixture: "agui-activity-lab.json",
    producer: "Node AG-UI activity producer (server/producer.ts) emitting server/events.ts operations",
    requiredSource: "agui-activity-stream",
  }),
]);

export const PRE_MIGRATION_FIXTURE_DIRECTORY = "tests/fixtures/a2ui-1-0-migration/pre-migration";
