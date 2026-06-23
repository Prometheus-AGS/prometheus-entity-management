// ── 2.0 Typed errors ─────────────────────────────────────────────────────
export { TerminalError, TransientError, toEntityError } from "@prometheus-ags/entity-graph-core";
export type { EntityError, EntityErrorOptions } from "@prometheus-ags/entity-graph-core";

// ── 2.0 Transport registry + types ───────────────────────────────────────
export {
  registerEntityTransport,
  getEntityTransport,
  getRegisteredEntityTypes,
  __resetEntityTransports,
} from "@prometheus-ags/entity-graph-core";
export type {
  EntityTransport,
  ListQuery,
  ListResult,
  ChangeEvent,
  ChangeOp,
} from "@prometheus-ags/entity-graph-core";
export {
  makeRestTransport,
} from "@prometheus-ags/entity-graph-core";
export type {
  MakeRestTransportOptions,
  SupabaseLike,
  SupabaseQueryBuilderLike,
} from "@prometheus-ags/entity-graph-core";

// ── 2.0 Hooks (transport-registry-backed) ────────────────────────────────
export { useEntities } from "./hooks/use-entities";
export type { UseEntitiesOptions, UseEntitiesResult } from "./hooks/use-entities";
export { useEntityQuery } from "./hooks/use-entity-query";
export type {
  UseEntityQueryOptions,
  UseEntityQueryResult,
} from "./hooks/use-entity-query";

// ── 2.0 Merge strategies (pluggable conflict resolution) ─────────────────
export {
  registerMergeStrategy,
  setDefaultMergeStrategy,
  getMergeStrategy,
  hasMergeStrategy,
  lwwStrategy,
  createLoroMergeStrategy,
} from "@prometheus-ags/entity-graph-core";
export type { MergeStrategy, MergeContext } from "@prometheus-ags/entity-graph-core";

// ── 2.0 Agent protocol ingestion (AG-UI → graph) ─────────────────────────
export {
  applyAgUiSnapshot,
  applyAgUiDelta,
  applyJsonPatch,
} from "@prometheus-ags/entity-graph-core";
export type {
  AgUiStateSnapshotEvent,
  AgUiStateDeltaEvent,
  AgUiStateMapping,
  ApplyAgUiOptions,
  JsonPatchOp,
} from "@prometheus-ags/entity-graph-core";

// ── Lint: Component→Hook→Store layering rule (copyable flat-config) ───────
export { prometheusEntityLayeringRule } from "./lint/layering-rule";
export type { LayeringRuleOptions, FlatConfigEntry } from "./lint/layering-rule";

// ── Core graph ────────────────────────────────────────────────────────────
export { useGraphStore } from "@prometheus-ags/entity-graph-core";
export type {
  GraphState,
  EntityState,
  ListState,
  EntityType,
  EntityId,
  EntitySyncMetadata,
  EntitySnapshot,
  QueryKey,
  SyncOrigin,
} from "@prometheus-ags/entity-graph-core";

// ── Graph runtime extensions ──────────────────────────────────────────────
export { queryOnce, selectGraph } from "@prometheus-ags/entity-graph-core";
export type { GraphQueryOptions, GraphIncludeMap, GraphIncludeRelation } from "@prometheus-ags/entity-graph-core";
export { createGraphTransaction, createGraphAction } from "@prometheus-ags/entity-graph-core";
export type { GraphTransaction, GraphActionOptions, GraphActionRecord, GraphActionEvent } from "@prometheus-ags/entity-graph-core";
export { createGraphEffect } from "@prometheus-ags/entity-graph-core";
export type { GraphEffectHandle, GraphEffectOptions, GraphEffectEvent } from "@prometheus-ags/entity-graph-core";
export { createGraphTool, createSchemaGraphTool, exportGraphSnapshot } from "@prometheus-ags/entity-graph-core";
export type { GraphSnapshotExportOptions, GraphToolContext, SchemaGraphToolContext } from "@prometheus-ags/entity-graph-core";

// ── Schema-driven entities and markdown ───────────────────────────────────
export {
  registerEntityJsonSchema,
  registerRuntimeSchema,
  getEntityJsonSchema,
  buildEntityFieldsFromSchema,
  useSchemaEntityFields,
  exportGraphSnapshotWithSchemas,
  MarkdownFieldRenderer,
  MarkdownFieldEditor,
  renderMarkdownToHtml,
} from "./schema";
export type {
  JsonSchemaObject,
  EntityJsonSchemaConfig,
  SchemaFieldDescriptor,
  BuildEntityFieldsFromSchemaOptions,
  GraphSnapshotWithSchemasOptions,
} from "./schema";

