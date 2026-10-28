/**
 * Bookkeeping for AG-UI A2UI activities.
 *
 * The runtime used to treat every activity `messageId` as a delete handle: it
 * recorded every surface a message named, and a redelivery deleted them all
 * before replaying only that message. This ledger keeps the facts that make
 * delivery idempotent instead, and never deletes a surface by itself.
 */

import { compareSurfaceVersions, type SurfaceVersion } from "./activity-keys.js";
import type { PrometheusA2uiLimits } from "./limits.js";

/** The bounds the ledger reads, as a getter so `setLimits` takes effect. */
export type LedgerBounds = () => Pick<PrometheusA2uiLimits, "maxTrackedMessages" | "maxTombstones">;

interface MessageRecord {
  /** Surfaces this message created (it sent the applied `createSurface`). */
  readonly created: Set<string>;
  /** Surfaces this message only updated or deleted. */
  readonly updated: Set<string>;
  /** Digest of the last operations this message applied to each surface. */
  readonly digests: Map<string, string>;
}

/** The ordering key and content digest last applied to a surface. */
interface HeldRecord {
  /** Absent when the producer sent no version for the surface. */
  readonly key: SurfaceVersion | undefined;
  readonly digest: string;
}

export type SurfaceRole = "created" | "updated";

/**
 * Most data leaves tracked per surface. Per-leaf digests cost far more memory
 * than the data they describe, so a producer could otherwise amplify a small
 * data model into a large base. Past this, tracking for that surface is dropped
 * and later restatements simply overwrite (the producer wins).
 */
export const MAX_TRACKED_DATA_LEAVES = 20_000;

export type ActivityDecision =
  | { readonly action: "apply" }
  | { readonly action: "skip"; readonly reason: "stale" | "duplicate" }
  /** Same ordering key as already applied, but different content. */
  | { readonly action: "conflict" };

export class ActivityLedger {
  private readonly messages = new Map<string, MessageRecord>();
  private readonly creators = new Map<string, string>();
  private readonly held = new Map<string, HeldRecord>();
  /** Deleted surfaces and the key that deleted them; oldest first. */
  private readonly tombstones = new Map<string, SurfaceVersion>();
  /** Per surface: data leaf pointer to the digest of the last producer-written value. */
  private readonly dataBases = new Map<string, Map<string, string>>();

  constructor(private readonly bounds: LedgerBounds) {}

  hasMessage(messageId: string): boolean {
    return this.messages.has(messageId);
  }

  /** Remember a message, even one whose operations were all skipped. */
  touchMessage(messageId: string): void {
    this.recordFor(messageId);
  }

  private recordFor(messageId: string): MessageRecord {
    const existing = this.messages.get(messageId);
    if (existing) return existing;
    const created: MessageRecord = {
      created: new Set(),
      updated: new Set(),
      digests: new Map(),
    };
    this.messages.set(messageId, created);
    this.evictOldest(this.messages, this.bounds().maxTrackedMessages);
    return created;
  }

  /** Forget the oldest entries once a bounded map exceeds its limit. */
  private evictOldest<Value>(map: Map<string, Value>, max: number): void {
    while (map.size > max) {
      const oldest = map.keys().next();
      if (oldest.done) return;
      map.delete(oldest.value);
    }
  }

  /**
   * Decide what to do with one surface's operations from one activity.
   *
   * A versioned activity is ordered by `(epoch, version)`: older is stale, equal
   * with the same digest is a redelivery, equal with a different digest is a
   * producer fault (the first is kept, never merged), newer is applied, and a
   * higher epoch always wins so a restarted producer is not wedged. A
   * versionless activity has no ordering, so only an identical redelivery of the
   * same message is skipped.
   *
   * `isHeld` says whether the surface exists in the live processor. A surface
   * that was removed outside the ledger loses its held record first.
   */
  decide(
    messageId: string,
    surfaceId: string,
    key: SurfaceVersion | undefined,
    digest: string,
    isHeld: boolean,
  ): ActivityDecision {
    if (!isHeld) {
      this.held.delete(surfaceId);
      this.dataBases.delete(surfaceId);
    }

    if (key === undefined) {
      const lastDigest = this.messages.get(messageId)?.digests.get(surfaceId);
      return lastDigest === digest ? { action: "skip", reason: "duplicate" } : { action: "apply" };
    }

    // A deleted surface stays deleted against any key at or below the one that
    // deleted it, so a redelivered create or update cannot revive it.
    const tombstone = isHeld ? undefined : this.tombstones.get(surfaceId);
    if (tombstone && compareSurfaceVersions(key, tombstone) <= 0) {
      return { action: "skip", reason: "stale" };
    }

    const held = this.held.get(surfaceId);
    if (held?.key) {
      const order = compareSurfaceVersions(key, held.key);
      if (order < 0) return { action: "skip", reason: "stale" };
      if (order === 0) {
        return held.digest === digest
          ? { action: "skip", reason: "duplicate" }
          : { action: "conflict" };
      }
    }
    return { action: "apply" };
  }

