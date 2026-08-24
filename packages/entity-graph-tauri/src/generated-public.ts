/**
 * Stable public facade for the Rust-derived Tauri Specta bindings.
 *
 * The generated implementation intentionally imports Tauri's concrete event,
 * window, and webview types. Those are private runtime details and currently
 * expose declaration imports that are incompatible with strict NodeNext
 * consumers. This facade preserves the complete callable surface with local
 * structural types while leaving the generated file untouched for drift
 * verification.
 */
import {
  PLUGIN_NAME as generatedPluginName,
  commands,
  events,
} from "./generated-bindings";
import type {
  EntityChangedEvent,
  GetEntityResult,
  GetListResult,
  GraphPluginErrorEvent,
  PatchEntityPayload,
  PersistSnapshotPayload,
  PlatformPing,
  RemoveEntityPayload,
  RestoreSnapshotPayload,
  RestoreSnapshotResult,
  SetListPayload,
  SnapshotPersistedEvent,
  SnapshotRestoredEvent,
  UpsertEntityPayload,
} from "./generated-bindings";

type CommandResult<T> = Promise<
  { status: "ok"; data: T } | { status: "error"; error: string }
>;

interface GeneratedCommands {
  graphUpsertEntity(payload: UpsertEntityPayload): CommandResult<null>;
  graphRemoveEntity(payload: RemoveEntityPayload): CommandResult<null>;
  graphPatchEntity(payload: PatchEntityPayload): CommandResult<null>;
  graphSetList(payload: SetListPayload): CommandResult<null>;
  graphGetEntity(entityType: string, entityId: string): CommandResult<GetEntityResult>;
  graphGetList(queryKey: string): CommandResult<GetListResult>;
  graphPlatformPing(): CommandResult<PlatformPing>;
  graphClear(): CommandResult<null>;
  graphPersistSnapshot(payload: PersistSnapshotPayload): CommandResult<null>;
  graphRestoreSnapshot(payload: RestoreSnapshotPayload): CommandResult<RestoreSnapshotResult>;
}

interface EventEnvelope<T> {
  payload: T;
}

type EventCallback<T> = (event: EventEnvelope<T>) => void;
type Unlisten = () => void;

interface EventTargetLike {
  listen<T>(name: string, callback: EventCallback<T>): Promise<Unlisten>;
  once<T>(name: string, callback: EventCallback<T>): Promise<Unlisten>;
  emit<T>(name: string, payload: T): Promise<void>;
}

interface EventOperations<T> {
  listen(callback: EventCallback<T>): Promise<Unlisten>;
  once(callback: EventCallback<T>): Promise<Unlisten>;
  emit(payload: T): Promise<void>;
}

interface GeneratedEvent<T> extends EventOperations<T> {
  (target: EventTargetLike): EventOperations<T>;
}

interface GeneratedEvents {
  entityChanged: GeneratedEvent<EntityChangedEvent>;
  error: GeneratedEvent<GraphPluginErrorEvent>;
  snapshotPersisted: GeneratedEvent<SnapshotPersistedEvent>;
  snapshotRestored: GeneratedEvent<SnapshotRestoredEvent>;
}

export const generatedCommands = commands as GeneratedCommands;
export const generatedEvents = events as unknown as GeneratedEvents;
export const PLUGIN_NAME: "entity-graph-tauri" = generatedPluginName;
