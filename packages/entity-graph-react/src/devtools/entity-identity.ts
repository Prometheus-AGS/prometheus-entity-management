import type { GraphDevtoolsEntityRecord } from "@prometheus-ags/entity-graph-core/devtools";

export function inspectorEntityIdentity(
  entity: Pick<GraphDevtoolsEntityRecord, "type" | "id">,
): string {
  return JSON.stringify([entity.type, entity.id]);
}