// ── Local-first runtime ───────────────────────────────────────────────────
export {
  startLocalFirstGraph,
  hydrateGraphFromStorage,
  persistGraphToStorage,
  useGraphSyncStatus,
  replayActionWithRetry,
} from "@prometheus-ags/entity-graph-core";
export type {
  GraphPersistenceAdapter,
  GraphActionRecord as PersistedGraphActionRecord,
  GraphSyncStatus,
  GraphSnapshotPayload,
  StartLocalFirstGraphOptions,
  LocalFirstGraphRuntime,
  ReplayRetryPolicy,
} from "@prometheus-ags/entity-graph-core";

// ── Engine ────────────────────────────────────────────────────────────────
export {
  configureEngine,
  serializeKey,
  fetchEntity,
  fetchList,
  dedupe,
  startGarbageCollector,
  stopGarbageCollector,
} from "@prometheus-ags/entity-graph-core";
export type {
  EngineOptions,
  EntityQueryOptions,
  ListQueryOptions,
  ListFetchParams,
  ListResponse,
} from "@prometheus-ags/entity-graph-core";

// ── DevTools ─────────────────────────────────────────────────────────────
export { useGraphDevTools } from "./devtools";
export { subscribeDevtoolsEvent } from "@prometheus-ags/entity-graph-core";
export type { DevtoolsEvent } from "@prometheus-ags/entity-graph-core";
export { createDevtoolsEventBus, registerStore, getRegisteredStores } from "@prometheus-ags/entity-graph-core";
export type { DevtoolsEventBusOptions, DevtoolsEventBus, DevtoolsSourceFn, RegisteredStore } from "@prometheus-ags/entity-graph-core";
export { EntityExplorerFAB, EntityExplorerPanel, EntityExplorerProvider } from "./ui/entity-explorer";

// ── True time-travel (rewind/replay the live graph) ──────────────────────
export {
  recordGraphSnapshot,
  restoreGraphSnapshot,
  restoreGraphSnapshotBySeq,
  stepTimeTravel,
  getTimeTravelState,
  subscribeTimeTravel,
  configureTimeTravel,
} from "@prometheus-ags/entity-graph-core";
export type { TimeTravelSnapshot, TimeTravelState } from "@prometheus-ags/entity-graph-core";

// ── Hooks (REST) ──────────────────────────────────────────────────────────
export {
  useEntity,
  useEntityList,
  useEntityMutation,
  useEntityAugment,
  useSuspenseEntity,
  useSuspenseEntityList,
} from "./hooks";

// ── View ──────────────────────────────────────────────────────────────────
export { useEntityView } from "./view/use-entity-view";
export {
  applyView,
  compareEntities,
  matchesFilter,
  matchesSearch,
  checkCompleteness,
} from "@prometheus-ags/entity-graph-core";
export { IncrementalView } from "@prometheus-ags/entity-graph-core";
export type { IncrementalViewOptions } from "@prometheus-ags/entity-graph-core";
export {
  toRestParams,
  toSQLClauses,
  toGraphQLVariables,
  toPrismaWhere,
  toPrismaOrderBy,
  flattenClauses,
  hasCustomPredicates,
} from "@prometheus-ags/entity-graph-core";
export type {
  ViewDescriptor,
  FilterSpec,
  FilterGroup,
  FilterClause,
  FilterOperator,
  SortSpec,
  SortClause,
  SortDirection,
  CompletenessMode,
} from "@prometheus-ags/entity-graph-core";
export type {
  UseEntityViewResult,
  UseEntityViewOptions,
  ViewFetchParams,
} from "./view/use-entity-view";

// ── CRUD ──────────────────────────────────────────────────────────────────
export { useEntityCRUD } from "./crud/use-entity-crud";
export {
  registerSchema,
  getSchema,
  cascadeInvalidation,
  readRelations,
} from "@prometheus-ags/entity-graph-core";
export type {
  CRUDOptions,
  CRUDState,
  CRUDMode,
  DirtyFields,
} from "./crud/use-entity-crud";
export type {
  EntitySchema,
  RelationDescriptor,
  BelongsToRelation,
  HasManyRelation,
  ManyToManyRelation,
  CascadeContext,
} from "@prometheus-ags/entity-graph-core";

// ── Adapter types ─────────────────────────────────────────────────────────
export type {
  RealtimeAdapter,
  SyncAdapter,
  ChangeSet,
  EntityChange,
  ChangeOperation,
  ChannelConfig,
  AdapterStatus,
  UnsubscribeFn,
  SubscriptionConfig,
} from "@prometheus-ags/entity-graph-core";

// ── Realtime manager ──────────────────────────────────────────────────────
export {
  RealtimeManager,
  getRealtimeManager,
  resetRealtimeManager,
} from "@prometheus-ags/entity-graph-core";
export type { ManagerOptions } from "@prometheus-ags/entity-graph-core";

