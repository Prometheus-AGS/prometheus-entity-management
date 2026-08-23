import {
  HTTP_EXTENSION_HEADER,
  PROMETHEUS_A2UI_EXTENSION_URI,
  buildAgentCard,
  createA2AServer,
  createExternalA2AExecutor,
} from "@prometheus-ags/entity-graph-a2a";
import { SharedDomainReferenceAgent } from "./reference-agent";
import type { AgentTransportConfiguration } from "./types";

export const LOCAL_A2A_ENDPOINT = "http://localhost/a2a";

const configuredExternalEndpoint = import.meta.env.VITE_EXTERNAL_A2A_URL?.trim();

export const agentTransportConfiguration: AgentTransportConfiguration =
  configuredExternalEndpoint
    ? { mode: "external", endpoint: configuredExternalEndpoint }
    : { mode: "deterministic", endpoint: LOCAL_A2A_ENDPOINT };

const executor = configuredExternalEndpoint
  ? createExternalA2AExecutor({
      baseUrl: configuredExternalEndpoint,
      serviceParameters: {
        [HTTP_EXTENSION_HEADER]: PROMETHEUS_A2UI_EXTENSION_URI,
      },
    })
  : new SharedDomainReferenceAgent();

export const agentServer = createA2AServer({
  card: buildAgentCard({ url: LOCAL_A2A_ENDPOINT }),
  executor,
});
