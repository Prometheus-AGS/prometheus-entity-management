/**
 * devtools-event-bus — W5 (seim-em-explorer-event-bus-registry)
 *
 * Ring-buffered, fan-out event bus on top of the W3 `subscribeDevtoolsEvent` tap.
 * Adds: replay-on-subscribe, microtask-level burst coalescing, multi-store registry.
 */

import { subscribeDevtoolsEvent, type DevtoolsEvent } from "./engine";

// ── Public types ───────────────────────────────────────────────────────────────

export interface DevtoolsEventBusOptions {
  /** Maximum events retained in the ring buffer. Default: 500. */
  bufferSize?: number;
  /**
   * Events 1..N (N = threshold) are dispatched individually as they arrive.
   * Events N+1.. accumulate until the end of the microtask, then are coalesced
   * into one synthetic `kind:"list"` summary event.
   * Default: 10. Set to 0 to disable coalescing entirely.
   */
  coalesceBurstThreshold?: number;
}

export interface DevtoolsEventBus {
  /** Subscribe to live events. Replays current buffer synchronously before returning. */
  subscribe(cb: (event: DevtoolsEvent) => void): () => void;
  /** Snapshot of buffered events in chronological order (oldest first). */
  getBuffer(): readonly DevtoolsEvent[];
  /** Force-dispatch any pending coalesced burst synchronously. */
  flush(): void;
  /** Release engine-tap, clear all subscribers, cascade inactive to registry. */
  destroy(): void;
}

/** Matches the signature of `subscribeDevtoolsEvent` — used for external sources. */
export type DevtoolsSourceFn = (cb: (event: DevtoolsEvent) => void) => () => void;

export interface RegisteredStore {
  name: string;
  active: boolean;
}

// ── Module-level state ─────────────────────────────────────────────────────────

/** Maps bus → its internal inject function (for registerStore routing). */
const _busInjectMap = new WeakMap<DevtoolsEventBus, (event: DevtoolsEvent) => void>();

interface RegistryEntry {
  name: string;
  active: boolean;
  bus: DevtoolsEventBus;
  unsubscribeSrc: () => void;
}
const registry = new Map<string, RegistryEntry>();

/** @internal Test-only. NOT re-exported from index.ts. */
export function __resetStoreRegistry(): void {
  registry.clear();
}

// ── Factory ────────────────────────────────────────────────────────────────────

