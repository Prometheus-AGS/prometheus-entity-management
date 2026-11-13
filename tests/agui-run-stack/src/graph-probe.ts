/**
 * Read-only probes on the page's entity graph: a per-stream counter of chat
 * message writes (UPG-11) and plain-JSON snapshots for the digests the spec
 * records (UPG-10, UPG-12). Nothing here writes to the graph.
 */
import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import {
  CHAT_CONVERSATION_ENTITY,
  CHAT_MESSAGE_ENTITY,
  chatListKey,
} from "@prometheus-ags/a2ui-react/ag-ui";

export interface MessageWrite {
  seq: number;
  bucket: string;
  conversationId: string;
  messageId: string;
  at: number;
}

export interface MessageWriteCounter {
  writes: MessageWrite[];
  countsSince(seq: number): Record<string, number>;
  stop(): void;
}

/**
 * Counts every graph notification in which an `A2uiChatMessage` entity
 * changed (its object identity, which Immer only replaces on a write), and
 * attributes it with `bucketOf(conversationId, messageId)`.
 */
export function countMessageWrites(
  store: GraphStore,
  bucketOf: (conversationId: string, messageId: string) => string,
): MessageWriteCounter {
  const writes: MessageWrite[] = [];
  const stop = store.subscribe((state, previous) => {
    const next = state.entities[CHAT_MESSAGE_ENTITY] ?? {};
    const before = previous.entities[CHAT_MESSAGE_ENTITY] ?? {};
    if (next === before) return;
    for (const key of new Set([...Object.keys(next), ...Object.keys(before)])) {
      if (next[key] === before[key]) continue;
      let conversationId = "?";
      let messageId = key;
      try {
        const tuple = JSON.parse(key) as unknown;
        if (Array.isArray(tuple) && typeof tuple[0] === "string" && typeof tuple[1] === "string") {
          [conversationId, messageId] = tuple as [string, string];
        }
      } catch {
        // Keep the raw key; the bucket function sees it unparsed.
      }
      writes.push({ seq: writes.length, bucket: bucketOf(conversationId, messageId), conversationId, messageId, at: performance.now() });
    }
  });
  return {
    writes,
    countsSince(seq: number): Record<string, number> {
      const counts: Record<string, number> = {};
      for (const write of writes.slice(seq)) counts[write.bucket] = (counts[write.bucket] ?? 0) + 1;
      return counts;
    },
    stop,
  };
}

/** A conversation as stored in the graph: its id list, message entities and conversation record. */
export function conversationSnapshot(store: GraphStore, conversationId: string): Record<string, unknown> {
  const state = store.getState();
  const ids = state.lists[chatListKey(conversationId)]?.ids ?? [];
  return {
    conversationId,
    listKey: chatListKey(conversationId),
    ids,
    messages: ids.map((id) => state.entities[CHAT_MESSAGE_ENTITY]?.[String(id)] ?? null),
    conversation: state.entities[CHAT_CONVERSATION_ENTITY]?.[conversationId] ?? null,
  };
}

/** One entity's stored base, its local patch, and the merged read. */
export function entitySnapshot(store: GraphStore, type: string, id: string): Record<string, unknown> {
  const state = store.getState();
  const base = state.entities[type]?.[id] ?? null;
  const patch = state.patches[type]?.[id] ?? null;
  return { type, id, base, patch, merged: base ? { ...base, ...(patch ?? {}) } : null };
}
