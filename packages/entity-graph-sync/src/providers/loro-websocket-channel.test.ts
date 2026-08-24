import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createWebSocketLoroChannel,
  decodeLoroWebSocketMessage,
} from "./loro-websocket-channel";

type Listener = (event: Event | MessageEvent) => void;

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readonly sent: ArrayBuffer[] = [];
  readonly url: string;
  binaryType = "blob";
  readyState = FakeWebSocket.CONNECTING;
  private listeners = new Map<string, Set<Listener>>();

  constructor(url: string | URL) {
    this.url = String(url);
    FakeWebSocket.instances.push(this);
    queueMicrotask(() => this.open());
  }

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error("socket is not open");
    if (!(data instanceof ArrayBuffer)) throw new Error("expected ArrayBuffer");
    this.sent.push(data.slice(0));
  }

  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.emit("close", new Event("close"));
  }

  serverClose(): void {
    this.close();
  }

  serverMessage(data: ArrayBuffer): void {
    this.emit("message", new MessageEvent("message", { data }));
  }

  private open(): void {
    if (this.readyState !== FakeWebSocket.CONNECTING) return;
    this.readyState = FakeWebSocket.OPEN;
    this.emit("open", new Event("open"));
  }

  private emit(type: string, event: Event | MessageEvent): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }
}

afterEach(() => {
  vi.useRealTimers();
  FakeWebSocket.instances = [];
});

function frameTypes(socket: FakeWebSocket): string[] {
  return socket.sent.map((frame) => {
    const raw = new Uint8Array(frame);
    if (raw.length === 1 && raw[0] === 0) return "<sync-request>";
    const decoded = decodeLoroWebSocketMessage(raw);
    if (!decoded) throw new Error("malformed test frame");
    return decoded.type;
  });
}

describe("lossless Loro WebSocket channel", () => {
  it("flushes disconnected writes and requests peer state on first connect", async () => {
    const channel = createWebSocketLoroChannel("ws://relay.test", {
      webSocketConstructor: FakeWebSocket as unknown as typeof WebSocket,
    });
    channel.send("Task", new Uint8Array([1, 2, 3]));

    await channel.connect?.();
    const socket = FakeWebSocket.instances[0];
    expect(frameTypes(socket)).toEqual(["Task", "<sync-request>"]);
    expect(channel.getStatus?.()).toBe("connected");
  });

  it("retains an offline write across an unexpected close and reconnect", async () => {
    vi.useFakeTimers();
    const channel = createWebSocketLoroChannel("ws://relay.test", {
      webSocketConstructor: FakeWebSocket as unknown as typeof WebSocket,
      reconnect: { initialDelayMs: 10, maxDelayMs: 10, maxAttempts: 2 },
    });
    await channel.connect?.();
    FakeWebSocket.instances[0].serverClose();
    channel.send("Task", new Uint8Array([9, 8, 7]));

    await vi.advanceTimersByTimeAsync(10);
    const reconnected = FakeWebSocket.instances[1];
    expect(reconnected).toBeDefined();
    expect(frameTypes(reconnected)).toEqual([
      "Task",
      "<sync-request>",
    ]);
    expect(channel.getStatus?.()).toBe("connected");
  });

  it("answers a peer sync request with every latest local snapshot", async () => {
    const errors: Error[] = [];
    const channel = createWebSocketLoroChannel("ws://relay.test", {
      webSocketConstructor: FakeWebSocket as unknown as typeof WebSocket,
      onError: (error) => errors.push(error),
    });
    await channel.connect?.();
    const socket = FakeWebSocket.instances[0];
    channel.send("Task", new Uint8Array([4, 5, 6]));
    const before = socket.sent.length;

    socket.serverMessage(new Uint8Array([0]).buffer);
    await Promise.resolve();
    await Promise.resolve();

    expect(socket.sent).toHaveLength(before + 1);
    expect(frameTypes(socket).at(-1)).toBe("Task");
    expect(errors).toEqual([]);
  });
});