export function createDevtoolsEventBus(opts?: DevtoolsEventBusOptions): DevtoolsEventBus {
  const bufferSize = opts?.bufferSize ?? 500;
  const threshold = opts?.coalesceBurstThreshold ?? 10;

  // ── Ring buffer ──────────────────────────────────────────────────────────
  const buffer: DevtoolsEvent[] = bufferSize > 0 ? new Array<DevtoolsEvent>(bufferSize) : [];
  let head = 0;
  let count = 0;

  function writeToBuffer(event: DevtoolsEvent): void {
    if (bufferSize === 0) return;
    buffer[head] = event;
    head = (head + 1) % bufferSize;
    if (count < bufferSize) count++;
  }

  function getBuffer(): readonly DevtoolsEvent[] {
    if (count === 0) return [];
    if (count < bufferSize) return buffer.slice(0, count);
    return [...buffer.slice(head), ...buffer.slice(0, head)];
  }

  // ── Subscribers ──────────────────────────────────────────────────────────
  const subscribers = new Set<(event: DevtoolsEvent) => void>();

  function dispatchToSubscribers(event: DevtoolsEvent): void {
    const snap = [...subscribers];
    for (const cb of snap) {
      try { cb(event); } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[devtools-event-bus] subscriber threw:", err);
      }
    }
  }

  function dispatchOne(event: DevtoolsEvent): void {
    writeToBuffer(event);
    dispatchToSubscribers(event);
  }

  // ── Burst coalescing ──────────────────────────────────────────────────────
  // Events 1..threshold arrive → dispatch immediately + track in pendingBurst.
  // Events threshold+1.. arrive → accumulate in pendingBurst, schedule microtask.
  // flush() → coalesce undispatched remainder into kind:"list", reset state.
  let pendingBurst: DevtoolsEvent[] = [];
  let dispatchedCount = 0; // how many from pendingBurst have already been dispatched
  let flushScheduled = false;
  let destroyed = false;

  function flush(): void {
    if (pendingBurst.length === 0) { flushScheduled = false; return; }
    const burst = pendingBurst;
    const alreadySent = dispatchedCount;
    pendingBurst = [];
    dispatchedCount = 0;
    flushScheduled = false;

    const remaining = burst.slice(alreadySent);
    if (remaining.length === 0) return;

    if (threshold === 0 || burst.length <= threshold) {
      // All fit within threshold — no coalescing needed
      for (const ev of remaining) dispatchOne(ev);
    } else {
      // Fill individual slots first (in case some below-threshold slots weren't sent)
      const individualSlots = Math.max(0, threshold - alreadySent);
      const toDispatchIndividually = remaining.slice(0, individualSlots);
      const toCoalesce = remaining.slice(individualSlots);
      for (const ev of toDispatchIndividually) dispatchOne(ev);
      if (toCoalesce.length > 0) {
        dispatchOne({
          kind: "list",
          key: "burst-coalesce",
          idCount: toCoalesce.length,
          at: new Date().toISOString(),
        });
      }
    }
  }

  function handleEngineEvent(event: DevtoolsEvent): void {
    if (destroyed) return;
    if (threshold === 0) { dispatchOne(event); return; }

    pendingBurst.push(event);

    if (pendingBurst.length <= threshold) {
      // Within individual-dispatch window
      dispatchOne(event);
      dispatchedCount++;
    } else {
      // Exceeded threshold — accumulate and schedule one microtask flush
      if (!flushScheduled) {
        flushScheduled = true;
        Promise.resolve().then(() => flush());
      }
    }
  }

  // ── Engine tap ────────────────────────────────────────────────────────────
  const unsubscribeEngine = subscribeDevtoolsEvent(handleEngineEvent);

  // ── Bus object ────────────────────────────────────────────────────────────
  const bus: DevtoolsEventBus = {
    subscribe(cb) {
      if (destroyed) return () => {};
      // Synchronous replay of buffer contents
      const snapshot = getBuffer();
      for (const ev of snapshot) {
        try { cb(ev); } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("[devtools-event-bus] subscriber threw during replay:", err);
        }
      }
      subscribers.add(cb);
      return () => { subscribers.delete(cb); };
    },

    getBuffer,
    flush,

    destroy() {
      if (destroyed) return;
      destroyed = true;
      unsubscribeEngine();
      subscribers.clear();
      pendingBurst = [];
      dispatchedCount = 0;
      flushScheduled = false;
      // Cascade to registry
      for (const entry of registry.values()) {
        if (entry.bus === bus && entry.active) {
          entry.active = false;
          try { entry.unsubscribeSrc(); } catch { /* ignore */ }
        }
      }
    },
  };

  // Register inject fn BEFORE returning so registerStore can find it
  _busInjectMap.set(bus, handleEngineEvent);

  return bus;
}

// ── Multi-store registry ──────────────────────────────────────────────────────

/**
 * Wire an additional event source into an existing `DevtoolsEventBus`.
 * Events from `source` flow through the bus's ring buffer, coalescing, and fan-out.
 * Throws if `name` is already registered and active.
 */
export function registerStore(
  bus: DevtoolsEventBus,
  source: DevtoolsSourceFn,
  name: string,
): () => void {
  if (registry.get(name)?.active === true) {
    throw new Error(
      `[devtools-store-registry] Store name "${name}" is already registered and active`,
    );
  }

  const inject = _busInjectMap.get(bus);
  if (!inject) {
    throw new Error(
      `[devtools-store-registry] Bus is destroyed or was not created by createDevtoolsEventBus`,
    );
  }

  const unsubscribeSrc = source(inject);
  const entry: RegistryEntry = { name, active: true, bus, unsubscribeSrc };
  registry.set(name, entry);

  return () => {
    if (!entry.active) return;
    entry.active = false;
    unsubscribeSrc();
  };
}

/** Returns a snapshot of all registered stores (active + inactive) in registration order. */
export function getRegisteredStores(): ReadonlyArray<RegisteredStore> {
  return Array.from(registry.values()).map((e) => ({ name: e.name, active: e.active }));
}
