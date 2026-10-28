/**
 * A bounded holding area for deltas whose base version has not arrived yet.
 *
 * Entries wait up to `bufferTimeoutMs`; the oldest is dropped when more than
 * `maxBufferedDeltas` are waiting. Either way the owner is told, so a delta is
 * never dropped silently. Timers are cleared by `clear()`, which `dispose()`
 * calls, so a disposed runtime leaves nothing scheduled.
 */

import type { DeltaNeed, ParsedDelta } from "./activity-delta.js";
import type { PrometheusA2uiLimits } from "./limits.js";

export interface BufferedDelta {
  readonly messageId: string;
  readonly delta: ParsedDelta;
  /** Identifies the delta's content, so a redelivery is not buffered twice. */
  readonly fingerprint: string;
  /** What each waiting surface still needs. */
  readonly needs: readonly DeltaNeed[];
}

/** The bounds, as a getter so `setLimits` takes effect for later entries. */
export type DeltaBufferBounds = () => Pick<
  PrometheusA2uiLimits,
  "maxBufferedDeltas" | "bufferTimeoutMs"
>;

export type GiveUpReason = "timeout" | "overflow";

export class DeltaBuffer {
  private readonly timers = new Map<BufferedDelta, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly bounds: DeltaBufferBounds,
    private readonly onGiveUp: (entry: BufferedDelta, reason: GiveUpReason) => void,
  ) {}

  get size(): number {
    return this.timers.size;
  }

  /** The waiting deltas, oldest first. */
  pending(): readonly BufferedDelta[] {
    return [...this.timers.keys()];
  }

  /** Whether an equal delta (same message and content) is already waiting. */
  has(messageId: string, fingerprint: string): boolean {
    for (const entry of this.timers.keys()) {
      if (entry.messageId === messageId && entry.fingerprint === fingerprint) return true;
    }
    return false;
  }

  add(entry: BufferedDelta): void {
    const { maxBufferedDeltas, bufferTimeoutMs } = this.bounds();
    const timer = setTimeout(() => this.giveUp(entry, "timeout"), bufferTimeoutMs);
    // A pending timer must not keep a Node process (SSR, headless use) alive.
    (timer as { unref?: () => void }).unref?.();
    this.timers.set(entry, timer);
    while (this.timers.size > maxBufferedDeltas) {
      const oldest = this.timers.keys().next();
      if (oldest.done) break;
      this.giveUp(oldest.value, "overflow");
    }
  }

  remove(entry: BufferedDelta): void {
    const timer = this.timers.get(entry);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.timers.delete(entry);
  }

  clear(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  private giveUp(entry: BufferedDelta, reason: GiveUpReason): void {
    this.remove(entry);
    this.onGiveUp(entry, reason);
  }
}
