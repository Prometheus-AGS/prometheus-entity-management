import type { EntityType } from "@prometheus-ags/entity-graph-core";
import type {
  LoroChannel,
  LoroChannelStatus,
} from "./loro-provider";

const SYNC_REQUEST_FRAME = new Uint8Array([0]).buffer;

export interface LoroWebSocketReconnectOptions {
  /** Automatically reconnect after an unexpected close. @default true */
  enabled?: boolean;
  /** First reconnect delay. @default 100 */
  initialDelayMs?: number;
  /** Maximum reconnect delay. @default 5000 */
  maxDelayMs?: number;
  /** Maximum attempts; `Infinity` keeps retrying. @default Infinity */
  maxAttempts?: number;
}

export interface LoroWebSocketChannelOptions {
  reconnect?: LoroWebSocketReconnectOptions;
  /** Injectable constructor used by deterministic transport tests. */
  webSocketConstructor?: typeof WebSocket;
  /** Receives transport errors; errors are never silently discarded. */
  onError?: (error: Error) => void;
}

interface DecodedMessage {
  type: EntityType;
  bytes: Uint8Array;
}

function cloneBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

/** Encode the stable relay frame `[type length][UTF-8 type][snapshot]`. */
export function encodeLoroWebSocketMessage(
  type: EntityType,
  bytes: Uint8Array,
): ArrayBuffer {
  const typeBytes = new TextEncoder().encode(type);
  if (typeBytes.length > 255) {
    throw new Error("[entity-graph-sync/loro] entity type exceeds 255 UTF-8 bytes.");
  }
  const out = new Uint8Array(1 + typeBytes.length + bytes.length);
  out[0] = typeBytes.length;
  out.set(typeBytes, 1);
  out.set(bytes, 1 + typeBytes.length);
  return out.buffer;
}

/** Decode one relay frame, rejecting malformed or empty type names. */
export function decodeLoroWebSocketMessage(raw: Uint8Array): DecodedMessage | null {
  if (raw.length < 2) return null;
  const typeLength = raw[0];
  if (typeLength === 0 || raw.length < 1 + typeLength) return null;
  const type = new TextDecoder().decode(raw.slice(1, 1 + typeLength));
  return { type, bytes: raw.slice(1 + typeLength) };
}

async function eventBytes(data: unknown): Promise<Uint8Array> {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return new Uint8Array(await data.arrayBuffer());
  }
  throw new Error(
    `[entity-graph-sync/loro] unsupported WebSocket message type: ${typeof data}`,
  );
}

/**
 * Create a lossless reconnecting WebSocket channel for full Loro snapshots.
 *
 * Local sends always update an in-memory latest-snapshot cache. Writes made
 * while disconnected are flushed on open. Every connection also broadcasts a
 * sync-request control frame; connected peers answer it with their cached
 * snapshots, recovering remote writes missed during the outage. The relay
 * server remains transport-only and need not understand the frame.
 */
