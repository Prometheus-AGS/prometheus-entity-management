import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useStore } from "zustand";
import { useGraphStore } from "../graph";
import { useEntity } from "../hooks";
import { useEntityView } from "../view/use-entity-view";
import { cascadeInvalidation, readRelations } from "./relations";
import { serializeKey } from "../engine";
import type { EntityType, EntityId } from "../graph";
import type { UseEntityViewResult, ViewFetchParams } from "../view/use-entity-view";
import type { ListResponse } from "../engine";
import type { ViewDescriptor, FilterSpec, SortSpec } from "../view/types";
import { collectDirtyPaths, setValueAtPath } from "../object-path";

/** UI mode for a single CRUD surface: drives which panels/forms are active without scattering boolean flags. */
export type CRUDMode = "list" | "detail" | "edit" | "create";

/**
 * Wire one entity type into list+detail+forms: remote list via `useEntityView`, optional detail fetch, and create/update/delete callbacks.
 * Mutations call `cascadeInvalidation` on success so related lists/entities refresh per registered schemas.
 */
export interface CRUDOptions<TEntity extends Record<string, unknown>> {
  type: EntityType; listQueryKey: unknown[];
  listFetch: (params: ViewFetchParams) => Promise<ListResponse<TEntity>>;
  normalize: (raw: TEntity) => { id: EntityId; data: TEntity };
  detailFetch?: (id: EntityId) => Promise<TEntity>;
  onCreate?: (data: Partial<TEntity>) => Promise<TEntity>;
  onUpdate?: (id: EntityId, patch: Partial<TEntity>) => Promise<TEntity>;
  onDelete?: (id: EntityId) => Promise<void>;
  createDefaults?: Partial<TEntity>; initialView?: ViewDescriptor;
  onCreateSuccess?: (entity: TEntity) => void; onUpdateSuccess?: (entity: TEntity) => void;
  onDeleteSuccess?: (id: EntityId) => void; onError?: (op: "create"|"update"|"delete", error: Error) => void;
  selectAfterCreate?: boolean; clearSelectionAfterDelete?: boolean;
}

/** Public field input for CRUD setters: supports classic `keyof T` calls and dotted nested paths for JSON-backed forms. */
export type EntityFieldPath<TEntity extends Record<string, unknown>> = keyof TEntity | string;

/** Tracks which fields diverge from loaded detail — edit buffer stays in React state so other views keep showing canonical graph data until save. */
export interface DirtyFields<TEntity extends Record<string, unknown>> {
  changed: ReadonlySet<EntityFieldPath<TEntity>>;
  isDirty: boolean;
}

/**
 * Everything a CRUD screen needs: composed `list` view, selection, detail subscription, relation joins, edit/create buffers, and mutating actions.
 * `applyOptimistic` is the escape hatch to mirror the buffer into `patches` for instant sliders/toggles without committing `save` yet.
 */
export interface CRUDState<TEntity extends Record<string, unknown>> {
  mode: CRUDMode; setMode: (mode: CRUDMode) => void; list: UseEntityViewResult<TEntity>;
  selectedId: EntityId | null; select: (id: EntityId | null) => void; openDetail: (id: EntityId) => void;
  detail: TEntity | null; detailIsLoading: boolean; detailError: string | null;
  relations: Record<string, unknown>; editBuffer: Partial<TEntity>;
  setField: (field: EntityFieldPath<TEntity>, value: unknown) => void; setFields: (fields: Partial<TEntity>) => void;
  resetBuffer: () => void; dirty: DirtyFields<TEntity>; startEdit: (id?: EntityId) => void; cancelEdit: () => void;
  save: () => Promise<TEntity | null>; isSaving: boolean; saveError: string | null; applyOptimistic: () => void;
  createBuffer: Partial<TEntity>; setCreateField: (field: EntityFieldPath<TEntity>, value: unknown) => void;
  setCreateFields: (fields: Partial<TEntity>) => void; resetCreateBuffer: () => void;
  startCreate: () => void; cancelCreate: () => void; create: () => Promise<TEntity | null>;
  isCreating: boolean; createError: string | null; deleteEntity: (id?: EntityId) => Promise<void>;
  isDeleting: boolean; deleteError: string | null; isEditing: boolean;
}

/**
 * Batteries-included CRUD orchestration over the entity graph: list filtering/sorting, detail fetch, isolated edit buffer, optimistic create row, and transactional save/delete with rollback.
 * Prefer this over ad-hoc `useEntity` wiring when building admin-style tables + side panels + forms for one resource.
 *
 * @param opts - `CRUDOptions` for type, list key/fetch, normalization, lifecycle callbacks
 * @returns `CRUDState` with list/detail/edit/create controls
 */
