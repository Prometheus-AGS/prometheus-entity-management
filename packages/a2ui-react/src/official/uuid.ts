/**
 * UUIDv7 (RFC 9562), generated inline so the package takes no dependency.
 *
 * Layout: a 48-bit big-endian Unix millisecond timestamp, the 4-bit version
 * `0111`, 12 random bits, the 2-bit variant `10`, and 62 random bits. The
 * timestamp makes ids roughly time-ordered; the 74 random bits make two ids in
 * the same millisecond collide with negligible probability. The id is an
 * idempotency key, not a secret.
 */
export function uuidv7(): string {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
    throw new Error("A UUIDv7 needs crypto.getRandomValues, which this environment lacks.");
  }
  const bytes = new Uint8Array(16);
  cryptoApi.getRandomValues(bytes);

  let timestamp = Date.now();
  for (let index = 5; index >= 0; index -= 1) {
    bytes[index] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
