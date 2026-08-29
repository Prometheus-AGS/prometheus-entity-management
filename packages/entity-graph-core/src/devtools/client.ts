import {
  GRAPH_DEVTOOLS_PROTOCOL,
  GRAPH_DEVTOOLS_PROTOCOL_VERSION,
  type GraphDevtoolsCommandName,
  type GraphDevtoolsEvent,
  type GraphDevtoolsResult,
  type GraphDevtoolsTransport,
} from "./protocol";

export interface GraphDevtoolsClient {
  readonly storeId: string;
  request(command: GraphDevtoolsCommandName): Promise<GraphDevtoolsResult>;
  subscribe(listener: (event: GraphDevtoolsEvent) => void): () => void;
  disconnect(): void;
}

let nextRequest = 1;

/** Protocol client that depends only on a transport, not Zustand or a UI runtime. */
export function createGraphDevtoolsClient(
  storeId: string,
  transport: GraphDevtoolsTransport,
): GraphDevtoolsClient {
  let disconnected = false;
  return {
    storeId,
    request(command) {
      const requestId = `request-${nextRequest++}`;
      return transport.request({
        protocol: GRAPH_DEVTOOLS_PROTOCOL,
        version: GRAPH_DEVTOOLS_PROTOCOL_VERSION,
        requestId,
        storeId,
        command,
      });
    },
    subscribe(listener) {
      if (disconnected) return () => {};
      return transport.subscribe(listener);
    },
    disconnect() {
      if (disconnected) return;
      disconnected = true;
      transport.close();
    },
  };
}
