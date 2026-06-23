/**
 * @prometheus-ags/entity-graph-sync
 *
 * Pluggable peer-sync providers for the entity graph.
 *
 * ## Quick start
 *
 * ```ts
 * import {
 *   createYjsProvider,
 *   createLoroProvider,
 *   createWebSocketLoroChannel,
 *   registerSyncProvider,
 *   startSyncBridge,
 * } from "@prometheus-ags/entity-graph-sync";
 *
 * // Option A: Yjs (WebSocket)
 * const yjsProvider = createYjsProvider({
 *   transport: "websocket",
 *   wsServerUrl: "ws://localhost:1234",
 * });
 * registerSyncProvider({ entityTypes: ["Document"], provider: yjsProvider });
 *
 * // Option B: Loro (binary snapshot over WebSocket channel)
 * const loroChannel = createWebSocketLoroChannel("ws://localhost:8080");
 * const loroProvider = createLoroProvider({ channel: loroChannel });
 * registerSyncProvider({ entityTypes: ["Task"], provider: loroProvider });
 *
 * // Start the bridge — connects all providers and subscribes to the graph.
 * const bridge = await startSyncBridge();
 *
 * // …on cleanup:
 * bridge.stop();
 * ```
 */

// Core types
export type {
  SyncProvider,
  PeerEntityChange,
  PeerChangeHandler,
  RegisterSyncProviderOptions,
  SyncBridgeOptions,
  SyncBridgeHandle,
} from "./types";

// Registry
export {
  registerSyncProvider,
  getSyncProvider,
  getAllSyncProviders,
  getRegisteredSyncTypes,
  getTypesForProvider,
  __resetSyncRegistry,
} from "./registry";

// Bridge
export { startSyncBridge, applyPeerChanges } from "./bridge";

// Yjs provider
export { createYjsProvider } from "./providers/yjs-provider";
export type { YjsProviderOptions, YjsTransport } from "./providers/yjs-provider";

// Loro provider
export { createLoroProvider, createWebSocketLoroChannel } from "./providers/loro-provider";
export type { LoroProviderOptions, LoroChannel } from "./providers/loro-provider";
