/**
 * sse-client.ts
 *
 * Manages a single open SSE connection to a browser client.
 * Responsible only for writing SSE frames to the response stream and
 * tracking which entity subscriptions this client has registered.
 */

import type { ServerResponse } from "node:http";
import type { SseClient, SseEvent } from "./types.js";

let clientSeq = 0;

/**
 * Initialise the response headers for an SSE stream and return an
 * {@link SseClient} handle.
 */
export function createSseClient(res: ServerResponse): SseClient {
  const id = `sse-${++clientSeq}-${Date.now()}`;
  const subscriptions = new Set<string>();
  let closed = false;

  // Required SSE headers.
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // Disable Nginx proxy buffering.
    "Access-Control-Allow-Origin": "*",
  });

  // Flush the headers immediately so the browser starts receiving events.
  if (typeof (res as { flushHeaders?: () => void }).flushHeaders === "function") {
    (res as { flushHeaders: () => void }).flushHeaders();
  }

  function send(event: SseEvent): void {
    if (closed) return;
    const lines: string[] = [];
    if (event.id) lines.push(`id: ${event.id}`);
    if (event.retry) lines.push(`retry: ${event.retry}`);
    if (event.event) lines.push(`event: ${event.event}`);
    // SSE data lines must not contain raw newlines — encode them.
    const dataLines = event.data
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => `data: ${line}`)
      .join("\n");
    lines.push(dataLines);
    lines.push(""); // blank line terminates the event
    lines.push("");

    try {
      res.write(lines.join("\n"));
    } catch {
      // Client disconnected mid-write — mark closed.
      closed = true;
    }
  }

  function close(): void {
    if (closed) return;
    closed = true;
    try {
      res.end();
    } catch {
      // Already closed.
    }
  }

  // Detect client disconnect.
  res.on("close", () => { closed = true; });
  res.on("error", () => { closed = true; });

  const client: SseClient = {
    get id() { return id; },
    get subscriptions() { return subscriptions; },
    send,
    close,
  };

  return client;
}

// ── Subscription key helpers ──────────────────────────────────────────────────

/**
 * Build the subscription key stored in `SseClient.subscriptions`.
 * Format: `type:id` for single-entity subscriptions; `type:*` for type-wide.
 */
export function subscriptionKey(type: string, id: string | "*"): string {
  return `${type}:${id}`;
}

/**
 * Match a change event against a client's subscriptions.
 * Returns true if the client should receive the event.
 */
export function clientSubscribedTo(
  client: SseClient,
  type: string,
  id: string
): boolean {
  return (
    client.subscriptions.has(subscriptionKey(type, id)) ||
    client.subscriptions.has(subscriptionKey(type, "*"))
  );
}
