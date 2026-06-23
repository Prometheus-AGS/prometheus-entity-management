/**
 * @prometheus-ags/entity-graph-core
 *
 * Framework-agnostic normalized entity graph. Zero React. This is the shared
 * foundation every framework binding (react, svelte, solid, lit, alpine) and
 * every native target (Tauri, Flutter) builds on.
 *
 * Layering: this package owns Layer 0 (adapters) + Layer 1 (the graph, engine,
 * transport, merge, view computation, CRUD relations, local-first runtime,
 * agent ingestion). Framework hooks/components live in the binding packages.
 */

// ── Typed errors ──────────────────────────────────────────────────────────
export { TerminalError, TransientError, toEntityError } from "./errors";
export type { EntityError, EntityErrorOptions } from "./errors";

// ── Transport registry + types ────────────────────────────────────────────
export {
  registerEntityTransport,
  getEntityTransport,
  getRegisteredEntityTypes,
  __resetEntityTransports,
} from "./transport/registry";
export type {
  EntityTransport, ListQuery, ListResult, ChangeEvent, ChangeOp,
} from "./transport/types";
export { makeRestTransport } from "./transport/rest";
export type {
  MakeRestTransportOptions, SupabaseLike, SupabaseQueryBuilderLike,
} from "./transport/rest";

// ── Core graph store ──────────────────────────────────────────────────────
export { useGraphStore, EMPTY_IDS, EMPTY_ENTITY_STATE, EMPTY_SYNC_METADATA, EMPTY_LIST_STATE } from "./graph";
export type {
  GraphState, EntityState, ListState, EntityType, EntityId,
  EntitySyncMetadata, EntitySnapshot, QueryKey, SyncOrigin,
} from "./graph";

// ── Object-path utilities (shared by schema + UI field rendering) ─────────
export { getValueAtPath, setValueAtPath, collectDirtyPaths } from "./object-path";

// ── Merge strategies (pluggable conflict resolution) ──────────────────────
export {
  registerMergeStrategy, setDefaultMergeStrategy, getMergeStrategy,
  hasMergeStrategy, lwwStrategy, createLoroMergeStrategy,
} from "./merge";
export type { MergeStrategy, MergeContext } from "./merge";

// ── Graph runtime extensions ──────────────────────────────────────────────
export { queryOnce, selectGraph } from "./graph-query";
export type { GraphQueryOptions, GraphIncludeMap, GraphIncludeRelation } from "./graph-query";
export { createGraphTransaction, createGraphAction } from "./graph-actions";
export type { GraphTransaction, GraphActionOptions, GraphActionRecord, GraphActionEvent } from "./graph-actions";
export { createGraphEffect } from "./graph-effects";
export type { GraphEffectHandle, GraphEffectOptions, GraphEffectEvent } from "./graph-effects";
export { createGraphTool, createSchemaGraphTool, exportGraphSnapshot } from "./ai-interop";
export type { GraphSnapshotExportOptions, GraphToolContext, SchemaGraphToolContext } from "./ai-interop";

// ── Local-first runtime ───────────────────────────────────────────────────
export {
  startLocalFirstGraph, hydrateGraphFromStorage, persistGraphToStorage, replayActionWithRetry, useGraphSyncStatus,
} from "./local-first-runtime";
export type {
  GraphPersistenceAdapter, GraphSyncStatus, GraphSnapshotPayload,
  StartLocalFirstGraphOptions, LocalFirstGraphRuntime, ReplayRetryPolicy,
} from "./local-first-runtime";

// ── Engine ────────────────────────────────────────────────────────────────
export {
  configureEngine, getEngineOptions, serializeKey, fetchEntity, fetchList, dedupe,
  startGarbageCollector, stopGarbageCollector, subscribeDevtoolsEvent,
  registerSubscriber, unregisterSubscriber, subscribeSubscriberStats,
  getActiveSubscriberCount, attachGlobalListeners,
} from "./engine";
export type {
  EngineOptions, EntityQueryOptions, ListQueryOptions, ListFetchParams,
  ListResponse, DevtoolsEvent,
} from "./engine";

// ── DevTools event bus + time-travel (framework-agnostic) ─────────────────
export { createDevtoolsEventBus, registerStore, getRegisteredStores, __resetStoreRegistry } from "./devtools-event-bus";
export type { DevtoolsEventBusOptions, DevtoolsEventBus, DevtoolsSourceFn, RegisteredStore } from "./devtools-event-bus";
export {
  recordGraphSnapshot, restoreGraphSnapshot, restoreGraphSnapshotBySeq,
  stepTimeTravel, getTimeTravelState, subscribeTimeTravel, configureTimeTravel,
} from "./devtools-time-travel";
export type { TimeTravelSnapshot, TimeTravelState } from "./devtools-time-travel";

// ── View (computation: filter/sort/incremental — no hooks) ────────────────
export {
  applyView, compareEntities, matchesFilter, matchesSearch, checkCompleteness, findInsertionIndex,
} from "./view/evaluator";
export { IncrementalView } from "./view/incremental";
export type { IncrementalViewOptions } from "./view/incremental";
export {
  toRestParams, toSQLClauses, toGraphQLVariables, toPrismaWhere, toPrismaOrderBy,
  flattenClauses, hasCustomPredicates,
} from "./view/types";
export type {
  ViewDescriptor, FilterSpec, FilterGroup, FilterClause, FilterOperator,
  SortSpec, SortClause, SortDirection, CompletenessMode,
} from "./view/types";

