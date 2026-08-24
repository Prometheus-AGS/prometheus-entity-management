import {
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  createPrometheusA2uiRuntime,
} from "@prometheus-ags/a2ui-react";
import type { PrometheusA2UIMessage } from "@prometheus-ags/entity-graph-a2a";
import { agentActionPolicy } from "./action-policy";

export const agentA2uiRuntime = createPrometheusA2uiRuntime({
  actionPolicy: agentActionPolicy,
});

export function processAgentSurface(messages: readonly PrometheusA2UIMessage[]): void {
  agentA2uiRuntime.processMessages(messages);
}

export function clearAgentSurfaces(): void {
  const messages: PrometheusA2UIMessage[] = agentA2uiRuntime
    .getSurfaces()
    .map((surface) => ({
      version: PROMETHEUS_A2UI_PROTOCOL_VERSION,
      deleteSurface: { surfaceId: surface.id },
    }));
  if (messages.length > 0) agentA2uiRuntime.processMessages(messages);
}
