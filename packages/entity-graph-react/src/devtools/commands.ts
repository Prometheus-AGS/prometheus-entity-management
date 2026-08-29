import type {
  GraphDevtoolsClient,
  GraphDevtoolsEntityRecord,
  GraphDevtoolsPreviewAppliedReceipt,
  GraphDevtoolsPreviewRestoreReceipt,
  GraphDevtoolsReturnToLiveReceipt,
  GraphDevtoolsRewindResult,
} from "@prometheus-ags/entity-graph-core/devtools";
import type { EntityGraphInspectorModel } from "./model";
import type { EntityGraphDevtoolsValuePolicyMode } from "./provider";

async function request(
  client: GraphDevtoolsClient,
  command: Parameters<GraphDevtoolsClient["request"]>[0],
  payload?: unknown,
) {
  const result = await client.request(command, payload);
  if (!result.ok) throw new Error(result.error.message);
  return result.result;
}

export async function applyEntityPreview(
  client: GraphDevtoolsClient,
  entity: Pick<GraphDevtoolsEntityRecord, "type" | "id">,
  patch: Record<string, unknown>,
): Promise<GraphDevtoolsPreviewAppliedReceipt> {
  return await request(client, "preview-entity-patch", {
    type: entity.type,
    id: entity.id,
    patch,
  }) as GraphDevtoolsPreviewAppliedReceipt;
}

export async function restoreEntityPreview(
  client: GraphDevtoolsClient,
  previewId: string,
): Promise<GraphDevtoolsPreviewRestoreReceipt> {
  return await request(client, "restore-entity-preview", { previewId }) as GraphDevtoolsPreviewRestoreReceipt;
}

export async function rewindEntityGraph(
  client: GraphDevtoolsClient,
  cursor: number,
): Promise<GraphDevtoolsRewindResult> {
  return await request(client, "rewind", { cursor }) as GraphDevtoolsRewindResult;
}

export async function returnEntityGraphToLive(
  client: GraphDevtoolsClient,
): Promise<GraphDevtoolsReturnToLiveReceipt> {
  return await request(client, "return-to-live") as GraphDevtoolsReturnToLiveReceipt;
}

export function parsePreviewPatch(source: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(source);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("Preview patch must be a JSON object");
  }
  if (Object.keys(parsed).length === 0) {
    throw new Error("Preview patch must change at least one field");
  }
  return parsed as Record<string, unknown>;
}

export function createPolicyAwareExport(
  model: EntityGraphInspectorModel,
  valuePolicyMode: EntityGraphDevtoolsValuePolicyMode,
) {
  const hidden = { $type: "hidden-by-policy" };
  const entities = valuePolicyMode === "include"
    ? model.policyEntities
    : model.policyEntities.map((entity) => ({
        ...entity,
        canonical: entity.canonical === null ? null : hidden,
        patch: entity.patch === null ? null : hidden,
        merged: entity.merged === null ? null : hidden,
      }));
  const events = valuePolicyMode === "include"
    ? model.events
    : model.events.map((event) => event.type === "mutation"
      ? {
          ...event,
          payload: {
            ...event.payload,
            changes: event.payload.changes.map(({ before: _before, after: _after, ...change }) => ({
              ...change,
              valueState: "hidden-by-policy" as const,
            })),
          },
        }
      : event);
  return {
    protocol: model.snapshot.protocol,
    version: model.snapshot.version,
    storeId: model.snapshot.storeId,
    exportedAt: new Date().toISOString(),
    valuePolicy: valuePolicyMode,
    snapshot: model.snapshot,
    entities,
    views: model.views,
    relationships: model.relationships,
    events,
  };
}

export function policyEntityValue(
  model: EntityGraphInspectorModel,
  entity: Pick<GraphDevtoolsEntityRecord, "type" | "id">,
  projection: "canonical" | "patch" | "merged",
): unknown {
  return model.policyEntities.find((candidate) => (
    candidate.type === entity.type && candidate.id === entity.id
  ))?.[projection];
}

export async function writeInspectorClipboard(value: string): Promise<void> {
  if (globalThis.navigator?.clipboard) {
    await globalThis.navigator.clipboard.writeText(value);
    return;
  }
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  active?.focus();
  if (!copied) throw new Error("Clipboard access is unavailable in this browser context");
}

export function downloadInspectorExport(filename: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  globalThis.setTimeout(() => URL.revokeObjectURL(url), 0);
}
