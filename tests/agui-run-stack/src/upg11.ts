/**
 * UPG-11: cancellation stops superseded streams. Two conversations on one
 * graph, each driven by `useChatSession` (EntityChat disables its input while a
 * run is in flight, so the second send needs the hook):
 * - `superseded` (conversation X): "send first" starts the slow stream A,
 *   "send second" supersedes it with stream B;
 * - `control` (conversation Y): stream C runs alongside and is never superseded.
 *
 * A graph write counter attributes every chat message write to its stream by
 * message id. The spec releases the agent's gate after the second send, so A and
 * C both emit their later events; A's must cause zero writes, C's must write.
 */
import { createElement as h, type ReactElement } from "react";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import { useChatSession, type ChatMessage, type ChatStreamFactory } from "@prometheus-ags/a2ui-react/ag-ui";
import { agentRunStream, describeRecord, scriptedAgent, type StreamRecord } from "./agent-stream.js";
import { conversationSnapshot, countMessageWrites } from "./graph-probe.js";
import fixtures from "../fixtures.json";

const f = fixtures.upg11;

export interface Upg11Handle {
  element: ReactElement;
  snapshot(): Record<string, unknown>;
  dispose(): void;
}

function bucketOf(_conversationId: string, messageId: string): string {
  if (messageId.startsWith("a-")) return "first";
  if (messageId.startsWith("b-")) return "second";
  if (messageId.startsWith("c-")) return "control";
  return "user";
}

function MessageList({ messages }: { messages: ChatMessage[] }): ReactElement {
  return h(
    "ol",
    { className: "agui-run-stack__messages" },
    ...messages.map((message) =>
      h("li", { key: message.id, "data-message-id": message.id, "data-role": message.role }, message.content)),
  );
}

export function setupUpg11(graph: GraphStore, agentBase: string): Upg11Handle {
  const records: StreamRecord[] = [];
  const counter = countMessageWrites(graph, bucketOf);
  const marks: { supersede: { seq: number; at: number } | null } = { supersede: null };
  let supersededCalls = 0;

  const supersededFactory: ChatStreamFactory = (history, context) => {
    supersededCalls += 1;
    const first = supersededCalls === 1;
    return agentRunStream({
      label: first ? "first" : "second",
      agent: scriptedAgent(agentBase, first ? "upg11-a" : "upg11-b", f.supersededConversationId),
      history,
      context,
      honoursSignal: !first,
      records,
    });
  };
  const controlFactory: ChatStreamFactory = (history, context) =>
    agentRunStream({
      label: "control",
      agent: scriptedAgent(agentBase, "upg11-c", f.controlConversationId),
      history,
      context,
      honoursSignal: true,
      records,
    });

  function Harness(): ReactElement {
    const superseded = useChatSession({ sessionId: f.supersededConversationId, graphStore: graph, streamFactory: supersededFactory });
    const control = useChatSession({ sessionId: f.controlConversationId, graphStore: graph, streamFactory: controlFactory });
    return h(
      "div",
      { className: "agui-run-stack agui-run-stack--upg11" },
      h("section", { "data-view": "superseded", "data-run-status": superseded.session.runStatus, "aria-label": "Superseded conversation" },
        h("button", { type: "button", id: "send-first", onClick: () => void superseded.sendMessage(f.first.userText) }, "Send first"),
        h("button", {
          type: "button",
          id: "send-second",
          onClick: () => {
            // The time is taken before sendMessage aborts the first run's signal. The write mark is
            // taken after sendMessage's synchronous part, which settles the abandoned message
            // (streaming -> false) and adds the new user message; no event of the first stream can
            // run in between, so every later write to its message is caused by its own events.
            const at = performance.now();
            void superseded.sendMessage(f.second.userText);
            marks.supersede = { seq: counter.writes.length, at };
          },
        }, "Send second"),
        h(MessageList, { messages: superseded.session.messages })),
      h("section", { "data-view": "control", "data-run-status": control.session.runStatus, "aria-label": "Control conversation" },
        h("button", { type: "button", id: "send-control", onClick: () => void control.sendMessage(f.control.userText) }, "Send control"),
        h(MessageList, { messages: control.session.messages })),
    );
  }

  return {
    element: h(Harness),
    snapshot: () => {
      const supersede = marks.supersede;
      return {
        supersede,
        writes: counter.writes,
        writesBeforeSupersede: supersede ? countBuckets(counter.writes.slice(0, supersede.seq)) : null,
        writesAfterSupersede: supersede ? counter.countsSince(supersede.seq) : null,
        streams: records.map(describeRecord),
        graph: {
          superseded: conversationSnapshot(graph, f.supersededConversationId),
          control: conversationSnapshot(graph, f.controlConversationId),
        },
      };
    },
    dispose: () => {
      for (const record of records) record.dispose();
      counter.stop();
    },
  };
}

function countBuckets(writes: ReadonlyArray<{ bucket: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const write of writes) counts[write.bucket] = (counts[write.bucket] ?? 0) + 1;
  return counts;
}