// ── Realtime adapters ─────────────────────────────────────────────────────
export {
  createWebSocketAdapter,
  createSupabaseRealtimeAdapter,
  createConvexAdapter,
  createGraphQLSubscriptionAdapter,
} from "@prometheus-ags/entity-graph-core";
export type {
  WebSocketAdapterOptions,
  SupabaseAdapterOptions,
} from "@prometheus-ags/entity-graph-core";

// ── Prisma adapter ────────────────────────────────────────────────────────
export {
  createPrismaEntityConfig,
  prismaRelationsToSchema,
  toPrismaInclude,
} from "./adapters/prisma";
export type { PrismaEntityConfigOptions } from "./adapters/prisma";

// ── Local-first (ElectricSQL + PGlite) ────────────────────────────────────
export { createElectricAdapter } from "@prometheus-ags/entity-graph-core";
export type {
  ElectricAdapterOptions,
  ElectricTableConfig,
} from "@prometheus-ags/entity-graph-core";
export { useLocalFirst, usePGliteQuery } from "./adapters/electricsql-react";
export type { UseLocalFirstResult } from "./adapters/electricsql-react";

// ── Flint Realtime Fabric adapter (v2.0) ──────────────────────────────────
export {
  createFlintAdapter,
  publishFlintMutation,
} from "@prometheus-ags/entity-graph-core";
export type {
  FlintClientLike,
  FlintEntityEvent,
  FlintEntityQuery,
  FlintEntityRecord,
  FlintCheckpointStore,
  CreateFlintAdapterOptions,
} from "@prometheus-ags/entity-graph-core";

// ── Surreal live (realtime) ───────────────────────────────────────────────
export { createSurrealLiveAdapter } from "@prometheus-ags/entity-graph-core";
export type {
  SurrealLike,
  SurrealLiveAction,
  SurrealCheckpointStore,
  SurrealTableConfig,
  SurrealLiveAdapterOptions,
} from "@prometheus-ags/entity-graph-core";

// ── Tenant-scoped Electric adapter (v1.3) ─────────────────────────────────
export {
  createTenantScopedElectricAdapter,
  buildTenantWhere,
} from "@prometheus-ags/entity-graph-core";
export type {
  TenantClaim,
  TenantScopedAdapterOptions,
  TenantScopedTableConfig,
} from "@prometheus-ags/entity-graph-core";

// ── PGlite persistence adapter (v1.3) ─────────────────────────────────────
export {
  createPGlitePersistenceAdapter,
} from "@prometheus-ags/entity-graph-core";
export type {
  PGlitePersistenceClient,
  CreatePGlitePersistenceAdapterOptions,
} from "@prometheus-ags/entity-graph-core";

// ── Tauri SQLite persistence adapter (v2.0) ───────────────────────────────
export {
  createTauriSqlPersistenceAdapter,
} from "@prometheus-ags/entity-graph-core";
export type {
  TauriSqlClient,
  CreateTauriSqlPersistenceAdapterOptions,
} from "@prometheus-ags/entity-graph-core";

// ── Schema generation from SQL (v1.3) ─────────────────────────────────────
export {
  registerEntityFromSql,
  parseCreateTable,
  sqlTypeToJsonSchema,
} from "@prometheus-ags/entity-graph-core";
export type {
  RegisterEntityFromSqlOptions,
} from "@prometheus-ags/entity-graph-core";

// ── TanStack-Table adapter helper (v1.3) ──────────────────────────────────
export {
  useEntityListAsTable,
} from "./table/use-entity-list-as-table";
export type {
  UseEntityListAsTableOptions,
  UseEntityListAsTableResult,
} from "./table/use-entity-list-as-table";

// ── GraphQL ───────────────────────────────────────────────────────────────
export {
  createGQLClient,
  GQLClient,
  normalizeGQLResponse,
  executeGQL,
} from "./graphql/client";
export type {
  GQLClientConfig,
  GQLError,
  GQLResponse,
  EntityDescriptor,
} from "./graphql/client";
export {
  useGQLEntity,
  useGQLList,
  useGQLMutation,
  useGQLSubscription,
} from "./graphql/hooks";
export type {
  GQLEntityOptions,
  GQLListOptions,
} from "./graphql/hooks";

// ── UI components (existing TanStack-based — unchanged) ──────────────────
export { EntityTable, InlineCellEditor } from "./ui/entity-table";
export { EntityDetailSheet, EntityFormSheet, Sheet } from "./ui/entity-sheets";
export {
  selectionColumn,
  textColumn,
  numberColumn,
  dateColumn,
  enumColumn,
  booleanColumn,
  actionsColumn,
  SortHeader,
} from "./ui/columns";
export type {
  EntityColumnMeta,
  ColumnFilterType,
  ActionItem,
} from "./ui/columns";
export type {
  FieldDescriptor,
  FieldType,
} from "./ui/entity-sheets";

