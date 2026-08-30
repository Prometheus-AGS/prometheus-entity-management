import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  createGraphDevtoolsClient,
  type GraphDevtoolsClient,
  type GraphDevtoolsResult,
  type GraphDevtoolsTransport,
} from "@prometheus-ags/entity-graph-core/devtools";
import {
  createRemoteEntityGraphInspectorModelStore,
  EntityGraphDevtoolsRemoteProvider,
  EntityGraphInspectorShell,
  ENTITY_GRAPH_DEVTOOLS_STYLES,
  type EntityGraphDevtoolsRemoteConnection,
} from "@prometheus-ags/prometheus-entity-management/devtools";

declare const chrome: any;

type PanelState =
  | { kind: "connecting" | "unavailable"; message: string }
  | { kind: "ready"; connections: EntityGraphDevtoolsRemoteConnection[] };

function connectPanel(onState: (state: PanelState) => void) {
  const tabId = chrome.devtools.inspectedWindow.tabId as number;
  let disposed = false;
  let port: any;
  let reconnectTimer: number | undefined;
  let documentEpoch: string | null = null;
  const pending = new Map<string, { epoch: string; resolve(value: GraphDevtoolsResult): void; reject(error: Error): void }>();
  const eventListeners = new Map<string, Set<(event: any) => void>>();
  const connections: EntityGraphDevtoolsRemoteConnection[] = [];
  const closeConnections = () => {
    for (const connection of connections.splice(0)) {
      connection.model.dispose();
      connection.client.disconnect();
    }
  };
  const open = () => {
    if (disposed) return;
    onState({ kind: "connecting", message: "Connecting to the inspected page…" });
    port = chrome.runtime.connect({ name: "prometheus-entity-graph-panel" });
    let handshakeAttempts = 0;
    let handshakeTimer: number | undefined;
    let handshakeRequestId: string | null = null;
    let handshakeGeneration = 0;
    const requestHandshake = (restart = false) => {
      if (handshakeTimer) clearTimeout(handshakeTimer);
      handshakeTimer = undefined;
      if (restart) {
        handshakeGeneration += 1;
        handshakeAttempts = 0;
        handshakeRequestId = null;
      }
      if (disposed || handshakeRequestId || handshakeAttempts >= 20) return;
      handshakeAttempts += 1;
      handshakeRequestId = crypto.randomUUID();
      port.postMessage({ kind: "panel-connect", tabId, requestId: handshakeRequestId });
    };
    port.onMessage.addListener(async (message: any) => {
      if (message.kind === "available") {
        if (documentEpoch !== message.epoch) {
          documentEpoch = message.epoch;
          closeConnections();
          for (const request of pending.values()) request.reject(new Error("The inspected document changed"));
          pending.clear();
          onState({ kind: "connecting", message: "The inspected page navigated; reconnecting…" });
          requestHandshake(true);
        }
        return;
      }
      if (message.epoch && documentEpoch && message.epoch !== documentEpoch) return;
      if (message.kind === "response") {
        const request = pending.get(message.requestId);
        if (!request) return;
        pending.delete(message.requestId);
        if (message.epoch !== request.epoch) {
          request.reject(new Error("The inspected document changed"));
          return;
        }
        if (message.error) request.reject(new Error(message.error));
        else request.resolve(message.result);
        return;
      }
      if (message.kind === "event") {
        for (const listener of eventListeners.get(message.storeId) ?? []) listener(message.event);
        return;
      }
      if (message.kind !== "handshake" || !Array.isArray(message.stores)) {
        if (message.requestId !== handshakeRequestId) return;
        handshakeRequestId = null;
        onState({ kind: "unavailable", message: "No enabled entity graph was found on this page." });
        handshakeTimer = window.setTimeout(requestHandshake, 500);
        return;
      }
      if (message.requestId !== handshakeRequestId) return;
      handshakeRequestId = null;
      if (handshakeTimer) clearTimeout(handshakeTimer);
      documentEpoch = message.epoch;
      const generation = handshakeGeneration;
      closeConnections();
      const stagedConnections: EntityGraphDevtoolsRemoteConnection[] = [];
      const disposeStaged = () => {
        for (const connection of stagedConnections.splice(0)) {
          connection.model.dispose();
          connection.client.disconnect();
        }
      };
      let initializingClient: GraphDevtoolsClient | null = null;
      try {
        for (const store of message.stores) {
        const transport: GraphDevtoolsTransport = {
          request(command: any) {
            return new Promise((resolve, reject) => {
              if (!documentEpoch) {
                reject(new Error("No inspected document is connected"));
                return;
              }
              pending.set(command.requestId, { epoch: documentEpoch, resolve, reject });
              port.postMessage({ kind: "request", epoch: documentEpoch, ...command });
            });
          },
          subscribe(listener) {
            let listeners = eventListeners.get(store.storeId);
            if (!listeners) eventListeners.set(store.storeId, listeners = new Set());
            listeners.add(listener);
            return () => listeners?.delete(listener);
          },
          close() {
            eventListeners.delete(store.storeId);
          },
        };
          const client = createGraphDevtoolsClient(store.storeId, transport);
          initializingClient = client;
          const model = await createRemoteEntityGraphInspectorModelStore(client);
          if (generation !== handshakeGeneration || message.epoch !== documentEpoch) {
            model.dispose();
            client.disconnect();
            disposeStaged();
            return;
          }
          stagedConnections.push({ storeId: store.storeId, label: store.label, valuePolicyMode: store.valuePolicyMode, client, model });
          initializingClient = null;
        }
      } catch {
        initializingClient?.disconnect();
        disposeStaged();
        if (generation === handshakeGeneration) {
          onState({ kind: "unavailable", message: "The graph bridge is not ready; retrying…" });
          handshakeTimer = window.setTimeout(requestHandshake, 500);
        }
        return;
      }
      if (generation !== handshakeGeneration || message.epoch !== documentEpoch) {
        disposeStaged();
        return;
      }
      connections.push(...stagedConnections.splice(0));
      onState(connections.length > 0
        ? { kind: "ready", connections: [...connections] }
        : { kind: "unavailable", message: "No enabled entity graph was found on this page." });
    });
    port.onDisconnect.addListener(() => {
      handshakeGeneration += 1;
      if (handshakeTimer) clearTimeout(handshakeTimer);
      closeConnections();
      for (const request of pending.values()) request.reject(new Error("Extension worker restarted"));
      pending.clear();
      if (!disposed) reconnectTimer = window.setTimeout(open, 250);
    });
    requestHandshake();
  };
  open();
  return () => {
    disposed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    closeConnections();
    port?.disconnect();
  };
}

function Panel() {
  const [state, setState] = useState<PanelState>({ kind: "connecting", message: "Connecting…" });
  useEffect(() => connectPanel(setState), []);
  if (state.kind !== "ready") {
    return <main className="connection-state" role="status"><h1>Entity Graph DevTools</h1><p>{state.message}</p></main>;
  }
  return (
    <EntityGraphDevtoolsRemoteProvider connections={state.connections}>
      <style>{ENTITY_GRAPH_DEVTOOLS_STYLES}</style>
      <EntityGraphInspectorShell />
    </EntityGraphDevtoolsRemoteProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Panel />);
