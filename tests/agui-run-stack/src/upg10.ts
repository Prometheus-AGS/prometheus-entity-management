/**
 * UPG-10: an AG-UI 1.0 run streamed by @ag-ui/client drives EntityChat through
 * the graph. Three views share one graph:
 * - `chat`   EntityChat on the conversation the user talks in;
 * - `mirror` a second EntityChat on the SAME conversation id (it never sends);
 * - `other`  EntityChat on a DIFFERENT conversation id (the negative control),
 *            which later sends its own probe run to show it renders live.
 */
import { createElement as h, type ReactElement } from "react";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import { EntityChat, type ChatStreamFactory } from "@prometheus-ags/a2ui-react/ag-ui";
import { agentRunStream, describeRecord, scriptedAgent, type StreamRecord } from "./agent-stream.js";
import { conversationSnapshot } from "./graph-probe.js";
import fixtures from "../fixtures.json";

const f = fixtures.upg10;

export interface Upg10Handle {
  element: ReactElement;
  snapshot(): Record<string, unknown>;
}

export function setupUpg10(graph: GraphStore, agentBase: string): Upg10Handle {
  const records: StreamRecord[] = [];
  const mirrorCalls: number[] = [];
  const mainAgent = scriptedAgent(agentBase, "upg10", f.conversationId);
  const probeAgent = scriptedAgent(agentBase, "upg10-probe", f.otherConversationId);

  const mainFactory: ChatStreamFactory = (history, context) =>
    agentRunStream({ label: "main", agent: mainAgent, history, context, honoursSignal: true, records });
  const probeFactory: ChatStreamFactory = (history, context) =>
    agentRunStream({ label: "probe", agent: probeAgent, history, context, honoursSignal: true, records });
  // The mirror only reads; a call here would mean the second view started a run.
  const mirrorFactory: ChatStreamFactory = () => {
    mirrorCalls.push(performance.now());
    throw new Error("the mirror view must not start a run");
  };

  const element = h(
    "div",
    { className: "agui-run-stack agui-run-stack--upg10" },
    h("section", { "data-view": "chat", "aria-label": "Chat view" },
      h(EntityChat, { sessionId: f.conversationId, graphStore: graph, streamFactory: mainFactory })),
    h("section", { "data-view": "mirror", "aria-label": "Second view of the same conversation" },
      h(EntityChat, { sessionId: f.conversationId, graphStore: graph, streamFactory: mirrorFactory })),
    h("section", { "data-view": "other", "aria-label": "View of a different conversation" },
      h(EntityChat, { sessionId: f.otherConversationId, graphStore: graph, streamFactory: probeFactory })),
  );

  return {
    element,
    snapshot: () => ({
      graph: {
        main: conversationSnapshot(graph, f.conversationId),
        other: conversationSnapshot(graph, f.otherConversationId),
      },
      streams: records.map(describeRecord),
      mirrorFactoryCalls: mirrorCalls.length,
    }),
  };
}
