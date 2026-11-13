/**
 * In-page envelope tap for the UPG-14 browser run.
 *
 * `installA2uiTap` is passed to `page.addInitScript`, so it runs in the page
 * before the example's bundle and must stay self-contained (Playwright
 * serializes it with `Function.prototype.toString`). It observes the two
 * boundaries every in-browser A2UI producer output crosses, without changing
 * what the page sees:
 *
 * - `JSON.stringify`: the A2UI runtime measures the serialized size of every
 *   raw message batch before it parses it (`findCallViolation` ->
 *   `measureSerializedBytes`), and the A2A server serializes each SSE event. A
 *   payload that contains an A2UI envelope is recorded as the exact JSON text.
 *   An array made only of envelopes is labelled `runtime-input`; anything else
 *   that contains one is `serialized-payload`.
 * - `Response`: a `text/event-stream` body constructed in the page (the
 *   in-page A2A server's streaming reply) is teed; the copy is decoded into SSE
 *   frames and frames that contain an envelope are recorded as `a2a-sse`.
 *
 * Records land in `window.__A2UI_TAP__.records` as `{ source, text }`. The
 * verifier, not this tap, decides what an envelope is and whether it passes.
 */
export function installA2uiTap(messageKeys) {
  const keys = new Set(messageKeys);
  const tap = { records: [], sseFrames: 0, errors: [] };
  Object.defineProperty(window, "__A2UI_TAP__", { value: tap, configurable: false });

  const nativeStringify = JSON.stringify;
  const nativeParse = JSON.parse;
  const MAX_NODES = 50_000;
  const MAX_DEPTH = 64;
  let inside = false;

  function isPlain(value) {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  }

  function isEnvelope(value) {
    if (!isPlain(value)) return false;
    for (const key of Object.keys(value)) {
      if (keys.has(key) && isPlain(value[key])) return true;
    }
    return false;
  }

  function containsEnvelope(root) {
    const pending = [[root, 0]];
    let visited = 0;
    while (pending.length > 0) {
      const [value, depth] = pending.pop();
      visited += 1;
      if (visited > MAX_NODES) return false;
      if (value === null || typeof value !== "object" || depth > MAX_DEPTH) continue;
      if (!Array.isArray(value) && !isPlain(value)) continue;
      if (isEnvelope(value)) return true;
      const children = Array.isArray(value) ? value : Object.values(value);
      for (const child of children) pending.push([child, depth + 1]);
    }
    return false;
  }

  function record(source, text) {
    tap.records.push({ source, at: Date.now(), text });
  }

  JSON.stringify = function stringify(value, replacer, space) {
    if (!inside) {
      inside = true;
      try {
        if (containsEnvelope(value)) {
          const onlyEnvelopes =
            Array.isArray(value) && value.length > 0 && value.every((item) => isEnvelope(item));
          record(onlyEnvelopes ? "runtime-input" : "serialized-payload", nativeStringify(value));
        }
      } catch (error) {
        tap.errors.push(String(error));
      } finally {
        inside = false;
      }
    }
    return nativeStringify(value, replacer, space);
  };

  function sseData(frame) {
    return frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
  }

  async function drainSse(stream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const flush = (final) => {
      for (;;) {
        const match = /\r?\n\r?\n/.exec(buffer);
        if (!match) break;
        const frame = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        consume(frame);
      }
      if (final && buffer.trim().length > 0) consume(buffer);
    };
    const consume = (frame) => {
      const data = sseData(frame);
      if (!data) return;
      tap.sseFrames += 1;
      try {
        const parsed = nativeParse(data);
        if (containsEnvelope(parsed)) record("a2a-sse", data);
      } catch (error) {
        tap.errors.push(`sse frame: ${String(error)}`);
      }
    };
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        flush(false);
      }
      buffer += decoder.decode();
      flush(true);
    } catch (error) {
      tap.errors.push(`sse stream: ${String(error)}`);
    }
  }

  const NativeResponse = window.Response;
  class TapResponse extends NativeResponse {
    constructor(body, init) {
      let delivered = body;
      try {
        const contentType = new Headers(init?.headers ?? undefined).get("content-type") ?? "";
        if (body instanceof ReadableStream && contentType.includes("text/event-stream")) {
          const [forPage, forTap] = body.tee();
          delivered = forPage;
          void drainSse(forTap);
        }
      } catch (error) {
        tap.errors.push(`response: ${String(error)}`);
      }
      super(delivered, init);
    }

    static [Symbol.hasInstance](value) {
      return value instanceof NativeResponse;
    }
  }
  window.Response = TapResponse;
}

/** The tap's records, read back from the page. */
export async function readA2uiTap(page) {
  return page.evaluate(() => {
    const tap = window.__A2UI_TAP__;
    if (!tap) return { installed: false, records: [], sseFrames: 0, errors: [] };
    return {
      installed: true,
      records: tap.records.slice(),
      sseFrames: tap.sseFrames,
      errors: tap.errors.slice(),
    };
  });
}
