/**
 * Builders for the AG-UI 1.0 events the lab scenarios emit.
 *
 * AG-UI 1.0 has no version or idempotency field on activity events, so the
 * producer's ordering key rides in the activity `content`:
 * `surfaceVersions: { <surfaceId>: { epoch, version } }`. A delta applies on top
 * of the version its `test` operations name and yields the next one.
 */

import { EventType } from "@ag-ui/core";

export const A2UI_ACTIVITY_TYPE = "a2ui-surface";
const A2UI_VERSION = "v0.9.1";
const CATALOG_ID = "urn:prometheus-ags:a2ui:catalog:v3";

export interface SurfaceVersionKey {
  readonly epoch: number;
  readonly version: number;
}

export type A2uiOperation = Record<string, unknown>;

export function createSurfaceOperation(
  surfaceId: string,
  options: { readonly sendDataModel?: boolean } = {},
): A2uiOperation {
  return {
    version: A2UI_VERSION,
    createSurface: {
      surfaceId,
      catalogId: CATALOG_ID,
      ...(options.sendDataModel === undefined ? {} : { sendDataModel: options.sendDataModel }),
    },
  };
}

export function updateComponentsOperation(
  surfaceId: string,
  components: readonly Record<string, unknown>[],
): A2uiOperation {
  return { version: A2UI_VERSION, updateComponents: { surfaceId, components } };
}

export function updateDataModelOperation(surfaceId: string, path: string, value: unknown): A2uiOperation {
  return { version: A2UI_VERSION, updateDataModel: { surfaceId, path, value } };
}

export function deleteSurfaceOperation(surfaceId: string): A2uiOperation {
  return { version: A2UI_VERSION, deleteSurface: { surfaceId } };
}

function versionsContent(
  operations: readonly A2uiOperation[],
  versions: Readonly<Record<string, SurfaceVersionKey>>,
): Record<string, unknown> {
  return { a2ui_operations: operations, surfaceVersions: versions };
}

/** `ACTIVITY_SNAPSHOT` carrying the given operations at the given surface versions. */
export function activitySnapshot(input: {
  readonly messageId: string;
  readonly operations: readonly A2uiOperation[];
  readonly versions: Readonly<Record<string, SurfaceVersionKey>>;
  readonly replace?: boolean;
}): Record<string, unknown> {
  return {
    type: EventType.ACTIVITY_SNAPSHOT,
    messageId: input.messageId,
    activityType: A2UI_ACTIVITY_TYPE,
    content: versionsContent(input.operations, input.versions),
    ...(input.replace === undefined ? {} : { replace: input.replace }),
  };
}

/**
 * `ACTIVITY_DELTA` that appends one operation on top of `base` and tests that
 * base first, so a consumer holding another version refuses it.
 */
export function activityDelta(input: {
  readonly messageId: string;
  readonly surfaceId: string;
  readonly base: SurfaceVersionKey;
  readonly operation: A2uiOperation;
}): Record<string, unknown> {
  const { surfaceId, base } = input;
  return {
    type: EventType.ACTIVITY_DELTA,
    messageId: input.messageId,
    activityType: A2UI_ACTIVITY_TYPE,
    patch: [
      { op: "test", path: `/surfaceVersions/${surfaceId}/epoch`, value: base.epoch },
      { op: "test", path: `/surfaceVersions/${surfaceId}/version`, value: base.version },
      { op: "add", path: "/a2ui_operations/-", value: input.operation },
    ],
  };
}

/** `MESSAGES_SNAPSHOT` made of the given activity messages (a thread replay). */
export function messagesSnapshot(
  activities: readonly {
    readonly id: string;
    readonly operations: readonly A2uiOperation[];
    readonly versions: Readonly<Record<string, SurfaceVersionKey>>;
  }[],
): Record<string, unknown> {
  return {
    type: EventType.MESSAGES_SNAPSHOT,
    messages: activities.map((activity) => ({
      id: activity.id,
      role: "activity",
      activityType: A2UI_ACTIVITY_TYPE,
      content: versionsContent(activity.operations, activity.versions),
    })),
  };
}
