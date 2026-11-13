/**
 * The single A2UI envelope assertion for scenario UPG-14.
 *
 * `scripts/verify-a2ui-examples.mjs` applies exactly these functions to the
 * envelopes captured from each running example AND to each example's
 * pre-migration fixture (the negative control), so the control exercises the
 * same code path as the oracle.
 *
 * Detection is independent of the version value: an object is an A2UI
 * server-to-client envelope when it carries one of the A2UI message keys with an
 * object value. The assertion then requires `version === "1.0"`; a missing,
 * `"v0.9.1"` or release-candidate `"v1.0"` version fails.
 */

import { createHash } from "node:crypto";

/** The version every captured envelope must announce (A2UI 1.0 final). */
export const REQUIRED_A2UI_VERSION = "1.0";

/** Versions the negative control expects the pre-migration recordings to fail on. */
export const PRE_MIGRATION_VERSIONS = Object.freeze(["v0.9.1", "v1.0"]);

/**
 * Server-to-client A2UI message keys: the 0.9.x / 1.0 state and function
 * messages, plus the 0.8 names so an older producer is still detected.
 */
export const A2UI_MESSAGE_KEYS = Object.freeze([
  "createSurface",
  "updateComponents",
  "updateDataModel",
  "deleteSurface",
  "callRendererFunction",
  "agentFunctionResponse",
  "beginRendering",
  "surfaceUpdate",
  "dataModelUpdate",
]);

const MAX_DEPTH = 64;

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** The A2UI message key an envelope carries, or `undefined` when it is not an envelope. */
export function envelopeKind(value) {
  if (!isPlainObject(value)) return undefined;
  return A2UI_MESSAGE_KEYS.find((key) => isPlainObject(value[key]));
}

/**
 * Every A2UI envelope inside `root`, in document order. The walk does not
 * descend into an envelope it has already found.
 */
export function collectEnvelopes(root) {
  const found = [];
  const pending = [{ value: root, depth: 0 }];
  while (pending.length > 0) {
    const { value, depth } = pending.pop();
    if (depth > MAX_DEPTH || value === null || typeof value !== "object") continue;
    if (envelopeKind(value)) {
      found.push(value);
      continue;
    }
    const children = Array.isArray(value) ? value : Object.values(value);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      pending.push({ value: children[index], depth: depth + 1 });
    }
  }
  return found;
}

/**
 * The UPG-14 assertion: at least one envelope, and every envelope has
 * `version: "1.0"`. Returns a receipt instead of throwing so the caller can
 * record both the oracle and the negative control.
 */
export function assertA2uiEnvelopes(envelopes) {
  const versions = {};
  const failures = [];
  envelopes.forEach((envelope, index) => {
    const version = Object.hasOwn(envelope, "version") ? envelope.version : null;
    const label = version === null ? "(missing)" : String(version);
    versions[label] = (versions[label] ?? 0) + 1;
    if (version !== REQUIRED_A2UI_VERSION) {
      failures.push({ index, kind: envelopeKind(envelope), version });
    }
  });
  const reasons = [];
  if (envelopes.length === 0) reasons.push("no A2UI envelopes were captured");
  if (failures.length > 0) {
    reasons.push(`${failures.length} envelope(s) do not have version "${REQUIRED_A2UI_VERSION}"`);
  }
  return {
    ok: reasons.length === 0,
    required: REQUIRED_A2UI_VERSION,
    total: envelopes.length,
    versions,
    failures,
    reasons,
  };
}

/** JSON with sorted object keys, so equal envelopes digest equally. */
export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function sha256Hex(input) {
  return createHash("sha256").update(input).digest("hex");
}

/** sha256 of an envelope's canonical JSON. */
export function envelopeDigest(envelope) {
  return sha256Hex(canonicalJson(envelope));
}