// ── CRUD relations (schema registry + cascade — no hooks) ─────────────────
export { registerSchema, getSchema, cascadeInvalidation, readRelations } from "./crud/relations";
export type {
  EntitySchema, RelationDescriptor, BelongsToRelation, HasManyRelation,
  ManyToManyRelation, CascadeContext,
} from "./crud/relations";

// ── Agent protocol ingestion (AG-UI → graph) ──────────────────────────────
export { applyAgUiSnapshot, applyAgUiDelta, applyJsonPatch } from "./agent";
export type {
  AgUiStateSnapshotEvent, AgUiStateDeltaEvent, AgUiStateMapping, ApplyAgUiOptions, JsonPatchOp,
} from "./agent";

// ── Adapter types + realtime manager + adapters (framework-agnostic) ──────
export type {
  RealtimeAdapter, SyncAdapter, ChangeSet, EntityChange, ChangeOperation,
  ChannelConfig, AdapterStatus, UnsubscribeFn, SubscriptionConfig,
} from "./adapters/types";
export { RealtimeManager, getRealtimeManager, resetRealtimeManager } from "./adapters/realtime-manager";
export type { ManagerOptions } from "./adapters/realtime-manager";
export {
  createWebSocketAdapter, createSupabaseRealtimeAdapter, createConvexAdapter, createGraphQLSubscriptionAdapter,
} from "./adapters/realtime-adapters";
export type { WebSocketAdapterOptions, SupabaseAdapterOptions } from "./adapters/realtime-adapters";
export { createSurrealLiveAdapter } from "./adapters/surreal-live";
export type {
  SurrealLike, SurrealLiveAction, SurrealCheckpointStore, SurrealTableConfig, SurrealLiveAdapterOptions,
} from "./adapters/surreal-live";
export { createFlintAdapter, publishFlintMutation } from "./adapters/flint";
export type {
  FlintClientLike, FlintEntityEvent, FlintEntityQuery, FlintEntityRecord,
  FlintCheckpointStore, CreateFlintAdapterOptions,
} from "./adapters/flint";
export { createElectricAdapter, getRealtimeManager as getElectricRealtimeManager } from "./adapters/electricsql";
export type { ElectricAdapterOptions, ElectricTableConfig } from "./adapters/electricsql";
export { createTenantScopedElectricAdapter, buildTenantWhere } from "./adapters/electricsql-tenant";
export type { TenantClaim, TenantScopedAdapterOptions, TenantScopedTableConfig } from "./adapters/electricsql-tenant";
export { createPGlitePersistenceAdapter } from "./adapters/pglite-persistence";
export type { PGlitePersistenceClient, CreatePGlitePersistenceAdapterOptions } from "./adapters/pglite-persistence";
export { createTauriSqlPersistenceAdapter } from "./adapters/tauri-sql-persistence";
export type { TauriSqlClient, CreateTauriSqlPersistenceAdapterOptions } from "./adapters/tauri-sql-persistence";

// ── Schema registry (JSON-schema; framework-agnostic) ─────────────────────
export {
  registerEntityJsonSchema, registerRuntimeSchema, getEntityJsonSchema,
  exportGraphSnapshotWithSchemas, escapeHtml, renderMarkdownToHtml,
  inferSchemaFieldType, registryKey, humanizeFieldName,
} from "./schema";
export type {
  JsonSchemaObject, EntityJsonSchemaConfig, GetEntityJsonSchemaOptions, GraphSnapshotWithSchemasOptions,
} from "./schema";

// ── Schema generation from SQL ────────────────────────────────────────────
export { registerEntityFromSql, parseCreateTable, sqlTypeToJsonSchema } from "./schema-from-sql";
export type { RegisterEntityFromSqlOptions } from "./schema-from-sql";

// ── Table computation (engine + row models — no React) ────────────────────
export {
  getCoreRowModel, getFilteredRowModel, getSortedRowModel, getGroupedRowModel,
  getExpandedRowModel, getPaginatedRowModel, getSelectedRowModel, createRow,
} from "./table/row-models";
export { getFacetedRowModel, getFacetedMinMaxValues, getFacetedUniqueValues } from "./table/faceting";
export type {
  ColumnDef, ColumnDef as PureColumnDef, TableState, TableOptions, TableInstance, Row, Cell, Column,
  Header, HeaderGroup, RowModel, ViewMode, ActionDef, ItemDescriptor, ItemRenderContext,
  EmptyStateConfig, BatchActionDef, GalleryColumns, SortingState, ColumnFiltersState,
  RowSelectionState, ColumnVisibilityState, ColumnOrderState, ColumnPinningState,
  ColumnSizingState, ColumnSizingInfoState, ExpandedState, GroupingState, PaginationState,
  ColumnMeta, ColumnMeta as PureColumnMeta,
  Updater, FilterFn, SortingFn, AggregationFn, CellContext, HeaderContext, CellRenderer,
  HeaderRenderer, AccessorFn, ItemDescriptorBadge, ItemDescriptorMeta,
} from "./table/types";
