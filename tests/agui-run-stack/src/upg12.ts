/**
 * UPG-12: interrupt approvals through the entity action policy. One EntityChat
 * per case, each on its own conversation and its own `HttpAgent` (so the real
 * client tracks that thread's pending interrupts and checks the resume run
 * covers them). All chats share one graph and one policy built with the
 * package's `createEntityGraphA2uiActionPolicy`; its `onDecision` is the audit.
 */
import { createElement as h, type ReactElement } from "react";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import {
  createEntityGraphA2uiActionPolicy,
  type A2uiActionDecision,
  type EntityGraphA2uiActionName,
} from "@prometheus-ags/a2ui-react";
import { EntityChat, type ChatInterrupt, type ChatResumeEntry, type ChatStreamFactory } from "@prometheus-ags/a2ui-react/ag-ui";
import { agentRunStream, describeRecord, scriptedAgent, type StreamRecord } from "./agent-stream.js";
import { conversationSnapshot, entitySnapshot } from "./graph-probe.js";
import fixtures from "../fixtures.json";

const f = fixtures.upg12;
export const UPG12_CASES = Object.keys(f.cases) as Array<keyof typeof f.cases>;

export interface Upg12Handle {
  element: ReactElement;
  snapshot(): Record<string, unknown>;
}

function conversationOf(caseName: string): string {
  return `upg12-${caseName}`;
}

function describeDecision(decision: A2uiActionDecision): Record<string, unknown> {
  const action = decision.action;
  return {
    status: decision.status,
    name: action?.name ?? null,
    surfaceId: action?.surfaceId ?? null,
    sourceComponentId: action?.sourceComponentId ?? null,
    context: action?.context ?? null,
    ...(decision.status === "denied" ? { code: decision.code, reason: decision.reason } : {}),
  };
}

export function setupUpg12(graph: GraphStore, agentBase: string): Upg12Handle {
  const state = graph.getState();
  for (const seed of f.seed) state.upsertEntity(seed.type, seed.id, seed.data);

  const records: StreamRecord[] = [];
  const audit: Array<Record<string, unknown>> = [];
  const interruptDecisions: Array<Record<string, unknown>> = [];
  const policy = createEntityGraphA2uiActionPolicy({
    graphStore: graph,
    entities: Object.fromEntries(
      Object.entries(f.policy).map(([type, rule]) => [type, {
        actions: rule.actions as EntityGraphA2uiActionName[],
        fields: rule.fields,
      }]),
    ),
    authorize: () => ({ allowed: true }),
    onDecision: (decision) => {
      audit.push({ seq: audit.length, at: performance.now(), ...describeDecision(decision) });
    },
  });

  const chats = UPG12_CASES.map((caseName) => {
    const agent = scriptedAgent(agentBase, `upg12/${caseName}`, conversationOf(caseName));
    const streamFactory: ChatStreamFactory = (history, context) =>
      agentRunStream({ label: `upg12-${caseName}`, agent, history, context, honoursSignal: true, records });
    const onInterruptDecision = (interrupt: ChatInterrupt, entry: ChatResumeEntry, decision?: A2uiActionDecision): void => {
      interruptDecisions.push({
        case: caseName,
        interruptId: interrupt.id,
        entry,
        policyDecision: decision ? describeDecision(decision) : null,
      });
    };
    return h("section", { key: caseName, "data-view": `upg12-${caseName}`, "aria-label": `Interrupt case ${caseName}` },
      h(EntityChat, {
        sessionId: conversationOf(caseName),
        graphStore: graph,
        streamFactory,
        actionPolicy: policy,
        onInterruptDecision,
      }));
  });

  return {
    element: h("div", { className: "agui-run-stack agui-run-stack--upg12" }, ...chats),
    snapshot: () => ({
      entities: Object.fromEntries(f.seed.map((seed) => [`${seed.type}:${seed.id}`, entitySnapshot(graph, seed.type, seed.id)])),
      audit,
      interruptDecisions,
      streams: records.map(describeRecord),
      conversations: Object.fromEntries(UPG12_CASES.map((caseName) => [caseName, conversationSnapshot(graph, conversationOf(caseName))])),
    }),
  };
}