export function useEntityCRUD<TEntity extends Record<string, unknown>>(opts: CRUDOptions<TEntity>): CRUDState<TEntity> {
  const { type, listQueryKey, listFetch, normalize, detailFetch, onCreate, onUpdate, onDelete, createDefaults = {} as Partial<TEntity>, initialView = {}, selectAfterCreate = true, clearSelectionAfterDelete = true } = opts;
  const optsRef = useRef(opts); optsRef.current = opts;
  const [mode, setMode] = useState<CRUDMode>("list");
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const select = useCallback((id: EntityId | null) => { setSelectedId(id); setMode(id ? "detail" : "list"); }, []);
  const openDetail = useCallback((id: EntityId) => { setSelectedId(id); setMode("detail"); }, []);
  const list = useEntityView<TEntity>({ type, baseQueryKey: listQueryKey, view: initialView, remoteFetch: listFetch, normalize: (raw: TEntity) => normalize(raw) });
  const { data: detail, isLoading: detailIsLoading, error: detailError } = useEntity<TEntity, TEntity>({
    type, id: selectedId,
    fetch: detailFetch ?? ((id) => { const existing = useGraphStore.getState().readEntity<TEntity>(type, id); if (existing) return Promise.resolve(existing); return Promise.reject(new Error("No detailFetch")); }),
    normalize: (raw) => raw, enabled: !!selectedId,
  });
  const relations = useMemo(() => detail ? readRelations(type, detail as Record<string, unknown>) : {}, [type, detail]);
  const [editBuffer, setEditBuffer] = useState<Partial<TEntity>>({});
  const [isSaving, setIsSaving] = useState(false); const [saveError, setSaveError] = useState<string | null>(null);
  useEffect(() => { if (detail) setEditBuffer({ ...detail }); }, [selectedId]); // eslint-disable-line
  const setField = useCallback((field: EntityFieldPath<TEntity>, value: unknown) => setEditBuffer((prev) => setValueAtPath(prev as Record<string, unknown>, String(field), value) as Partial<TEntity>), []);
  const setFields = useCallback((fields: Partial<TEntity>) => setEditBuffer((prev) => ({ ...prev, ...fields })), []);
  const resetBuffer = useCallback(() => { const current = selectedId ? useGraphStore.getState().readEntity<TEntity>(type, selectedId) : null; setEditBuffer(current ? { ...current } : {}); }, [type, selectedId]);
  const dirty = useMemo((): DirtyFields<TEntity> => {
    if (!detail) return { changed: new Set(), isDirty: false };
    const changed = collectDirtyPaths(editBuffer, detail);
    return { changed: changed as ReadonlySet<EntityFieldPath<TEntity>>, isDirty: changed.size > 0 };
  }, [editBuffer, detail]);
  const startEdit = useCallback((id?: EntityId) => { const targetId = id ?? selectedId; if (targetId) { setSelectedId(targetId); const entity = useGraphStore.getState().readEntity<TEntity>(type, targetId); setEditBuffer(entity ? { ...entity } : {}); } setMode("edit"); }, [selectedId, type]);
  const cancelEdit = useCallback(() => { resetBuffer(); setMode(selectedId ? "detail" : "list"); setSaveError(null); }, [resetBuffer, selectedId]);
  const applyOptimistic = useCallback(() => {
    if (!selectedId) return;
    const store = useGraphStore.getState();
    store.patchEntity(type, selectedId, editBuffer as Record<string, unknown>);
    store.setEntitySyncMetadata(type, selectedId, { synced: false, origin: "optimistic", updatedAt: Date.now() });
  }, [type, selectedId, editBuffer]);
  const save = useCallback(async (): Promise<TEntity | null> => {
    if (!selectedId || !onUpdate) return null;
    setIsSaving(true); setSaveError(null);
    const store = useGraphStore.getState();
    const previous = store.readEntity<TEntity>(type, selectedId);
    const previousSync = store.syncMetadata[`${type}:${selectedId}`];
    store.upsertEntity(type, selectedId, editBuffer as Record<string, unknown>);
    store.setEntitySyncMetadata(type, selectedId, { synced: false, origin: "optimistic", updatedAt: Date.now() });
    try {
      const result = await onUpdate(selectedId, editBuffer);
      const { id, data } = normalize(result);
      store.replaceEntity(type, id, data as Record<string, unknown>);
      store.clearPatch(type, id);
      store.setEntitySyncMetadata(type, id, { synced: true, origin: "server", updatedAt: Date.now() });
      cascadeInvalidation({ type, id: selectedId, previous: previous as Record<string, unknown> | null, next: data as Record<string, unknown>, op: "update" });
      setMode("detail"); optsRef.current.onUpdateSuccess?.(result); return result;
    } catch (err) {
      if (previous) store.replaceEntity(type, selectedId, previous as Record<string, unknown>);
      if (previousSync) store.setEntitySyncMetadata(type, selectedId, previousSync);
      else store.clearEntitySyncMetadata(type, selectedId);
      const error = err instanceof Error ? err : new Error(String(err)); setSaveError(error.message); optsRef.current.onError?.("update", error); return null;
    } finally { setIsSaving(false); }
  }, [selectedId, type, editBuffer, normalize]);
  const [createBuffer, setCreateBuffer] = useState<Partial<TEntity>>({ ...createDefaults });
  const [isCreating, setIsCreating] = useState(false); const [createError, setCreateError] = useState<string | null>(null);
  const setCreateField = useCallback((field: EntityFieldPath<TEntity>, value: unknown) => setCreateBuffer((prev) => setValueAtPath(prev as Record<string, unknown>, String(field), value) as Partial<TEntity>), []);
  const setCreateFields = useCallback((fields: Partial<TEntity>) => setCreateBuffer((prev) => ({ ...prev, ...fields })), []);
  const resetCreateBuffer = useCallback(() => setCreateBuffer({ ...(optsRef.current.createDefaults ?? {}) } as Partial<TEntity>), []);
  const startCreate = useCallback(() => { resetCreateBuffer(); setCreateError(null); setMode("create"); }, [resetCreateBuffer]);
  const cancelCreate = useCallback(() => { resetCreateBuffer(); setMode("list"); setCreateError(null); }, [resetCreateBuffer]);
  const create = useCallback(async (): Promise<TEntity | null> => {
    if (!onCreate) return null;
    setIsCreating(true); setCreateError(null);
    const tempId = `__temp__${Date.now()}`;
    const optimisticData = { ...createBuffer, id: tempId, _optimistic: true };
    const store = useGraphStore.getState();
    store.upsertEntity(type, tempId, optimisticData as Record<string, unknown>);
    store.setEntitySyncMetadata(type, tempId, { synced: false, origin: "optimistic", updatedAt: Date.now() });
    store.insertIdInList(serializeKey(listQueryKey), tempId, "start");
    try {
      const result = await onCreate(createBuffer);
      const { id: realId, data } = normalize(result);
      store.removeEntity(type, tempId);
      store.upsertEntity(type, realId, data as Record<string, unknown>);
      store.setEntityFetched(type, realId);
      store.setEntitySyncMetadata(type, realId, { synced: true, origin: "server", updatedAt: Date.now() });
      for (const key of Object.keys(store.lists)) { const list = store.lists[key]; const idx = list.ids.indexOf(tempId); if (idx !== -1) { store.removeIdFromAllLists(type, tempId); store.insertIdInList(key, realId, idx); } }
      cascadeInvalidation({ type, id: realId, previous: null, next: data as Record<string, unknown>, op: "create" });
      if (selectAfterCreate) { setSelectedId(realId); setMode("detail"); } else setMode("list");
      resetCreateBuffer(); optsRef.current.onCreateSuccess?.(result); return result;
    } catch (err) {
      store.removeEntity(type, tempId); store.removeIdFromAllLists(type, tempId);
      const error = err instanceof Error ? err : new Error(String(err)); setCreateError(error.message); optsRef.current.onError?.("create", error); return null;
    } finally { setIsCreating(false); }
  }, [type, createBuffer, normalize, listQueryKey, selectAfterCreate, resetCreateBuffer]);
  const [isDeleting, setIsDeleting] = useState(false); const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteEntity = useCallback(async (id?: EntityId) => {
    const targetId = id ?? selectedId; if (!targetId || !onDelete) return;
    setIsDeleting(true); setDeleteError(null);
    const previous = useGraphStore.getState().readEntity<TEntity>(type, targetId);
    useGraphStore.getState().removeIdFromAllLists(type, targetId);
    try {
      await onDelete(targetId); useGraphStore.getState().removeEntity(type, targetId);
      cascadeInvalidation({ type, id: targetId, previous: previous as Record<string, unknown> | null, next: null, op: "delete" });
      if (clearSelectionAfterDelete && targetId === selectedId) { setSelectedId(null); setMode("list"); }
      optsRef.current.onDeleteSuccess?.(targetId);
    } catch (err) {
      if (previous) { useGraphStore.getState().upsertEntity(type, targetId, previous as Record<string, unknown>); useGraphStore.getState().insertIdInList(serializeKey(listQueryKey), targetId, "end"); }
      const error = err instanceof Error ? err : new Error(String(err)); setDeleteError(error.message); optsRef.current.onError?.("delete", error);
    } finally { setIsDeleting(false); }
  }, [type, selectedId, listQueryKey, clearSelectionAfterDelete]);
  return { mode, setMode, list, selectedId, select, openDetail, detail: detail ?? null, detailIsLoading, detailError: detailError ?? null, relations, editBuffer, setField, setFields, resetBuffer, dirty, startEdit, cancelEdit, save, isSaving, saveError, applyOptimistic, createBuffer, setCreateField, setCreateFields, resetCreateBuffer, startCreate, cancelCreate, create, isCreating, createError, deleteEntity, isDeleting, deleteError, isEditing: mode === "edit" || mode === "create" };
}