export function createWebSocketLoroChannel(
  url: string,
  options: LoroWebSocketChannelOptions = {},
): LoroChannel {
  const WebSocketCtor = options.webSocketConstructor ?? globalThis.WebSocket;
  if (!WebSocketCtor) {
    throw new Error(
      "[entity-graph-sync/loro] WebSocket is unavailable; provide webSocketConstructor.",
    );
  }

  const reconnectEnabled = options.reconnect?.enabled ?? true;
  const initialDelayMs = options.reconnect?.initialDelayMs ?? 100;
  const maxDelayMs = options.reconnect?.maxDelayMs ?? 5_000;
  const maxAttempts = options.reconnect?.maxAttempts ?? Number.POSITIVE_INFINITY;
  if (initialDelayMs < 0 || maxDelayMs < initialDelayMs || maxAttempts < 0) {
    throw new Error("[entity-graph-sync/loro] invalid reconnect policy.");
  }

  const receiveListeners = new Set<(type: EntityType, bytes: Uint8Array) => void>();
  const statusListeners = new Set<(status: LoroChannelStatus) => void>();
  const latestByType = new Map<EntityType, Uint8Array>();
  const pendingByType = new Map<EntityType, Uint8Array>();

  let socket: WebSocket | null = null;
  let status: LoroChannelStatus = "idle";
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  let explicitlyDisconnected = false;

  function setStatus(next: LoroChannelStatus): void {
    if (status === next) return;
    status = next;
    for (const listener of statusListeners) listener(next);
  }

  function report(cause: unknown): Error {
    const error =
      cause instanceof Error
        ? cause
        : new Error(`[entity-graph-sync/loro] WebSocket failure: ${String(cause)}`);
    options.onError?.(error);
    return error;
  }

  function sendFrame(type: EntityType, bytes: Uint8Array): boolean {
    if (!socket || socket.readyState !== WebSocketCtor.OPEN) return false;
    socket.send(encodeLoroWebSocketMessage(type, bytes));
    return true;
  }

  function flushPending(): void {
    for (const [type, bytes] of Array.from(pendingByType)) {
      if (!sendFrame(type, bytes)) return;
      pendingByType.delete(type);
    }
  }

  function answerSyncRequest(): void {
    for (const [type, bytes] of latestByType) sendFrame(type, bytes);
  }

  function sendSyncRequest(): void {
    if (socket?.readyState === WebSocketCtor.OPEN) socket.send(SYNC_REQUEST_FRAME.slice(0));
  }

  function scheduleReconnect(): void {
    if (
      explicitlyDisconnected ||
      !reconnectEnabled ||
      reconnectTimer ||
      reconnectAttempts >= maxAttempts
    ) {
      if (!explicitlyDisconnected && reconnectAttempts >= maxAttempts) {
        setStatus("error");
        report(new Error("[entity-graph-sync/loro] WebSocket reconnect attempts exhausted."));
      }
      return;
    }

    const delay = Math.min(initialDelayMs * 2 ** reconnectAttempts, maxDelayMs);
    reconnectAttempts += 1;
    setStatus("reconnecting");
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void openSocket(true).catch(() => {
        scheduleReconnect();
      });
    }, delay);
  }

  function openSocket(reconnecting: boolean): Promise<void> {
    setStatus(reconnecting ? "reconnecting" : "connecting");
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const nextSocket = new WebSocketCtor(url);
      socket = nextSocket;
      nextSocket.binaryType = "arraybuffer";

      nextSocket.addEventListener("open", () => {
        settled = true;
        reconnectAttempts = 0;
        setStatus("connected");
        flushPending();
        sendSyncRequest();
        resolve();
      });
      nextSocket.addEventListener("message", (event: MessageEvent) => {
        void eventBytes(event.data)
          .then((raw) => {
            // A one-byte zero frame is outside the entity frame grammar because
            // entity type names must be non-empty. It therefore cannot collide
            // with a consumer-owned EntityType.
            if (raw.length === 1 && raw[0] === 0) {
              answerSyncRequest();
              return;
            }
            const decoded = decodeLoroWebSocketMessage(raw);
            if (!decoded) throw new Error("[entity-graph-sync/loro] malformed WebSocket frame.");
            for (const listener of receiveListeners) {
              listener(decoded.type, cloneBytes(decoded.bytes));
            }
          })
          .catch((error) => report(error));
      });
      nextSocket.addEventListener("error", (event) => {
        const error = report(
          new Error(`[entity-graph-sync/loro] WebSocket connection failed: ${String(event)}`),
        );
        if (!settled) {
          settled = true;
          reject(error);
        }
      });
      nextSocket.addEventListener("close", () => {
        if (socket === nextSocket) socket = null;
        if (explicitlyDisconnected) {
          setStatus("disconnected");
          return;
        }
        if (!settled) {
          settled = true;
          reject(new Error("[entity-graph-sync/loro] WebSocket closed before opening."));
        }
        scheduleReconnect();
      });
    });
  }

  return {
    async connect() {
      if (status === "connected") return;
      explicitlyDisconnected = false;
      reconnectAttempts = 0;
      await openSocket(false);
    },
    send(type, bytes) {
      const snapshot = cloneBytes(bytes);
      latestByType.set(type, snapshot);
      if (!sendFrame(type, snapshot)) pendingByType.set(type, snapshot);
    },
    onReceive(handler) {
      receiveListeners.add(handler);
      return () => {
        receiveListeners.delete(handler);
      };
    },
    disconnect() {
      explicitlyDisconnected = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      socket?.close();
      socket = null;
      setStatus("disconnected");
    },
    getStatus() {
      return status;
    },
    onStatusChange(handler) {
      statusListeners.add(handler);
      return () => {
        statusListeners.delete(handler);
      };
    },
  };
}
