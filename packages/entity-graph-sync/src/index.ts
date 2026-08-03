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
 * // Option B: Loro (queued snapshots + reconnect resynchronization)
 * const loroChannel = createWebSocketLoroChannel("ws://localhost:8080");
 * const loroProvider = createLoroProvider({ channel: loroChannel, peerId: 101 });
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
  SyncProviderRegistry,
} from "./types";

// Registry
export {
  registerSyncProvider,
  getSyncProvider,
  getAllSyncProviders,
  getRegisteredSyncTypes,
  getTypesForProvider,
  createSyncProviderRegistry,
  getDefaultSyncProviderRegistry,
  __resetSyncRegistry,
} from "./registry";

// Bridge
export { startSyncBridge, applyPeerChanges } from "./bridge";

// Yjs provider
export { createYjsProvider } from "./providers/yjs-provider";
export type { YjsProviderOptions, YjsTransport } from "./providers/yjs-provider";

// Loro provider
export { createLoroProvider } from "./providers/loro-provider";
export type {
  LoroProviderOptions,
  LoroChannel,
  LoroChannelStatus,
} from "./providers/loro-provider";
export {
  createWebSocketLoroChannel,
  encodeLoroWebSocketMessage,
  decodeLoroWebSocketMessage,
} from "./providers/loro-websocket-channel";
export type {
  LoroWebSocketChannelOptions,
  LoroWebSocketReconnectOptions,
} from "./providers/loro-websocket-channel";
export { createLoroLoopbackNetwork } from "./providers/loro-loopback";
export type {
  LoroLoopbackNetwork,
  LoroLoopbackNetworkOptions,
  LoroLoopbackDeliveryOrder,
} from "./providers/loro-loopback";
