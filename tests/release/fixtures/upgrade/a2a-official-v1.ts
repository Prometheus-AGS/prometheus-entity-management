/**
 * Upgrade fixture: alpha-to-stable — official A2A v1 server boundary.
 *
 * Proves the "after" state of the migration documented in
 * site/docs/migration/alpha-to-stable.mdx ("A2A protocol surface"): agent
 * discovery moves to the official agent-card path, slash methods
 * (`tasks/send`, `tasks/get`, `tasks/cancel`) are replaced by the official v1
 * lifecycle (`SendMessage`, `GetTask`, `CancelTask`, …), and the server is
 * composed from the official root exports. Shape mirrors the certified
 * reference in
 * prometheus-entity-skills/_shared/references/a2a-conformance-agent.md.
 */
import {
  AGENT_CARD_PATH,
  buildAgentCard,
  createA2AServer,
  createEntityGraphA2APolicy,
} from "@prometheus-ags/entity-graph-a2a";

// After: discovery is served at the official v1 agent-card path.
export const agentCardPath = AGENT_CARD_PATH;

const policy = createEntityGraphA2APolicy({
  entities: {
    Task: {
      actions: ["upsert", "replace", "remove", "query"],
      fields: ["id", "title", "status", "projectId"],
    },
  },
  authorize: ({ caller }) => caller.isAuthenticated,
  requestApproval: ({ operation }) => ({
    allowed: operation !== "replace" && operation !== "remove",
  }),
});

export const a2aServer = createA2AServer({
  card: buildAgentCard({ url: "https://api.example.com/a2a" }),
  policy,
});
