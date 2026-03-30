// ── Core graph ────────────────────────────────────────────────────────────
export { useGraphStore } from "./graph";
export type { GraphState, EntityState, ListState, EntityType, EntityId } from "./graph";

// ── Engine ────────────────────────────────────────────────────────────────
export {
  configureEngine,
  serializeKey,
  fetchEntity,
  fetchList,
  dedupe,
  startGarbageCollector,
  stopGarbageCollector,
} from "./engine";
export type {
  EngineOptions,
  EntityQueryOptions,
  ListQueryOptions,
  ListFetchParams,
  ListResponse,
} from "./engine";

// ── DevTools ─────────────────────────────────────────────────────────────
export { useGraphDevTools } from "./devtools";

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
} from "./view/evaluator";
export {
  toRestParams,
  toSQLClauses,
  toGraphQLVariables,
  toPrismaWhere,
  toPrismaOrderBy,
  flattenClauses,
  hasCustomPredicates,
} from "./view/types";
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
} from "./view/types";
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
} from "./crud/relations";
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
} from "./crud/relations";

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
} from "./adapters/types";

// ── Realtime manager ──────────────────────────────────────────────────────
export {
  RealtimeManager,
  getRealtimeManager,
  resetRealtimeManager,
} from "./adapters/realtime-manager";
export type { ManagerOptions } from "./adapters/realtime-manager";

// ── Realtime adapters ─────────────────────────────────────────────────────
export {
  createWebSocketAdapter,
  createSupabaseRealtimeAdapter,
  createConvexAdapter,
  createGraphQLSubscriptionAdapter,
} from "./adapters/realtime-adapters";
export type {
  WebSocketAdapterOptions,
  SupabaseAdapterOptions,
} from "./adapters/realtime-adapters";

// ── Prisma adapter ────────────────────────────────────────────────────────
export {
  createPrismaEntityConfig,
  prismaRelationsToSchema,
  toPrismaInclude,
} from "./adapters/prisma";
export type { PrismaEntityConfigOptions } from "./adapters/prisma";

// ── Local-first (ElectricSQL + PGlite) ────────────────────────────────────
export {
  createElectricAdapter,
  useLocalFirst,
  usePGliteQuery,
} from "./adapters/electricsql";
export type {
  ElectricAdapterOptions,
  ElectricTableConfig,
  UseLocalFirstResult,
} from "./adapters/electricsql";

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
} from "./table/row-models";
export {
  getFacetedRowModel,
  getFacetedMinMaxValues,
  getFacetedUniqueValues,
} from "./table/faceting";
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
} from "./table/types";

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