  /** Record what an applied activity did to a surface. */
  recordApplied(
    messageId: string,
    surfaceId: string,
    applied: { role: SurfaceRole; key: SurfaceVersion | undefined; digest: string },
  ): void {
    const record = this.recordFor(messageId);
    record.digests.set(surfaceId, applied.digest);
    // Creation and update are kept apart: a message that merely updates a
    // surface does not own it.
    if (applied.role === "created") {
      record.created.add(surfaceId);
      this.creators.set(surfaceId, messageId);
    } else {
      record.updated.add(surfaceId);
    }
    this.held.set(surfaceId, { key: applied.key, digest: applied.digest });
    // The surface exists again under a newer key, so its tombstone is spent.
    this.tombstones.delete(surfaceId);
  }

  /**
   * Record an applied `deleteSurface`. With a version, the deletion is
   * remembered (bounded) so a stale redelivery cannot recreate the surface;
   * without one there is nothing to order against, so nothing is remembered.
   */
  recordDeleted(
    messageId: string,
    surfaceId: string,
    applied: { key: SurfaceVersion | undefined; digest: string },
  ): void {
    const record = this.recordFor(messageId);
    record.updated.add(surfaceId);
    record.digests.set(surfaceId, applied.digest);
    this.forgetSurface(surfaceId);
    if (applied.key) {
      this.tombstones.delete(surfaceId);
      this.tombstones.set(surfaceId, applied.key);
      this.evictOldest(this.tombstones, this.bounds().maxTombstones);
    }
  }

  /** The ordering key last applied to a surface; absent for a versionless surface. */
  heldKey(surfaceId: string): SurfaceVersion | undefined {
    return this.held.get(surfaceId)?.key;
  }

  /** Every surface that holds versioned state, with its last applied key. */
  heldKeys(): ReadonlyMap<string, SurfaceVersion> {
    const keys = new Map<string, SurfaceVersion>();
    for (const [surfaceId, record] of this.held) {
      if (record.key) keys.set(surfaceId, record.key);
    }
    return keys;
  }

  /** Digest of the last value the producer wrote at each data leaf of a surface. */
  dataBase(surfaceId: string): ReadonlyMap<string, string> {
    return this.dataBases.get(surfaceId) ?? new Map<string, string>();
  }

  /** Replace a surface's data base after an applied activity. */
  commitDataBase(surfaceId: string, base: ReadonlyMap<string, string>): void {
    if (base.size > MAX_TRACKED_DATA_LEAVES) {
      this.dataBases.delete(surfaceId);
      return;
    }
    this.dataBases.set(surfaceId, new Map(base));
  }

  /** The message that created a surface, if the ledger still knows it. */
  creatorOf(surfaceId: string): string | undefined {
    return this.creators.get(surfaceId);
  }

  /** A surface no longer exists: it has no creator and no held version. */
  forgetSurface(surfaceId: string): void {
    this.creators.delete(surfaceId);
    this.held.delete(surfaceId);
    this.dataBases.delete(surfaceId);
  }

  untrackMessage(messageId: string): void {
    this.messages.delete(messageId);
  }

  /**
   * Stop tracking every message not in `present`. Only the message records go:
   * surfaces, their held versions and their creators are left alone.
   */
  untrackAbsent(present: ReadonlySet<string>): void {
    for (const messageId of [...this.messages.keys()]) {
      if (!present.has(messageId)) this.messages.delete(messageId);
    }
  }

  get trackedMessages(): number {
    return this.messages.size;
  }

  get tombstoneCount(): number {
    return this.tombstones.size;
  }

  clear(): void {
    this.tombstones.clear();
    this.dataBases.clear();
    this.messages.clear();
    this.creators.clear();
    this.held.clear();
  }
}
