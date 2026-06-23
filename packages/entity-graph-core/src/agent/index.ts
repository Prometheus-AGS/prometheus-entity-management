/**
 * agent/ — Agent-protocol ingestion into the entity graph.
 *
 * AG-UI bridge: STATE_SNAPSHOT / STATE_DELTA (RFC-6902) → graph entities.
 * (A2A / A2UI agent↔agent protocols are carried by the Flint fabric and
 * consumed via the Flint adapter, not here.)
 */

export { applyAgUiSnapshot, applyAgUiDelta } from "./ag-ui-bridge";
export type {
  AgUiStateSnapshotEvent,
  AgUiStateDeltaEvent,
  AgUiStateMapping,
  ApplyAgUiOptions,
} from "./ag-ui-bridge";
export { applyJsonPatch } from "./json-patch";
export type { JsonPatchOp } from "./json-patch";