// ── Pure table engine ────────────────────────────────────────────────────
export { useTable } from "./table/use-table";
export {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getPaginatedRowModel,
  getSelectedRowModel,
  createRow,
} from "@prometheus-ags/entity-graph-core";
export {
  getFacetedRowModel,
  getFacetedMinMaxValues,
  getFacetedUniqueValues,
} from "@prometheus-ags/entity-graph-core";
export {
  createSelectionStore,
  useSelectionStore,
  SelectionContext,
  useSelectionContext,
} from "./table/selection-store";
export type { SelectionStoreState } from "./table/selection-store";
export type {
  ColumnDef as PureColumnDef,
  TableState,
  TableOptions,
  TableInstance,
  Row,
  Cell,
  Column,
  Header,
  HeaderGroup,
  RowModel,
  ViewMode,
  ActionDef,
  ItemDescriptor,
  ItemRenderContext,
  EmptyStateConfig,
  BatchActionDef,
  GalleryColumns,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  ColumnVisibilityState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ExpandedState,
  GroupingState,
  PaginationState,
  ColumnMeta as PureColumnMeta,
  Updater,
  FilterFn,
  SortingFn,
  AggregationFn,
  CellContext,
  HeaderContext,
  CellRenderer,
  HeaderRenderer,
  AccessorFn,
  ItemDescriptorBadge,
  ItemDescriptorMeta,
} from "@prometheus-ags/entity-graph-core";

// ── Preset system ────────────────────────────────────────────────────────
export type {
  FilterPreset,
  ColumnPreset,
  ColumnPresetEntry,
  PresetChangeEvent,
  PresetChangeOperation,
  ActivePresets,
  UnsubscribeFn as PresetUnsubscribeFn,
} from "./table/presets/types";
export type { TableStorageAdapter } from "./table/presets/storage";
export { createPresetStore } from "./table/presets/preset-store";
export type { PresetStoreState, TablePresetSlice } from "./table/presets/preset-store";
export { MemoryAdapter } from "./table/presets/memory-adapter";
export { ZustandPersistAdapter } from "./table/presets/zustand-adapter";
export type { ZustandAdapterOptions } from "./table/presets/zustand-adapter";
export { RestApiAdapter } from "./table/presets/rest-adapter";
export type { RestAdapterOptions } from "./table/presets/rest-adapter";
export { SupabaseRealtimeAdapter as SupabasePresetAdapter } from "./table/presets/supabase-adapter";
export type { SupabaseAdapterOptions as SupabasePresetAdapterOptions } from "./table/presets/supabase-adapter";
export { ElectricSQLAdapter as ElectricSQLPresetAdapter } from "./table/presets/electricsql-adapter";
export type { ElectricSQLAdapterOptions as ElectricSQLPresetAdapterOptions } from "./table/presets/electricsql-adapter";
export { useTablePresets } from "./table/presets/use-table-presets";
export type { UseTablePresetsOptions, UseTablePresetsResult } from "./table/presets/use-table-presets";
export {
  TableStorageProvider,
  useTableStorageAdapter,
  useTableRealtimeMode,
} from "./table/presets/table-storage-provider";
export type { TableStorageProviderProps } from "./table/presets/table-storage-provider";

// ── Pure UI components (multi-view, TanStack-free) ───────────────────────
export { EntityListView } from "./ui/entity-list-view";
export type { EntityListViewProps } from "./ui/entity-list-view";
export { DataTable } from "./ui/data-table";
export { GalleryView } from "./ui/gallery-view";
export { ListView } from "./ui/list-view";
export { ViewModeSwitcher } from "./ui/view-mode-switcher";
export { DataTableToolbar } from "./ui/data-table-toolbar";
export { DataTablePagination } from "./ui/data-table-pagination";
export { DataTableColumnHeader } from "./ui/data-table-column-header";
export { DataTableFilter } from "./ui/data-table-filter";
export {
  ActionDropdown,
  ActionButtonRow,
  viewAction,
  editAction,
  deleteAction,
} from "./ui/action-column";
export {
  InlineCellEditor as PureInlineCellEditor,
  InlineItemEditor,
} from "./ui/inline-editor";
export { MultiSelectBar } from "./ui/multi-select-bar";
export { EmptyState } from "./ui/empty-state";
export { FilterPresetDialog } from "./ui/filter-preset-dialog";
export { ColumnPresetDialog } from "./ui/column-preset-dialog";
export { PresetPicker } from "./ui/preset-picker";
export {
  selectionColumn as pureSelectionColumn,
  textColumn as pureTextColumn,
  numberColumn as pureNumberColumn,
  dateColumn as pureDateColumn,
  booleanColumn as pureBooleanColumn,
  enumColumn as pureEnumColumn,
  actionsColumn as pureActionsColumn,
} from "./ui/pure-columns";
export {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
  TableCaption,
} from "./ui/table-primitives";
