/**
 * What a server returns when it rejects an action because the client acted on
 * an out-of-date surface.
 *
 * Wire shape (a decision of the a2ui-action-ids change): the same field names an
 * activity's content uses, so the same parser and the same ordering rules apply.
 *
 *   {
 *     actionId: "<the rejected action's id>",
 *     a2ui_operations: [ ...operations since the version the client held ],
 *     surfaceVersions: { "<surfaceId>": { epoch?: n, version: n } }  // after applying them
 *   }
 *
 * Applying the operations brings the surface up to date; a rejection that
 * carries none cannot repair anything, so the runtime asks the host to resync.
 */

import { parseSurfaceVersions, type SurfaceVersion } from "./activity-keys.js";

export interface StaleActionRejection {
  readonly actionId: string;
  readonly operations: readonly unknown[];
  readonly versions: ReadonlyMap<string, SurfaceVersion>;
}

export type StaleActionResult =
  | { readonly rejection: StaleActionRejection }
  | { readonly problem: string };

export function parseStaleActionRejection(input: unknown): StaleActionResult {
  if (!input || typeof input !== "object") {
    return { problem: "A stale-action rejection must be an object." };
  }
  const record = input as Record<string, unknown>;
  if (typeof record.actionId !== "string" || record.actionId.length === 0) {
    return { problem: "A stale-action rejection must name the rejected actionId." };
  }
  if (!Array.isArray(record.a2ui_operations)) {
    return { problem: "A stale-action rejection must carry a2ui_operations (possibly empty)." };
  }
  const versions = parseSurfaceVersions(record.surfaceVersions);
  if ("problem" in versions) return { problem: versions.problem };
  return {
    rejection: {
      actionId: record.actionId,
      operations: record.a2ui_operations,
      versions: versions.versions,
    },
  };
}
